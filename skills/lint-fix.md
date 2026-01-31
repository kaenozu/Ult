# Lint Fix Skill

## 概要
コードのリンティングと自動修正を行うスキル。ESLint、Prettierを使用してコード品質を維持する。

## 前提条件
- ESLint がインストールされていること
- Prettier がインストールされていること
- package.json にリントスクリプトが定義されていること

## 1. ESLint 自動修正 (ESLint Auto Fix)

### 実行手順
```bash
# 全ファイルのリントと自動修正
npm run lint -- --fix

# 特定のファイルのみ
npx eslint path/to/file.ts --fix

# 任意のルールで実行
npx eslint --rule 'no-console: error' src/
```

### MCPツール使用例
```javascript
// ESLint実行
Bash("npm run lint -- --fix")

// 特定ファイルの修正
Bash("npx eslint app/page.tsx --fix")
```

### よくある問題と修正
| 問題 | ルール | 自動修正 |
|------|--------|----------|
| 未使用変数 | no-unused-vars | ❌ 手動削除 |
| コンソールログ | no-console | ❌ 手動削除 |
| セミコロンなし | semi | ✅ 自動追加 |
| 引用符の一貫性 | quotes | ✅ 自動修正 |

## 2. Prettier フォーマット (Prettier Format)

### 実行手順
```bash
# 全ファイルをフォーマット
npm run format

# 特定のファイルのみ
npx prettier --write path/to/file.ts

# 設定ファイルを確認
npx prettier --check .
```

### フォーマット対象
- インデント（スペース/タブ）
- 引用符（シングル/ダブル）
- 行末セミコロン
- トリプルクォートの展開
- オブジェクト・配列の配置

### MCPツール使用例
```javascript
// フォーマット実行
Bash("npm run format")

// 設定チェック
Bash("npx prettier --check .")
```

## 3. importの整理 (Import Organization)

### 実行手順
```bash
# importの自動整理
npx eslint-plugin-import --fix

# グループ化順序:
# 1. React/Next.js関連
# 2. 外部ライブラリ
# 3. 内部モジュール（@/...）
# 4. 相対パス
# 5. 型のみのimport
# 6. CSS/アセット
```

### 整理ルール
```typescript
// ✅ 正しい順序
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { utils } from '../../lib/utils';
import type { User } from '@/types';
import './styles.css';

// ❌ 誤った順序
import './styles.css';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
```

## 4. 型チェック (Type Check)

### 実行手順
```bash
# TypeScript型チェック
npm run type-check

# tscを直接実行
npx tsc --noEmit

// エラー詳細を表示
npx tsc --pretty
```

### よくある型エラー
| エラー | 原因 | 修正方法 |
|--------|------|----------|
| `Property 'x' does not exist` | 型定義不足 | 型を追加 |
| `Type 'X' is not assignable` | 型の不一致 | 型を修正 |
| `Parameter 'y' implicitly has 'any'` | any型 | 型を明示 |
| `Could not find module` | パス間違い | パスを修正 |

### MCPツール使用例
```javascript
// 型チェック実行
Bash("npm run type-check")

// tscを直接実行
Bash("npx tsc --noEmit")
```

## 5. 自動修正パイプライン

### 完全な修正フロー
```bash
# 1. importの整理
npx eslint --fix src/

# 2. Prettierでフォーマット
npm run format

# 3. 型チェック
npm run type-check

# 4. リントチェック
npm run lint
```

### pre-commit フックでの自動実行
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## 6. CI/CD統合

### GitHub Actions
```yaml
- name: Lint
  run: npm run lint

- name: Type Check
  run: npm run type-check

- name: Format Check
  run: npm run format:check
```

### プッシュ前チェック
```bash
# 全てのチェックを実行
npm run lint && npm run type-check && npm run format:check
```

## 7. 設定ファイル

### .eslintrc.json
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### .prettierrc
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## 8. レポート作成

### リント結果レポート
```markdown
# 📋 Lint レポート

## サマリー
- チェックしたファイル: [数]
- エラー: [数]
- 警告: [数]
- 自動修正済み: [数]

## エラー一覧
| ファイル | 行 | 列 | ルール | メッセージ |
|---------|---|---|-------|----------|
| [パス] | [行] | [列] | [ルール] | [メッセージ] |

## 型エラー一覧
| ファイル | 行 | エラー |
|---------|---|--------|
| [パス] | [行] | [エラー内容] |
```

## 9. トラブルシューティング

| 問題 | 原因 | 対処法 |
|------|------|--------|
| 自動修正が効かない | ルールが auto-fix 非対応 | 手動修正 |
| フォーマットが戻される | PrettierとESLintの競合 | 設定を統一 |
| 型エラーが多すぎる | 厳格な設定 | anyを一時的に使用 |
| import順が乱れる | プラグイン未設定 | eslint-plugin-import追加 |
