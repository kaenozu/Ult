# QWEN.md - ULT Trading Platform

最終更新日: 2026年2月10日

## プロジェクト概要

ULT (Ultimate Trading Platform) は、AI予測とテクニカル分析を組み合わせた次世代の株式取引支援プラットフォームです。日本市場と米国市場に対応し、機械学習による価格予測、リアルタイムチャート分析、リスク管理機能を提供します。

### 主要技術スタック

- **フロントエンド**: Next.js 16, React 19, TypeScript 5.0+, Tailwind CSS
- **バックエンド**: Python 3.10+ (開発中)
- **データベース**: クライアントサイドIndexedDB + サーバーサイドPostgreSQL (将来実装予定)
- **テスト**: Jest, React Testing Library, Playwright
- **状態管理**: Zustand
- **チャート**: Chart.js + react-chartjs-2
- **API**: REST API + OpenAPI/Swagger

## ディレクトリ構造

```
Ult/
├── trading-platform/          # フロントエンド（Next.js + React）
│   ├── app/                   # Next.js App Router
│   │   ├── components/        # Reactコンポーネント
│   │   ├── lib/              # ビジネスロジック・サービス
│   │   │   └── api/          # API・データレイヤー
│   │   │       ├── idb-migrations.ts  # IndexedDB マイグレーションシステム
│   │   │       └── idb.ts    # レガシーIndexedDBクライアント
│   │   ├── store/            # Zustand状態管理
│   │   ├── types/            # TypeScript型定義
│   │   └── __tests__/        # テストファイル
│   ├── public/               # 静的リソース
│   ├── .env.example          # 環境変数テンプレート
│   ├── package.json          # 依存関係
│   └── README.md             # フロントエンド詳細ドキュメント
│
├── backend/                   # バックエンド（Python）※開発中
│   ├── src/
│   │   ├── market_correlation/  # 市場相関分析
│   │   ├── supply_demand/       # 需給分析
│   │   ├── trade_journal_analyzer/  # 取引ジャーナル分析
│   │   ├── ult_universe/        # 銘柄ユニバース管理
│   │   ├── cache/               # キャッシュ管理
│   │   └── utils/               # ユーティリティ
│   └── tests/                # バックエンドテスト
│
├── db/                        # データベース管理
│   ├── migrations/            # SQL マイグレーションスクリプト
│   ├── seeds/                 # シードデータ（開発・本番）
│   ├── docs/                  # データベースドキュメント
│   ├── schema.prisma          # Prisma スキーマ定義（将来使用）
│   └── README.md              # データベース管理ガイド
│
├── scripts/                   # ユーティリティスクリプト
│   └── db-migrate.js          # マイグレーション管理スクリプト
├── docs/                      # プロジェクトドキュメント
├── skills/                    # 自動化スクリプト
└── README.md                  # メインドキュメント
```

## ビルドと実行

### 前提条件

- Node.js 18+
- npm 9+ または yarn 1.22+
- Python 3.10+ (バックエンド機能使用時)
- Git

### 開発サーバーの起動

```bash
# プロジェクトルートに移動
cd C:\gemini-desktop\Ult

# フロントエンドディレクトリに移動
cd trading-platform

# 依存関係をインストール
npm install

# 環境変数を設定 (.env.local を作成)
cp .env.example .env.local
# .env.local を編集して ALPHA_VANTAGE_API_KEY を設定

# 開発サーバーを起動
npm run dev
```

アプリケーションは http://localhost:3000 で利用可能になります。

### 主要コマンド

```bash
# 本番ビルド
npm run build

# 本番サーバー起動
npm run start

# 型チェック
npx tsc --noEmit

# リント
npm run lint

# リント自動修正
npm run lint:fix

# テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e

# E2Eテスト（UIモード）
npm run test:e2e:ui
```

## 開発規約

### TypeScript

- 厳格モード (`strict: true`) を使用
- `any` 型の使用を禁止、代わりに `unknown` を使用
- null安全性のために Optional Chaining (`?.`) を活用

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従う：

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット（機能変数なし）
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・ツール設定など
```

### テスト戦略

- **単体テスト**: Jest + React Testing Library
- **E2Eテスト**: Playwright
- **カバレッジ目標**: 80%以上

## セキュリティ

- APIキーは `.env.local` ファイルに保存し、絶対にコミットしない
- 本番環境ではプラットフォームの環境変数機能を使用
- CSRF保護が実装されている
- 環境変数の検証機能により、本番環境では `JWT_SECRET` と `DATABASE_URL` が必須

## デプロイ

### Vercelへのデプロイ（推奨）

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
cd trading-platform
vercel --prod

# 必須環境変数の設定
vercel env add JWT_SECRET
vercel env add DATABASE_URL
```

### Dockerでのデプロイ

```bash
# イメージのビルド
docker build -t ult-trading-platform ./trading-platform

# コンテナの実行
docker run -p 3000:3000 \
  -e ALPHA_VANTAGE_API_KEY=your_key_here \
  -e JWT_SECRET=your_secure_secret \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  ult-trading-platform
```