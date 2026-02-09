# TODOコメント追跡CLIツール - 技術設計文書

## 概要

TODOコメント追跡CLIツールは、コードベース内のTODO/FIXME/NOTEなどのコメントを自動的に検出・追跡・分析するためのコマンドラインツールである。このツールは開発チームが技術的負債を可視化し、タスクの進捗を管理することを目的とする。

**対象ユーザー**: 開発チーム、プロジェクトマネージャー、コードレビュー担当者

**配布形態**: npmパッケージ + Homebrewフォーミュラ（クロスプラットフォーム対応）

---

## 1. 言語とフレームワーク選択

### 1.1 技術スタック決定の根拠

**選択**: **Node.js + TypeScript**

#### 選択理由:

1. **エコシステムの整合性**
   - 既存のULTプロジェクトはTypeScript/Node.jsベース
   - 同じツールチェーン（tsc、jest、eslint）を再利用可能
   - 開発チームの既存知識を活用

2. **AST処理ライブラリの豊富さ**
   - TypeScript Compiler API: 最も正確なパーシング
   - Babel: JavaScript/TypeScriptの包括的サポート
   - jscodeshift: 大規模コードベースでの実績
   - tree-sitter: 25+言語対応、パフォーマンス優秀

3. **CLIフレームワーク**
   - Commander.js / Oclif: 実績あるCLIフレームワーク
   - Inquirer: インタラクティブなCLI体験
   - Chalk / Ora: カラフルな出力とスピナー

4. **配布の容易さ**
   - npmパッケージ: 最大の配布網
   - Homebrew: macOSユーザーに親和性
   - バイナリ（pkg/esbuild）: 依存関係なし実行可能

5. **パフォーマンス**
   - Node.js: 非同期I/Oに最適化
   - V8エンジン: 高速な文字列処理・正規表現
   - マルチスレッディング: `worker_threads`で並列パーシング

### 1.2 依存関係の戦略

**軽量化アプローチ**:
- **ツリーシェイキング**: Rollup/esbuildで必要なモジュールのみバンドル
- **動的インポート**: 重いASTパーサーが必要時のみロード
- **オプショナル依存**: 言語別パーサーをプラグインとして分離

```json
{
  "dependencies": {
    "commander": "^12.0.0",          // CLI フレームワーク
    "chalk": "^5.3.0",              // カラー出力
    "fast-glob": "^3.3.2",          // 高速ファイル列挙
    "node-worker-threads-pool": "^4.0.0"  // 並列処理
  },
  "optionalDependencies": {
    "typescript": "^6.0.0",          // TS パーサー（オプション）
    "@babel/parser": "^8.0.0",      // Babel パーサー
    "tree-sitter": "^0.21.0",       // 多言語パーサー
    "prettier": "^3.0.0"            // フォーマッタ連携
  }
}
```

---

## 2. TODO検出アルゴリズム

### 2.1 アプローチ比較

| アプローチ | 精度 | 速度 | 言語サポート | 実装コスト |
|-----------|------|------|-------------|-----------|
| **正規表現** | 低 | 高 | 無制限 | 低 |
| **ASTパーシング** | 高 | 中 | 言語依存 | 高 |
| **tree-sitter** | 高 | 高 | 25+言語 | 中 |

### 2.2 推奨戦略: **ハイブリッドアプローチ**

#### 第1層: 正規表現（クイックスキャン）
```typescript
// 軽量な事前フィルタリング
const QUICK_PATTERNS = {
  'typescript': /\/\/\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'python': /#\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'markdown': /<!--\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)-->/g,
  'html': /<!--\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)-->/g,
  'shell': /#\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'go': /\/\/\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'rust': /\/\/\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'java': /\/\/\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'c': /\/\/\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g,
  'sql': /--\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)/g
};
```

#### 第2層: ASTパーシング（精度保証）
候補ファイルのみを深くパースし、以下を検証：
- コメントがコード内の文脈で有効か（class/method/function内）
- トークン位置の正確性
- 複数行コメントの handling

```typescript
interface Parser {
  readonly name: string;
  readonly extensions: string[];
  parse(file: File): TodoComment[];
}

class TypescriptParser implements Parser {
  name = 'typescript';
  extensions = ['.ts', '.tsx', '.js', '.jsx'];

  async parse(file: File): Promise<TodoComment[]> {
    const source = await fs.readFile(file.path, 'utf-8');
    const ts = require('typescript');

    const sourceFile = ts.createSourceFile(
      file.path,
      source,
      ts.ScriptTarget.Latest,
      true
    );

    const todos: TodoComment[] = [];

    function visit(node: ts.Node) {
      if (ts.isCommentKind(node.kind)) {
        const text = node.getFullText();
        const match = text.match(TODO_REGEX);
        if (match) {
          todos.push({
            file: file.path,
            line: node.getLineAndCharacter().line + 1,
            column: node.getLineAndCharacter().character + 1,
            text: match[2]?.trim() || '',
            tag: match[1],
            context: getEnclosingContext(sourceFile, node) // class/method名
          });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return todos;
  }
}
```

### 2.3 複数行コメントハンドリング

```typescript
// 複数行コメントの連結処理
function processMultiLineComment(comment: string): string[] {
  const lines = comment.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const todos: string[] = [];
  let currentTodo = '';

  for (const line of lines) {
    const match = line.match(/^[*#xX]?\s*(TODO|FIXME|NOTE|HACK|XXX):?\s*(.*)$/i);
    if (match) {
      if (currentTodo) {
        todos.push(currentTodo);
      }
      currentTodo = match[2]?.trim() || '';
    } else if (currentTodo) {
      // 継続行として追加
      currentTodo += ' ' + line.replace(/^[*#xX]\s*/, '');
    }
  }

  if (currentTodo) {
    todos.push(currentTodo);
  }

  return todos;
}
```

### 2.4 言語自動検出

```typescript
const LANGUAGE_MAP = new Map([
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.py', 'python'],
  ['.go', 'go'],
  ['.rs', 'rust'],
  ['.java', 'java'],
  ['.c', 'c'],
  ['.cpp', 'cpp'],
  ['.h', 'c'],
  ['.sql', 'sql'],
  ['.rb', 'ruby'],
  ['.php', 'php'],
  ['.swift', 'swift'],
  ['.kt', 'kotlin'],
  ['.md', 'markdown'],
  ['.html', 'html'],
  ['.css', 'css'],
  ['.scss', 'scss'],
  ['.vue', 'vue'],
  ['.svelte', 'svelte']
]);

function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP.get(ext) || null;
}
```

---

## 3. アーキテクチャ設計

### 3.1 レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIレイヤー                         │
│  (コマンドパーシング、引数処理、ユーザーインターフェース)    │
├─────────────────────────────────────────────────────────────┤
│                     サービスレイヤー                       │
│  (TodoAnalyzer, ReportGenerator, Aggregator, Exporter)    │
├─────────────────────────────────────────────────────────────┤
│                     パーサーレイヤー                       │
│  (LanguageDetector, ParserFactory, ASTParsers)           │
├───────────────────────────────────────────────┬───────────┤
│               ストレージレイヤー                  │ キャッシュ  │
│  (FileSystemStorage, SqliteStorage)             │ レイヤー   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 主要コンポーネント

#### CLIレイヤー (`src/cli/`)
```typescript
// src/cli/index.ts
import { Command } from 'commander';
import { scan } from '../services/todo-analyzer';
import { generateReport } from '../services/report-generator';

const program = new Command();

program
  .name('todo-tracker')
  .description('TODOコメント追跡CLIツール')
  .version('1.0.0');

program
  .command('scan')
  .description('コードベースをスキャンしてTODOを検出')
  .option('-p, --path <path>', 'スキャン対象ディレクトリ', '.')
  .option('-e, --exclude <patterns>', '除外パターン（カンマ区切り）', 'node_modules,dist,build')
  .option('-t, --tags <tags>', '検出対象タグ（カンマ区切り）', 'TODO,FIXME,NOTE,HACK,XXX')
  .option('-j, --json', 'JSON形式で出力')
  .option('--csv <file>', 'CSV形式でファイル出力')
  .option('--format <format>', '出力形式（table,json,csv,markdown）', 'table')
  .option('--assignee <assignee>', '担当者でフィルタ')
  .option('--since <date>', '日付以降のTODOのみ（YYYY-MM-DD）')
  .option('--priority <level>', '優先度でフィルタ（low,medium,high）')
  .option('--watch', 'ファイル変更を監視')
  .action(async (options) => {
    const todos = await scan(options);
    const output = generateReport(todos, options);
    console.log(output);
  });

program
  .command('stats')
  .description('TODO統計情報を表示')
  .option('--group-by <field>', 'グループ化（file,tag,assignee,context）', 'file')
  .action(async (options) => {
    const stats = await generateStats(options);
    console.log(stats);
  });

program
  .command('config')
  .description('設定管理')
  .subcommand(new ConfigureCommand());

program.parse();
```

#### パーサーレイヤー (`src/parser/`)

```typescript
// src/parser/parser.interface.ts
export interface TodoComment {
  id: string;                    // ユニークID（file:line:column ハッシュ）
  file: string;                  // ファイルパス（相対）
  line: number;                  // 行番号（1-indexed）
  column: number;                // カラム位置（0-indexed）
  text: string;                  // TODOメッセージ本文
  tag: string;                   // TODO/FIXME/NOTE等
  context?: string;              // 囲んでいる関数/クラス名
  language: string;              // 言語識別子
  rawComment: string;            // 原始コメントtexs
  createdAt?: Date;              // 検出日時
  // 拡張可能なメタデータ
  metadata: Record<string, any>; // assignee, deadline, priority, issue 等
}

export interface Parser {
  readonly name: string;
  readonly extensions: string[];
  parse(content: string, filePath: string): TodoComment[];
  canParse(filePath: string): boolean;
}

export interface ParserFactory {
  createParser(language: string): Parser | null;
  supportedLanguages(): string[];
}
```

**ASTパーサー実装例**:
```typescript
// src/parser/ast-parsers/typescript-parser.ts
import { Parser } from './parser.interface';
import * as ts from 'typescript';

export class TypescriptParser implements Parser {
  name = 'typescript';
  extensions = ['.ts', '.tsx', '.js', '.jsx'];

  canParse(filePath: string): boolean {
    return this.extensions.includes(path.extname(filePath).toLowerCase());
  }

  parse(content: string, filePath: string): TodoComment[] {
    const todos: TodoComment[] = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visitor = (node: ts.Node) => {
      if (ts.isCommentKind(node.kind)) {
        const fullText = node.getFullText();
        const matches = fullText.matchAll(/(TODO|FIXME|NOTE|HACK|XXX):?\s*(.+)/gi);

        for (const match of matches) {
          const { line, character } = node.getLineAndCharacter();
          const context = this.getEnclosingContext(sourceFile, node);

          todos.push({
            id: this.generateId(filePath, line, character),
            file: path.relative(process.cwd(), filePath),
            line: line + 1,
            column: character + 1,
            text: match[2]?.trim() || '',
            tag: match[1],
            context,
            language: this.name,
            rawComment: fullText,
            createdAt: new Date(),
            metadata: {}
          });
        }
      }
      ts.forEachChild(node, visitor);
    };

    visitor(sourceFile);
    return todos;
  }

  private getEnclosingContext(sourceFile: ts.SourceFile, node: ts.Node): string {
    let current = node.parent;
    while (current && !ts.isFunctionLike(current) && !ts.isClassLike(current)) {
      current = current.parent;
    }
    return current?.getFullText().split('\n')[0].trim() || 'global';
  }

  private generateId(file: string, line: number, col: number): string {
    return `${file}:${line}:${col}`;
  }
}
```

#### サービスレイヤー (`src/services/`)

```typescript
// src/services/todo-analyzer.ts
import { ParserFactory } from '../parser/parser.interface';
import { FileSystemStorage } from '../storage/file-system-storage';
import { ParallelProcessor } from '../utils/parallel-processor';

export class TodoAnalyzer {
  constructor(
    private parserFactory: ParserFactory,
    private storage: FileSystemStorage,
    private parallelProcessor: ParallelProcessor
  ) {}

  async scan(options: ScanOptions): Promise<TodoComment[]> {
    const { path: rootPath, exclude, extensions } = options;

    // 1. ファイル列挙（高速かつ除外パターン適用）
    const files = await this.findFiles(rootPath, exclude, extensions);

    // 2. 並列パーシング
    const todos = await this.parallelProcessor.process(
      files,
      async (file) => {
        const content = await fs.readFile(file, 'utf-8');
        const language = detectLanguage(file);
        const parser = this.parserFactory.createParser(language);

        if (!parser) return [];

        return parser.parse(content, file);
      },
      { concurrency: options.concurrency || 4 }
    );

    // 3. フィルタリング
    let filtered = this.applyFilters(todos.flat(), options);

    // 4. メタデータ付与（issue追跡連携等）
    filtered = await this.enrichMetadata(filtered);

    // 5. ストレージに保存
    await this.storage.save(filtered);

    return filtered;
  }

  private applyFilters(todos: TodoComment[], options: ScanOptions): TodoComment[] {
    return todos.filter(todo => {
      if (options.tags && !options.tags.includes(todo.tag)) return false;
      if (options.assignee && todo.metadata.assignee !== options.assignee) return false;
      if (options.since && todo.metadata.createdAt < options.since) return false;
      if (options.priority && todo.metadata.priority !== options.priority) return false;
      if (options.pattern && !todo.text.match(options.pattern)) return false;
      return true;
    });
  }

  private async enrichMetadata(todos: TodoComment[]): Promise<TodoComment[]> {
    // 既知のissue連携、カスタムタグ解決等
    return todos;
  }

  private async findFiles(
    root: string,
    exclude: string[],
    extensions?: string[]
  ): Promise<string[]> {
    const fastGlob = require('fast-glob');
    const ignore = [...exclude, '**/node_modules/**', '**/.git/**'];

    const pattern = extensions
      ? `**/*{${extensions.join(',')}}`
      : '**/*';

    return fastGlob(pattern, {
      cwd: root,
      ignore,
      absolute: false,
      onlyFiles: true
    });
  }
}
```

**レポート生成**:
```typescript
// src/services/report-generator.ts
import { TodoComment } from '../parser/parser.interface';

export class ReportGenerator {
  generate(todos: TodoComment[], format: OutputFormat): string {
    switch (format) {
      case 'table':
        return this.generateTable(todos);
      case 'json':
        return this.generateJson(todos);
      case 'csv':
        return this.generateCsv(todos);
      case 'markdown':
        return this.generateMarkdown(todos);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateTable(todos: TodoComment[]): string {
    const columns = ['File', 'Line', 'Tag', 'Assignee', 'Text'];
    const rows = todos.map(todo => [
      todo.file,
      todo.line.toString(),
      chalk.bold.yellow(todo.tag),
      todo.metadata.assignee || '-',
      todo.text.substring(0, 80) + (todo.text.length > 80 ? '...' : '')
    ]);

    return cliTable(columns, rows);
  }

  private generateJson(todos: TodoComment[]): string {
    return JSON.stringify(todos, null, 2);
  }

  private generateCsv(todos: TodoComment[]): string {
    const headers = ['file', 'line', 'column', 'tag', 'text', 'context'];
    const rows = todos.map(todo => headers.map(h => {
      if (h === 'metadata') return JSON.stringify(todo.metadata);
      return (todo as any)[h]?.toString() || '';
    }));

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateMarkdown(todos: TodoComment[]): string {
    const grouped = this.groupBy(todos, 'file');

    let output = '# TODO レポート\n\n';
    output += `\`${new Date().toISOString()}\`\n\n`;
    output += `Total: ${todos.length}\n\n`;

    for (const [file, fileTodos] of Object.entries(grouped)) {
      output += `## ${file}\n\n`;
      output += '| 行 | タグ | テキスト |\n';
      output += '|---|------|----------|\n';

      for (const todo of fileTodos) {
        output += `| ${todo.line} | ${todo.tag} | ${todo.text} |\n`;
      }
      output += '\n';
    }

    return output;
  }

  private groupBy(todos: TodoComment[], key: keyof TodoComment): Record<string, TodoComment[]> {
    return todos.reduce((groups, todo) => {
      const group = (todo[key] as any) || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(todo);
      return groups;
    }, {} as Record<string, TodoComment[]>);
  }
}
```

#### ストレージレイヤー (`src/storage/`)

```typescript
// src/storage/storage.interface.ts
export interface Storage {
  save(todos: TodoComment[]): Promise<void>;
  load(): Promise<TodoComment[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

// ファイルシステムベース（簡易）
export class FileSystemStorage implements Storage {
  constructor(private dbPath: string) {}

  async save(todos: TodoComment[]): Promise<void> {
    const existing = await this.load();
    const merged = this.merge(existing, todos);
    await fs.writeFile(this.dbPath, JSON.stringify(merged, null, 2));
  }

  async load(): Promise<TodoComment[]> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  private merge(old: TodoComment[], new: TodoComment[]): TodoComment[] {
    const map = new Map<string, TodoComment>();
    for (const todo of [...old, ...new]) {
      map.set(todo.id, todo);
    }
    return Array.from(map.values());
  }
}

// SQLiteベース（高パフォーマンス・大規模）
export class SqliteStorage implements Storage {
  constructor(private dbPath: string) {
    this.initialize();
  }

  private initialize(): void {
    this.db.run(`CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      line INTEGER NOT NULL,
      column INTEGER NOT NULL,
      tag TEXT NOT NULL,
      text TEXT NOT NULL,
      context TEXT,
      language TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    )`);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_file ON todos(file)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tag ON todos(tag)`);
  }

  async save(todos: TodoComment[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO todos
      (id, file, line, column, tag, text, context, language, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const todo of todos) {
        stmt.run(
          todo.id,
          todo.file,
          todo.line,
          todo.column,
          todo.tag,
          todo.text,
          todo.context,
          todo.language,
          JSON.stringify(todo.metadata)
        );
      }
    });

    await transaction.finish();
  }
}
```

#### ユーティリティ層 (`src/utils/`)

```typescript
// src/utils/parallel-processor.ts
export class ParallelProcessor {
  async process<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    options: { concurrency: number } = { concurrency: 4 }
  ): Promise<R[]> {
    const { Worker } = require('worker_threads');
    const results: R[] = [];
    const queue: Array<{ item: T; resolve: (value: R) => void; reject: (err: any) => void }> = [];

    let activeWorkers = 0;
    const startWorker = () => {
      if (queue.length === 0 || activeWorkers >= options.concurrency) return;

      activeWorkers++;
      const { item, resolve, reject } = queue.shift()!;

      const worker = new Worker('./worker.js', {
        workerData: { fn: fn.toString(), item }
      });

      worker.on('message', (result) => {
        activeWorkers--;
        resolve(result);
        startWorker(); // 次のタスク
      });

      worker.on('error', (err) => {
        activeWorkers--;
        reject(err);
        startWorker();
      });
    };

    // 全アイテムをキューに投入
    for (const item of items) {
      const resultPromise = new Promise<R>((resolve, reject) => {
        queue.push({ item, resolve, reject });
      });
      results.push(resultPromise);
      startWorker();
    }

    return Promise.all(results);
  }
}

// src/utils/cache.ts
export class Cache<K, V> {
  private cache = new Map<string, { value: V; expires: number }>();

  async get(key: K, ttl: number = 60000): Promise<V | null> {
    const k = this.keySerializer(key);
    const entry = this.cache.get(k);
    if (entry && Date.now() < entry.expires) {
      return entry.value;
    }
    this.cache.delete(k);
    return null;
  }

  async set(key: K, value: V, ttl?: number): Promise<void> {
    const k = this.keySerializer(key);
    this.cache.set(k, {
      value,
      expires: Date.now() + (ttl || 60000)
    });
  }

  private keySerializer(key: K): string {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }
}
```

---

## 4. インターフェース定義（完全型定義）

```typescript
// src/types/index.ts

/** コメントタグの列挙 */
export enum TodoTag {
  TODO = 'TODO',
  FIXME = 'FIXME',
  NOTE = 'NOTE',
  HACK = 'HACK',
  XXX = 'XXX'
}

/** 優先度レベル */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/** 言語識別子 */
export enum Language {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  GO = 'go',
  RUST = 'rust',
  JAVA = 'java',
  MARKDOWN = 'markdown',
  HTML = 'html',
  CSS = 'css',
  SHELL = 'shell',
  SQL = 'sql'
}

/** メタデータのスキーマ（拡張可能） */
export interface TodoMetadata {
  assignee?: string;          // GitHub username 等
  deadline?: string;          // ISO 8601 date string
  priority?: Priority;
  issue?: {
    id: string;
    url: string;
    provider: 'github' | 'gitlab' | 'jira';
  };
  labels?: string[];
  custom?: Record<string, any>; // プラグイン用
}

/** TODOアイテムの完全な型 */
export interface TodoComment {
  readonly id: string;                // 一意識別子（file:line:colハッシュ）
  readonly file: string;              // 相対ファイルパス
  readonly line: number;              // 行番号（1-indexed）
  readonly column: number;            // カラム位置（0-indexed）
  readonly text: string;              // TODO本文
  readonly tag: TodoTag;              // タグ
  readonly context?: string;          // 親コンテキスト（関数/クラス）
  readonly language: Language;        // 言語
  readonly rawComment: string;        // 原始コメント
  readonly createdAt: Date;           // 検出/作成日
  readonly updatedAt?: Date;          // 更新日
  readonly metadata: TodoMetadata;    // 拡張メタデータ
}

/** スキャンオプション */
export interface ScanOptions {
  /** スキャン対象ディレクトリ（デフォルト: cwd） */
  path?: string;
  /** 除外パターン配列 */
  exclude?: string[];
  /** 対象ファイル拡張子 */
  extensions?: string[];
  /** 検出対象タグ */
  tags?: TodoTag[];
  /** 担当者フィルタ */
  assignee?: string;
  /** 優先度フィルタ */
  priority?: Priority;
  /** 監視モード */
  watch?: boolean;
  /** 出力形式 */
  format?: OutputFormat;
  /** 並列度 */
  concurrency?: number;
  /** パターンマッチ（正規表現） */
  pattern?: RegExp;
}

/** 出力形式 */
export type OutputFormat = 'table' | 'json' | 'csv' | 'markdown';

/** 統計情報 */
export interface TodoStats {
  total: number;
  byTag: Record<TodoTag, number>;
  byFile: Record<string, number>;
  byAssignee: Record<string, number>;
  byPriority: Record<Priorty, number>;
  byLanguage: Record<Language, number>;
  oldest: TodoComment | null;
  newest: TodoComment | null;
  avgAge: number; // 平均存続期間（days）
}

/** パーサーファクトリインターフェース */
export interface ParserFactory {
  createParser(language: string): Parser | null;
  supportedLanguages(): string[];
  registerParser(parser: Parser): void;
}

/** プラグインインターフェース */
export interface TodoPlugin {
  name: string;
  version: string;

  /** TODO前処理 */
  beforeParse?(file: string, content: string): Promise<string>;

  /** TODO後処理（メタデータ付与等） */
  afterParse?(todos: TodoComment[]): Promise<TodoComment[]>;

  /** フィルタ拡張 */
  filter?(todo: TodoComment, options: ScanOptions): boolean;

  /** 出力拡張 */
  format?(todos: TodoComment[], format: OutputFormat): string;

  /** 設定スキーマ */
  configSchema?: z.ZodObject<any>;
}

/** CLIコマンドインターフェース */
export interface Command {
  name: string;
  description: string;
  execute(options: CommandOptions): Promise<void>;
}

/** 設定ファイルスキーマ */
export interface TodoTrackerConfig {
  version: number;
  exclude: string[];
  tags: string[];
  assignees: string[];
  thresholds: {
    todoCount: number;             // 警告閾値
    oldestDays: number;            // 古いTODO警告
    perFileLimit: number;          // ファイルあたり上限
  };
  plugins: PluginConfig[];
  output: {
    defaultFormat: OutputFormat;
    colorize: boolean;
    showContext: boolean;
  };
}

export interface PluginConfig {
  name: string;
  enabled: boolean;
  options: Record<string, any>;
}
```

---

## 5. 実装ロードマップ

### フェーズ1: コア機能（2週間）

**目標**: 基本的なスキャンとレポート機能

| タスク | 担当 | 見積もり | 完了条件 |
|-------|------|---------|---------|
| プロジェクト初期化（npm、tsconfig、eslint） | 1人 | 0.5日 | `npm init`完了 |
| パーサーベース（正規表現のみ）実装 | 1人 | 2日 | 主要言語でTODO検出 |
| CLIフレームワーク（commander）統合 | 1人 | 1日 | `todo scan`コマンド実行 |
| テーブル/JSON出力 | 1人 | 1日 | 形式切替可能 |
| ユニットテスト（パーサー） | 1人 | 2日 | カバレッジ80% |
| 基本E2Eテスト | 1人 | 1日 | 実際のコードベースで動作確認 |
| **計** | - | **7.5日** | - |

**成果物**:
- `@ult/todo-tracker` npmパッケージ（v0.1.0）
- コマンド: `todo scan`、`todo stats`
- サポート言語: TS/JS/Python/Go/Shell/Markdown

### フェーズ2: AST精度向上（1週間）

**目標**: 正確な位置情報とコンテキスト抽出

| タスク | 担当 | 見積もり | 完了条件 |
|-------|------|---------|---------|
| TypeScript Compiler API統合 | 1-2人 | 2日 | TS/JSで正確なASTパース |
| 複数行コメント handling | 1人 | 1日 | 複数行TODOを正しく連結 |
| コンテキスト抽出（親関数/クラス） | 1人 | 1日 | contextフィールド取得 |
| パーサー登録機構 | 1人 | 1日 | プラグインからparser登録可能 |
| 性能テスト@大規模 | 1人 | 1日 | 1000ファイル < 10秒 |
| **計** | - | **6日** | - |

**成果物**:
- 精度向上: 誤検出0、漏れ0
- コンテキスト情報付与

### フェーズ3: ストレージと履歴（1週間）

**目標**: 永続化と履歴追跡

| タスク | 担当 | 見積もり | 完了条件 |
|-------|------|---------|---------|
| SQLiteストレージ実装 | 1人 | 2日 | 高速インデックス検索 |
| 変更履歴追跡 | 1人 | 2日 | created/updated タイムスタンプ |
| データ移行ツール | 1人 | 1日 | v0.1→v0.2対応 |
| インポート/エクスポート | 1人 | 1日 | CSV/JSON 相互変換 |
| **計** | - | **6日** | - |

**成果物**:
- `~/.todo-tracker/todos.db`（SQLite）
- `todo import`/`todo export` コマンド

### フェーズ4: 拡張性と統合（2週間）

**目標**: プラグインシステムと外部ツール連携

| タスク | 担当 | 見積もり | 完了条件 |
|-------|------|---------|---------|
| プラグインアーキテクチャ設計 | 1人 | 2日 | インターフェース定義 |
| プラグインローダー（動的import） | 1人 | 2日 | `plugins/` ディレクトリ自動ロード |
| GitHub Issues連携プラグイン | 1人 | 2日 | `metadata.issue` 設定可能 |
| 期限管理 | 1人 | 1日 | `deadline` フィールド、警告表示 |
| カスタムルール（Lint-like） | 1人 | 2日 | ユーザー定義ルール（YAML） |
| VS Code拡張（オプション） | 1人 | 3日 | Marketplace公開 |
| **計** | - | **12日** | - |

**成果物**:
- 3種の標準プラグイン（GitHub、期限、カスタムルール）
- VS Code拡張（`vscode-todo-tracker`）

### フェーズ5: CI/CD & 本番対応（1週間）

**目標**: 自動化と配布

| タスク | 担当 | 見積もり | 完了条件 |
|-------|------|---------|---------|
| GitHub Actionsワークフロー | 1人 | 1日 | CI自動テスト |
| Homebrewフォーミュラ作成 | 1人 | 1日 | `brew install ult/todo-tracker` |
| バイナリビルド（pkg） | 1人 | 2日 | 依存関係なし実行可能 |
| ドキュメント网站構築 | 1人 | 2日 | examples、APIリファレンス |
| モニタリング（Analytics） | 1人 | 1日 | 利用統計（匿名） |
| **計** | - | **7日** | - |

**Total見積もり: 7週間（1.75ヶ月）**

---

## 6. パフォーマンス目標

### 6.1 ベンチマーク場景

| 场景 | ファイル数 | 想定時間（目標） | 計測方法 |
|------|-----------|----------------|---------|
| 小規模 | 100 files | < 1 sec | クリーンcache時 |
| 中規模 | 1,000 files | < 5 sec | 初回スキャン |
| 大規模 | 10,000 files | < 30 sec | パラレル8コア |
| ウォッチモード | 単一ファイル | < 100 ms | 変更検知→reraore |

### 6.2 最適化戦略

```typescript
// 1. バッチ処理 + Streaming
async *streamTodos(
  root: string,
  options: ScanOptions
): AsyncGenerator<TodoComment[]> {
  const files = await this.findFiles(root);
  const batchSize = 100;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(file => this.parseFile(file))
    );
    yield results.flat();
  }
}

// 2. スマートキャッシュ（ファイル変更検知）
class SmartCache {
  private mtimeCache = new Map<string, number>();

  async needsReparse(file: string): Promise<boolean> {
    const stats = await fs.stat(file);
    const cached = this.mtimeCache.get(file);
    if (cached === undefined || cached !== stats.mtimeMs) {
      this.mtimeCache.set(file, stats.mtimeMs);
      return true;
    }
    return false;
  }
}

// 3. ASTパースはコンパイル済みキャッシュ
const tsCache = new Map<string, any>();
function getCompiledTsParser(): typeof ts {
  if (!tsCache.has('ts')) {
    tsCache.set('ts', require('typescript'));
  }
  return tsCache.get('ts');
}

// 4. 增量スキャン
async function incrementalScan(lastScan: Date): Promise<TodoComment[]> {
  const changedFiles = await this.findChangedFiles(lastScan);
  return this.scanFiles(changedFiles);
}
```

---

## 7. データモデル詳細

### 7.1 リレーションシップ管理

``` typescript
// src/models/todo-link.ts
export interface TodoLink {
  fromId: string;      // 元TODO ID
  toId: string;        // 関連TODO ID または Issue ID
  type: 'duplicate' | 'blocks' | 'depends-on' | 'related-to';
  createdBy: string;
  createdAt: Date;
}

// 重複TODO自動検出
export function detectDuplicateTodos(
  todos: TodoComment[],
  threshold: number = 0.85
): TodoLink[] {
  const links: TodoLink[] = [];
  const vectorizer = new TfIdfVectorizer();

  const vectors = todos.map(todo => ({
    id: todo.id,
    text: `${todo.text} ${todo.context || ''}`
  }));

  const matrix = vectorizer.fitTransform(vectors.map(v => v.text));

  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      const similarity = cosineSimilarity(matrix[i], matrix[j]);
      if (similarity >= threshold) {
        links.push({
          fromId: todos[i].id,
          toId: todos[j].id,
          type: 'duplicate',
          createdBy: 'system',
          createdAt: new Date()
        });
      }
    }
  }

  return links;
}
```

### 7.2 履歴追跡

```sql
-- SQLiteスキーマ（拡張）
CREATE TABLE todo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id TEXT NOT NULL,
  field TEXT NOT NULL,  -- 'tag', 'text', 'assignee', etc.
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_todo ON todo_history(todo_id);
CREATE INDEX idx_history_date ON todo_history(changed_at);
```

---

## 8. 拡張性とプラグイン

### 8.1 プラグインアーキテクチャ

```typescript
// src/plugins/plugin-manager.ts
export class PluginManager {
  private plugins: Map<string, TodoPlugin> = new Map();
  private hooks: Map<string, Hook[]> = new Map();

  async load(pluginPaths: string[]): Promise<void> {
    for (const p of pluginPaths) {
      const pluginModule = await import(p);
      const plugin = pluginModule.default || pluginModule;

      if (this.validate(plugin)) {
        this.register(plugin);
      }
    }
  }

  private validate(plugin: any): plugin is TodoPlugin {
    return (
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string'
    );
  }

  private register(plugin: TodoPlugin): void {
    this.plugins.set(plugin.name, plugin);

    // フック登録
    if (plugin.beforeParse) this.hooks.set('beforeParse', [...(this.hooks.get('beforeParse')||[]), plugin]);
    if (plugin.afterParse) this.hooks.set('afterParse', [...(this.hooks.get('afterParse')||[]), plugin]);
    if (plugin.filter) this.hooks.set('filter', [...(this.hooks.get('filter')||[]), plugin]);
    if (plugin.format) this.hooks.set('format', [...(this.hooks.get('format')||[]), plugin]);
  }

  async executeBeforeParse(file: string, content: string): Promise<string> {
    const plugins = this.hooks.get('beforeParse') || [];
    for (const p of plugins) {
      if (p.beforeParse) {
        content = await p.beforeParse(file, content);
      }
    }
    return content;
  }

  async executeAfterParse(todos: TodoComment[]): Promise<TodoComment[]> {
    let result = todos;
    const plugins = this.hooks.get('afterParse') || [];
    for (const p of plugins) {
      result = await p.afterParse?.(result) || result;
    }
    return result;
  }

  async executeFilter(todo: TodoComment, options: ScanOptions): Promise<boolean> {
    const plugins = this.hooks.get('filter') || [];
    for (const p of plugins) {
      if (!(await p.filter?.(todo, options))) {
        return false;
      }
    }
    return true;
  }
}
```

### 8.2 サンプルプラグイン: GitHub Issues連携

```typescript
// plugins/github-issue-plugin.ts
import { TodoPlugin } from '../src/types';
import { Octokit } from '@octokit/rest';

export default {
  name: 'github-issues',
  version: '1.0.0',

  configSchema: z.object({
    token: z.string(),
    owner: z.string(),
    repo: z.string()
  }),

  async afterParse(todos: TodoComment[]): Promise<TodoComment[]> {
    const config = this.loadConfig();
    const octokit = new Octokit({ auth: config.token });

    // TODO内のissue参照を検出
    for (const todo of todos) {
      const issueMatch = todo.text.match(/#(\d+)/);
      if (issueMatch) {
        const issueNumber = parseInt(issueMatch[1]);
        try {
          const issue = await octokit.rest.issues.get({
            owner: config.owner,
            repo: config.repo,
            issue_number: issueNumber
          });
          todo.metadata.issue = {
            id: issueNumber.toString(),
            url: issue.data.html_url,
            provider: 'github'
          };
        } catch (e) {
          // issue not found or no permission
        }
      }
    }

    return todos;
  }
} satisfies TodoPlugin;
```

---

## 9. テスト戦略

### 9.1 テストピラミッド

```
          [E2E Tests]          (10%)
               /\
              /  \
             /    \
            /      \
    [Integration Tests]     (20%)
            /\
           /  \
          /    \
         /      \
[Unit Tests] [Component Tests]  (70%)
```

### 9.2 ユニットテスト

```typescript
// tests/parser/typescript-parser.test.ts
import { TypescriptParser } from '../src/parser/ast-parsers/typescript-parser';

describe('TypescriptParser', () => {
  let parser: TypescriptParser;

  beforeEach(() => {
    parser = new TypescriptParser();
  });

  it('detects single-line TODO', () => {
    const content = `
      function foo() {
        // TODO: implement this
        return false;
      }
    `;

    const todos = parser.parse(content, 'test.ts');

    expect(todos).toHaveLength(1);
    expect(todos[0].tag).toBe('TODO');
    expect(todos[0].text).toBe('implement this');
    expect(todos[0].line).toBe(2);
    expect(todos[0].context).toBe('foo');
  });

  it('handles multi-line comments', () => {
    const content = `
      /* TODO: fix this bug
       * - handle null
       * - add validation
       */
    `;

    const todos = parser.parse(content, 'test.ts');

    expect(todos).toHaveLength(1);
    expect(todos[0].text).toContain('handle null');
    expect(todos[0].text).toContain('add validation');
  });

  it('distinguishes multiple TODOs in same file', () => {
    const content = `
      // TODO: task 1
      // TODO: task 2
    `;

    const todos = parser.parse(content, 'test.ts');

    expect(todos).toHaveLength(2);
    expect(todos[0].line).toBe(1);
    expect(todos[1].line).toBe(2);
  });

  it('ignores non-TODO comments', () => {
    const content = `
      // regular comment
      // HACK: this is a HACK (should be detected)
      // just a note: something
    `;

    const todos = parser.parse(content, 'test.ts');

    expect(todos).toHaveLength(1);
    expect(todos[0].tag).toBe('HACK');
  });
});
```

### 9.3 統合テスト

```typescript
// tests/integration/todo-analyzer.test.ts
import { TodoAnalyzer } from '../src/services/todo-analyzer';
import { FileSystemStorage } from '../src/storage/file-system-storage';

describe('TodoAnalyzer Integration', () => {
  it('scans real project files', async () => {
    const analyzer = new TodoAnalyzer(
      new ParserFactory(),
      new FileSystemStorage('./test-db.json'),
      new ParallelProcessor()
    );

    const todos = await analyzer.scan({
      path: './sample-project',
      tags: ['TODO', 'FIXME']
    });

    expect(todos.length).toBeGreaterThan(0);
    expect(todos.every(t => t.file && t.line > 0)).toBe(true);
  });

  it('respects exclusion patterns', async () => {
    const todos = await analyzer.scan({
      path: '.',
      exclude: ['node_modules', 'dist']
    });

    const nodeModulesTodos = todos.filter(t => t.file.includes('node_modules'));
    expect(nodeModulesTodos).toHaveLength(0);
  });
});
```

### 9.4 パフォーマンステスト

```typescript
// tests/performance/benchmark.test.ts
import { bench, describe } from 'vitest';
import { TodoAnalyzer } from '../src/services/todo-analyzer';

describe('Performance', () => {
  const analyzer = new TodoAnalyzer(...);

  bench('scan 1000 files', async () => {
    const todos = await analyzer.scan({
      path: './large-codebase',
      concurrency: 8
    });
  }, { time: 5000 });

  bench('parse 10,000 lines', async () => {
    const content = generateLargeFile(10000);
    const parser = new TypescriptParser();
    parser.parse(content, 'large.ts');
  }, { time: 2000 });
});
```

---

## 10. 技術的リスクと軽減策

| リスク | 影響度 | 発生確率 | 軽減策 |
|-------|--------|----------|--------|
| **ASTパーサーの性能劣化** | 高 | 中 | 1. バッチ処理でメモリ制御<br>2. オンデマンドロード<br>3. キャッシュ層追加 |
| **大規模コードベースでOOM** | 高 | 低 | 1. ストリーミングパース<br>2. 增量スキャン実装<br>3. メモリ使用量監視 |
| **ファイルシステム権限問題** | 中 | 中 | 1. アクセス権チェック<br>2. エラーハンドリング<br>3. 再試行ロジック |
| **プラグインセキュリティ** | 高 | 低 | 1. サンドボックス実行<br>2. 権限制限<br>3. コード署名検証 |
| **CI/CDタイムアウト** | 中 | 高 | 1. テスト分割実行<br>2. テストデータ量制限<br>3. 並列化 |
| **クロスプラットフォーム互換性** | 中 | 中 | 1. GitHub Actions matrix<br>2. 手動テスト（Win/Mac/Linux）<br>3. 依存関係最小化 |
| **Versioningと破壊的変更** | 中 | 低 | 1. Semantic Versioning<br>2. 移行ガイド<br>3. 後方互換性テスト |

### 10.1 メモリ管理戦略

```typescript
// メモリ監視
const MAX_MEMORY = 512 * 1024 * 1024; // 512 MB

function checkMemory(): void {
  const usage = process.memoryUsage().heapUsed;
  if (usage > MAX_MEMORY) {
    console.warn('Memory threshold exceeded, forcing GC...');
    global.gc?.(); // 強制GC（node --expose-gc）
  }
}

// バッチ処理でメモリ制限
async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    // バッチごとにGC
    if (i % (batchSize * 2) === 0) {
      setImmediate(() => checkMemory());
    }
  }

  return results;
}
```

---

## 11. 監視とメトリクス

### 11.1 カスタムメトリクス

```typescript
interface Metrics {
  scanDuration: number;                     // ms
  filesProcessed: number;
  todosDetected: number;
  avgParsingTime: number;                  // ms per file
  cacheHitRate: number;                    // 0-1
  memoryPeak: number;                      // bytes
  errors: Array<{ file: string; error: string }>;
}

// OpenTelemetry統合
const tracer = trace.getTracer('todo-tracker');

async function scanWithMetrics(options: ScanOptions): Promise<TodoComment[]> {
  const span = tracer.startSpan('todo-scan');

  span.setAttribute('scan.path', options.path);
  span.setAttribute('scan.concurrency', options.concurrency || 4);

  try {
    const start = Date.now();
    const todos = await analyzer.scan(options);
    const duration = Date.now() - start;

    span.setAttribute('scan.duration_ms', duration);
    span.setAttribute('scan.files', todos.length);
    span.setAttribute('scan.todos', todos.length);

    metrics.record({
      scan_duration: duration,
      files_scanned: todos.length
    });

    return todos;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### 11.2 ダッシュボード

- 定期実行（cron）で取得したメトリクスをPrometheus形式でエクスポート
- Grafanaダッシュボードで可視化

```typescript
// src/metrics/server.ts
import client from 'prom-client';

const scanCounter = new client.Counter({
  name: 'todo_scans_total',
  help: 'Total number of TODO scans'
});

const durationHistogram = new client.Histogram({
  name: 'todo_scan_duration_seconds',
  help: 'Duration of TODO scans'
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

---

## 12. 配布戦略

### 12.1 パッケージング

**npmパッケージ**:
```json
{
  "name": "@ult/todo-tracker",
  "version": "1.0.0",
  "bin": {
    "todo": "./dist/cli.js",
    "todo-tracker": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc && esbuild dist/cli.js --bundle --platform=node --outfile=bin/todo",
    "prepublishOnly": "npm run build"
  }
}
```

**Homebrew**:
```ruby
# Formula: ult/todo-tracker/todo-tracker.rb
class Todotracker < Formula
  desc "TODO comment tracker for development teams"
  homepage "https://github.com/ult/todo-tracker"
  url "https://github.com/ult/todo-tracker/releases/download/v1.0.0/todo-tracker-v1.0.0-darwin-amd64.tar.gz"
  sha256 "..."

  def install
    bin.install "todo"
  end

  test do
    system "#{bin}/todo", "--version"
  end
end
```

### 12.2 CI/CDパイプライン

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        include:
          - os: ubuntu-latest
            binary: todo-linux-amd64
          - os: macos-latest
            binary: todo-darwin-amd64
          - os: windows-latest
            binary: todo-windows-amd64.exe

    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Package binary
        run: npx pkg . --output ${{ matrix.binary }}

      - name: Upload release asset
        uses: softprops/action-gh-release@v1
        with:
          files: ${{ matrix.binary }}
```

---

## 13. 実装上のベストプラクティス

### 13.1 エラーハンドリング

```typescript
// 構造化されたエラークラス階層
export class TodoTrackerError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TodoTrackerError';
  }
}

export class ParserError extends TodoTrackerError {
  constructor(file: string, reason: string) {
    super('PARSER_ERROR', `Failed to parse ${file}: ${reason}`, { file });
  }
}

export class FileAccessError extends TodoTrackerError {
  constructor(file: string, reason: string) {
    super('FILE_ACCESS_ERROR', `Cannot access ${file}: ${reason}`, { file });
  }
}

// 使用例
try {
  const content = await fs.readFile(file, 'utf-8');
} catch (err) {
  throw new FileAccessError(file, err.message);
}
```

### 13.2 ロギング

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

logger.info({ file, todos: todos.length }, 'Scan completed');
logger.error({ file, error: err }, 'Parser failed');
```

### 13.3 設定管理

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  exclude: z.array(z.string()).default(['node_modules', 'dist', '.git']),
  tags: z.array(z.string()).default(['TODO', 'FIXME', 'NOTE', 'HACK', 'XXX']),
  concurrency: z.number().min(1).max(16).default(4),
  database: z.string().default('./.todo-tracker/todos.db'),
});

export function loadConfig(configPath?: string): TodoTrackerConfig {
  const defaultConfig = ConfigSchema.parse({});

  if (configPath && fs.existsSync(configPath)) {
    const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return ConfigSchema.parse({ ...defaultConfig, ...userConfig });
  }

  return defaultConfig;
}
```

---

## 14. ライセンスと法的考慮事項

- **ライセンス**: MIT License（ULTプロジェクトに準拠）
- **依存関係**: すべてOSSライセンス（MIT, Apache 2.0, BSD等）
- **コンプライアンス**: npm audit + Snykで脆弱性監視
- **商標**: ツール名 `todo-tracker` は一般用語のため問題なし

---

## 15. 付録: ベンチマーク結果予測

### 15.1 スキャン性能（期待値）

| コードベース | 行数 | ファイル数 | 正規表現 | AST | SQLite保存 |
|-------------|------|-----------|---------|-----|-----------|
| small-project | 50K | 200 | 0.8s | 1.5s | +0.3s |
| medium-project | 500K | 2,000 | 4.2s | 8.5s | +1.2s |
| large-project | 2M | 10,000 | 18s | 35s | +5s |
| xlarge-project | 10M | 50,000 | 90s | 180s | +25s |

### 15.2 メモリ使用量

- ベース: 50 MB
- +10,000ファイル: 12 MB
- ASTキャッシュ: 最大200 MB（老人タイムアウト1時間）

---

## 16. 将来拡張ロードマップ

- **Q3 2025**: Web UI（Next.js Dashboard）
- **Q4 2025**: リアルタイムCollaboration（WebSocket）
- **Q1 2026**: AIによるTODO重要度予測
- **Q2 2026**: Git blame連携で担当者自動割当
- **Q3 2026**: マルチリポジトリ集計

---

## 結論

本設計は以下を実現する：

1. **高精度**: ASTベースパーシングで誤検出・漏れを最小化
2. **高性能**: 並列処理+キャッシュで大規模コードベースも高速
3. **拡張性**: プラグインシステムでカスタム連携可能
4. **実用的**: 既存ツールと統合、CI/CD対応
5. **保守性**: TypeScript厳格型付け、包括テスト

実装推奨アプローチ: **フェーズドリリース**で早期フィードバックを得つつ、順次機能追加。

---
**最終更新**: 2026-02-08
**著者**: Claude Code (Anthropic)
**バージョン**: 1.0.0
