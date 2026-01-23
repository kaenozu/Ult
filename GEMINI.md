# Project Constitution (GEMINI.md)

このプロジェクトは、AI予測シグナルとテクニカル分析を活用した株式取引支援プラットフォーム「Trader Pro」です。
Gemini CLIエージェントはこのファイルをコンテキストとして参照し、プロジェクトの規約とパターンに従って作業を行います。

## 基本方針 (Core Principles)
- **出力言語**: 日本語 (Japanese) を徹底する。
- **技術スタック**: Next.js (App Router), TypeScript, Tailwind CSS。
- **ワークフロー**: `skills/trading-expert.md` に基づくプロフェッショナルなトレーディング体験（BUY/80%基準、日本市場ルール遵守）を最優先する。
- **品質保証**: `skills/quality-gatekeeper.md` を遵守し、完了報告前に必ず「ビルド整合性」と「論理的な表示妥当性」を自己検証する。
- **安全なプロセス管理**: `skills/safe-process-manager.md` を遵守し、エージェント自身のプロセスを保護しながら開発サーバーを管理する。
- **変更方針**: 常に小さく安全な変更を優先し、重要な変更は専用ブランチで行う。
- **Git操作**: GitHubの操作には `gh` コマンドを使用する。

## 技術スタック (Tech Stack)
- **Framework**: Next.js 16.1.4 (App Router)
- **Library**: React 19.2.3, Lucide React (Icons)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (永続化: `persist` ミドルウェア使用)
- **Charting**: Chart.js, react-chartjs-2
- **Data**: Yahoo Finance 2 (`yahoo-finance2`)
- **Testing**: Jest, React Testing Library

## ディレクトリ構造 (Directory Structure)
- **`trading-platform/`**: メインのアプリケーションコード
    - `app/`: Next.js App Router ページとレイアウト
        - `components/`: Reactコンポーネント (UIパーツ)
        - `lib/`: ユーティリティ、APIクライアント、予測・分析ロジック
            - `mlPrediction.ts`: アンサンブルML予測モデル (RF, XGB, LSTM)
            - `analysis.ts`: テクニカル指標計算とシグナル生成
            - `backtest.ts`: 過去データによる戦略検証ロジック
        - `store/`: Zustand ストア (`tradingStore.ts`: ポートフォリオ、ウォッチリスト管理)
        - `types/`: TypeScript 型定義 (`index.ts` に集約)
        - `__tests__/`: テストファイル
- **`skills/`**: 開発支援用オートメーションスクリプト (AIエージェントスキル)

## 開発フロー (Development Workflow)

### コマンド (Commands)
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (http://localhost:3000)
npm run dev

# ビルド・テスト・Lint
npm run build
npm test
npm run lint
```

### AI予測モデルの仕組み
- **アンサンブルモデル**: Random Forest, XGBoost, LSTM の予測結果を重み付け（35:35:30）して最終シグナルを決定。
- **テクニカル指標**: RSI (14), SMA (5, 20, 50, 200), MACD, Bollinger Bands を計算。
- **シグナル出力**: `BUY`, `SELL`, `HOLD` とその信頼度（Confidence %）、ターゲット価格、損切り価格。

## コーディング規約 (Conventions)

### コンポーネント設計
- `app/components/` に配置し、`use client` ディレクティブを適切に使用する。
- 状態管理は `useTradingStore` を介して行い、プロパティのバケツリレーを避ける。
- スタイルは Tailwind CSS のユーティリティクラスを使用。

### データモデル (`types/index.ts`)
- `Stock`: 銘柄基本情報
- `Signal`: 予測シグナル
- `Position`: 保有ポジション
- `Portfolio`: 資産状況全体
- `OHLCV`: 株価履歴データ (Date, Open, High, Low, Close, Volume)

### テスト (Testing)
- 新しいロジック（特に `lib/` 配下の分析関数）を追加する際は、必ず Jest による単体テストを作成すること。
- UIコンポーネントは React Testing Library で検証する。

## 環境設定
- `next.config.ts`: Next.js 設定
- `tailwind.config.ts` / `postcss.config.mjs`: スタイル設定
- `jest.config.js`: テスト設定