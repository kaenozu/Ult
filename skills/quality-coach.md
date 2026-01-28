# Quality Coach Skill

## 概要
コード品質問題を体系的に分析し、優先順位を付けて改善するスキル。P0（Critical）からP3（Low）までの4段階で問題を分類し、段階的に品質を向上させる。

## 前提条件
- プロジェクトのコードベースが読み取れること
- Gitリポジトリが初期化されていること
- TypeScript/JavaScriptプロジェクトであること

## 1. 品質分析フレームワーク (Quality Analysis Framework)

### 1.1 分析の実行

#### ステップ1: 全体分析の開始
```bash
# Explore エージェントを使用してプロジェクト構造を把握
# Grep で問題パターンを検索
```

#### ステップ2: 問題カテゴリの特定
```javascript
// セキュリティ問題の検出パターン
Grep("process\\.env\\.[A-Z_]+.*=", { output_mode: "content" })
Grep("API_KEY|SECRET|PASSWORD", { output_mode: "content" })

// 型安全性問題の検出パターン
Grep(": any", { output_mode: "content" })
Grep("as any", { output_mode: "content" })

// エラーハンドリング問題の検出パターン
Grep("catch.*\\{\\s*\\}", { output_mode: "content" })
Grep("throw new Error", { output_mode: "content" })

// メモリリーク問題の検出パターン
Grep("useEffect.*\\[\\]", { output_mode: "content" })
Grep("fetch\\(", { output_mode: "content" })
```

### 1.2 優先順位マトリックス

```
影響度 × 緊急度 = 優先度

┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│                 │ 低緊急度 │ 中緊急度 │ 高緊急度 │ 即時対応 │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ 高影響 (重大)   │   P2     │   P2     │   P1     │   P0     │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ 中影響 (重要)   │   P3     │   P2     │   P1     │   P1     │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ 低影響 (軽微)   │   P3     │   P3     │   P2     │   P2     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

## 2. 問題カテゴリ別ガイド

### 2.1 P0: クリティカル問題 (Critical Issues)
**定義**: セキュリティ脆弱性、データ損失リスク、システムダウン

#### セキュリティ (Security)
| 問題 | 検出パターン | 修正方法 |
|------|-------------|----------|
| APIキー露出 | `API_KEY = "..."` | 環境変数に移動 |
| SQLインジェクション | `` `${var}` `` in query | プリペアドステートメント |
| XSS脆弱性 | `dangerouslySetInnerHTML` | サニタイズ追加 |
| 認証なし | `/api/*` without auth | 認証ミドルウェア追加 |

#### 修正テンプレート
```typescript
// ❌ 誤り
const apiKey = "sk-xxxxxxxxxxxx";

// ✅ 正解
const apiKey = process.env.API_KEY!;
if (!apiKey) {
  throw new Error("API_KEY is required");
}
```

#### .env.example の作成
```bash
# .env.example
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here
DATABASE_URL=your_database_url_here
```

### 2.2 P1: 高優先度問題 (High Priority)
**定義**: 型安全性、エラーハンドリング、メモリ管理

#### 型安全性 (Type Safety)
| 問題 | 検出パターン | 修正方法 |
|------|-------------|----------|
| any型使用 | `: any` | 具体的な型定義 |
| 型アサーション | `as Type` | 型ガード追加 |
| 未定義プロパティ | `obj.unknown` | 型定義追加 |

#### 修正テンプレート
```typescript
// ❌ 誤り
function fetchData(url: string): any {
  return fetch(url).then(r => r.json());
}

// ✅ 正解
interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new APIError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
  }
  return response.json();
}
```

#### エラーハンドリング統一
```typescript
// app/types/index.ts
export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

// 型ガード
export function isAlphaVantageError(data: unknown): data is AlphaVantageError {
  if (typeof data !== 'object' || data === null) return false;
  const errorData = data as Record<string, unknown>;
  return typeof errorData['Error Message'] === 'string' ||
         typeof errorData['Note'] === 'string' ||
         typeof errorData['Information'] === 'string';
}

// バリデーション関数
export function validateAlphaVantageResponse(data: unknown): void {
  if (!isAlphaVantageError(data)) return;

  if (data['Error Message']) {
    throw new APIError(data['Error Message'], 'API_ERROR');
  }
  if (data['Note']) {
    throw new RateLimitError(data['Note']);
  }
  if (data['Information']) {
    throw new APIError(data['Information'], 'API_INFO');
  }
}
```

#### メモリリーク防止
```typescript
// ❌ 誤り: クリーンアップなし
useEffect(() => {
  fetchData().then(setData);
}, []);

// ✅ 正解: AbortController でキャンセル可能
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  const controller = new AbortController();
  abortControllerRef.current = controller;

  fetchData(controller.signal)
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    });

  return () => {
    controller.abort();
    abortControllerRef.current = null;
  };
}, []);
```

### 2.3 P2: 中優先度問題 (Medium Priority)
**定義**: 重複コード、パフォーマンス、テストカバレッジ

#### 重複コード削除
```typescript
// ❌ 誤り: 重複したエラーハンドリング
// file1.ts
if (data['Error Message']) {
  throw new Error(data['Error Message']);
}

// file2.ts
if (data['Error Message']) {
  throw new Error(data['Error Message']);
}

// ✅ 正解: 共通関数を抽出
// lib/api/validation.ts
export function handleApiError(data: unknown): never {
  if (isAlphaVantageError(data)) {
    validateAlphaVantageResponse(data);
  }
  throw new APIError('Unknown error', 'UNKNOWN_ERROR');
}

// file1.ts, file2.ts
import { handleApiError } from '@/lib/api/validation';
handleApiError(data);
```

#### パフォーマンス改善
```typescript
// ❌ 誤り: レンダリング内で重い計算
function Component({ items }) {
  const sorted = items.sort((a, b) => a.value - b.value);
  return <div>{sorted.map(...)}</div>;
}

// ✅ 正解: useMemo でキャッシュ
function Component({ items }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.value - b.value),
    [items]
  );
  return <div>{sorted.map(...)}</div>;
}
```

### 2.4 P3: 低優先度問題 (Low Priority)
**定義**: コードスタイル、命名規則、ドキュメント

#### コードスタイル統一
```typescript
// ❌ 誤り: 一貫性のないスタイル
const user_name = "John";
const userEmail = "john@example.com";

// ✅ 正解: 一貫性のある命名
const userName = "John";
const userEmail = "john@example.com";
```

## 3. 品質改善チェックリスト

### 3.1 セキュリティチェック
```bash
# APIキーの検出
grep -r "API_KEY\|SECRET" --include="*.ts" --include="*.tsx" .

# 環境変数の確認
ls .env* .env.example

# 入力検証の確認
grep -r "req\\.body" --include="*.ts" .
```

### 3.2 型安全性チェック
```bash
# any型の検出
grep -r ": any" --include="*.ts" --include="*.tsx" .

# 型アサーションの検出
grep -r "as " --include="*.ts" --include="*.tsx" .
```

### 3.3 エラーハンドリングチェック
```bash
# 空のcatchブロック検出
grep -r "catch.*{[[:space:]]*}" --include="*.ts" --include="*.tsx" .

# throw Error の検出
grep -r "throw new Error" --include="*.ts" --include="*.tsx" .
```

### 3.4 メモリ管理チェック
```bash
# useEffect の確認
grep -r "useEffect" --include="*.ts" --include="*.tsx" -A 5

# fetch の確認
grep -r "fetch(" --include="*.ts" --include="*.tsx" -B 2 -A 2
```

## 4. 改善計画テンプレート

### 4.1 問題レポート
```markdown
# 📋 コード品質レポート

## サマリー
- 分析対象ファイル: [数] ファイル
- 検出された問題: [数] 件
- 優先度別内訳:
  - 🔴 P0 (Critical): [数] 件
  - 🟠 P1 (High): [数] 件
  - 🟡 P2 (Medium): [数] 件
  - 🟢 P3 (Low): [数] 件

## P0: クリティカル問題
### [問題タイトル]
- **ファイル**: [パス:行]
- **カテゴリ**: セキュリティ/データ損失
- **説明**: [問題の詳細]
- **修正方法**: [修正案]
- **影響**: [影響範囲]

## P1: 高優先度問題
### [問題タイトル]
- **ファイル**: [パス:行]
- **カテゴリ**: 型安全/エラーハンドリング
- **説明**: [問題の詳細]

## P2: 中優先度問題
### [問題タイトル]
- **ファイル**: [パス:行]
- **カテゴリ**: 重複コード/パフォーマンス

## 推奨アクション
1. **[すぐに]**: [P0問題の修正]
2. **[今週中]**: [P1問題の修正]
3. **[今月中]**: [P2問題の修正]
4. **[随時]**: [P3問題の修正]
```

## 5. 実践的な改善手順

### 5.1 P0 問題への対処
```bash
# 1. .env.example を作成
cat > .env.example << EOF
API_KEY=your_api_key_here
EOF

# 2. ハードコードされたキーを置換
# IDEの検索置換機能を使用

# 3. 環境変数の検証を追加
git add .env.example
git commit -m "chore: add .env.example template"
```

### 5.2 P1 問題への対処
```bash
# 1. 型定義ファイルを作成/更新
# app/types/index.ts

# 2. エラークラスを追加
# app/lib/errors.ts

# 3. 既存コードを修正
# git add && git commit

# 4. 型チェックを実行
npm run type-check
```

### 5.3 P2 問題への対処
```bash
# 1. 重複コードを抽出
# lib/api/common.ts

# 2. 既存ファイルを更新
# git add && git commit

# 3. テストを実行
npm test
```

## 6. CI/CD 統合

### 6.1 品質チェックワークフロー
```yaml
name: Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # セキュリティスキャン
      - name: Security Scan
        run: |
          grep -r "API_KEY.*=" --include="*.ts" . && exit 1 || true

      # 型チェック
      - name: Type Check
        run: npm run type-check

      # リント
      - name: Lint
        run: npm run lint

      # テスト
      - name: Test
        run: npm test
```

## 7. トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 型エラーが多い | 厳格な設定 | `// @ts-ignore` を一時使用 |
| リントエラー | 設定の競合 | `.eslintrc.json` を調整 |
| テスト失敗 | 変更の影響 | テストを更新 |
| メモリリーク | クリーンアップ漏れ | `useEffect` に cleanup 追加 |
