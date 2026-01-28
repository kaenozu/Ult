# Project Constitution (GEMINI.md)

このプロジェクトは、AI予測シグナルとテクニカル分析を活用した株式取引支援プラットフォーム「Trader Pro」です。
Gemini CLIエージェントはこのファイルをコンテキストとして参照し、プロジェクトの規約とパターンに従って作業を行います。

## 基本方針 (Core Principles)
- **出力言語**: 日本語 (Japanese) を徹底する。
- **技術スタック**: Next.js (App Router), TypeScript, Tailwind CSS。
- **総合指針**: `skills/trader-pro-master.md` を唯一無二の基準とし、機能の維持、日本語化の徹底、データの妥当性、および安全なプロセス管理を自動的に実行する。
- 安全なプロセス管理: `skills/safe-process-manager.md` を遵守し、エージェント自身のプロセスを保護しながら開発サーバーを管理する。
- Gitオート・サバイバル: `skills/git-auto-survival.md` を遵守し、ロックや競合を自律的に解決して開発を止めない。
- スマート・ギット: `skills/smart-git.md` に基づき、大規模な変更後も機能とテストの整合性を保ちながらマージを完遂する。
- フォーキャスト・マスター: `skills/forecast-master.md` に基づき、AI予測の視覚化、過去5年分の的中率算出、および高速バックテストを自律的に提供する。
- 統合インテリジェンス・マスター: `skills/unified-intelligence-master.md` に基づき、銘柄別パラメータ最適化と市場相関分析を統合した「相場観」を自律的に提供する。
- 銘柄ユニバース・マネージャー: `skills/stock-universe-manager.md` に基づき、100銘柄の高品質リスト維持とオンデマンドな銘柄拡張をTDDで自律的に管理する。
- 需給の壁マスター: `skills/supply-demand-master.md` に基づき、価格帯別出来高の正確な計算、赤緑の動的視覚化、およびモンキーテストによる堅牢性維持を自律的に実行する。
- 変更方針: 既存機能を一切損なわない（デグレードさせない）ことを前提に、小さく安全な変更を行う。
- **Git操作**: GitHubの操作には `gh` コマンドを使用し、変更は専用ブランチで管理する。

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
        - `api/`: APIルート
        - `components/`: Reactコンポーネント (UIパーツ)
        - `hooks/`: カスタムフック
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
