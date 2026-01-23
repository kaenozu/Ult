# Project Constitution (GEMINI.md)

このプロジェクトは、AI予測シグナルとテクニカル分析を活用した株式取引支援プラットフォーム「Trader Pro」です。
Gemini CLIエージェントはこのファイルをコンテキストとして参照し、プロジェクトの規約とパターンに従って作業を行います。

## 基本方針 (Core Principles)
- **出力言語**: 日本語 (Japanese)
- **技術スタック**: Next.js (App Router), TypeScript, Tailwind CSS
- **変更方針**: 小さく、安全な変更を優先する (Prefer small, safe diffs)。
- **信頼性**: 不確かなAPIレスポンスを捏造せず、必要に応じて確認を行う。
- **Git操作**:
  - GitHubの操作には `gh` コマンドを使用する。
  - コミット操作には `node skills/smart-git.js "<message>"` を使用する。
- **コマンド実行**:
  - 複数のコマンドを連続実行する場合は `&&` を使用せず、`node skills/chain-commands.js "cmd1" "cmd2"` を使用する。
- **UI品質管理**:
  - UIを変更した際は `node skills/ux-linter.js` を実行し、翻訳漏れやレスポンシブの不備がないか確認する。

## 技術スタック (Tech Stack)
- **Framework**: Next.js 16.1.4 (App Router)
- **Library**: React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Charting**: Chart.js, react-chartjs-2
- **Data**: Yahoo Finance 2 (`yahoo-finance2`)
- **Icons**: Lucide React
- **Testing**: Jest, React Testing Library

## ディレクトリ構造 (Directory Structure)
- **`trading-platform/`**: メインのアプリケーションコード
    - `app/`: Next.js App Router ページとレイアウト
    - `components/`: Reactコンポーネント (UIパーツ)
    - `lib/`: ユーティリティ、APIクライアント、ML予測ロジック
    - `store/`: Zustand ストア (状態管理)
    - `types/`: TypeScript 型定義
    - `__tests__/`: テストファイル
- **`skills/`**: 開発支援用オートメーションスクリプト (AIエージェントスキル)
    - `auto-runner.js`: タスクの自動実行・監視
    - `tdd-developer.js`: TDDワークフロー支援
    - `frontend-tester.js`: フロントエンド検証

## 開発フロー (Development Workflow)

作業ディレクトリは `trading-platform` です。

### コマンド (Commands)
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (http://localhost:3000)
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lint実行
npm run lint
```

### AIエージェントスキルの活用 (Using Skills)
プロジェクトルート (`C:\gemini-desktop\Ult`) から以下のスクリプトを実行して開発を効率化できます。

- **自動ランナー (Auto Runner)**:
  `node skills/auto-runner.js watch --tasks=build,test` (変更監視とテスト自動実行)

- **TDD開発 (TDD Developer)**:
  `node skills/tdd-developer.js verify-red-green-refactor <ComponentName>` (Red-Green-Refactor サイクル)

- **フロントエンド検証 (Frontend Tester)**:
  `node skills/frontend-tester.js full-check` (ビルド、ページロード、エラーチェック)

## コーディング規約 (Conventions)

### コンポーネント設計
- `app/components/` に配置する。
- Functional Component + Hooks を使用する。
- スタイルは Tailwind CSS のユーティリティクラスを使用する。
- 状態管理が必要な場合は `zustand` ストアを使用する (`app/store/` 参照)。

### テスト (Testing)
- Jest と React Testing Library を使用する。
- 新機能の実装には TDD (Test-Driven Development) を推奨する。
- `skills/tdd-developer.js` を活用してテストファーストで進める。

### 命名規則
- ファイル名: PascalCase (`StockChart.tsx`) または camelCase (util関数など)。
- ディレクトリ: kebab-case または camelCase (Next.jsの慣習に従う)。

## 環境設定
- `next.config.ts`: Next.js 設定
- `tailwind.config.ts` / `postcss.config.mjs`: スタイル設定 (Tailwind v4の場合はCSSファイルで設定管理される場合あり)
- `jest.config.js`: テスト設定
