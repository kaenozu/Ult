# 📈 ULT - Ultimate Trading Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ULT (Ultimate Trading Platform)** は、AI予測とテクニカル分析を組み合わせた次世代の株式取引支援プラットフォームです。日本市場と米国市場に対応し、機械学習による価格予測、リアルタイムチャート分析、リスク管理機能を提供します。

---

## 🎯 プロジェクト概要

### 主要機能

- **🤖 AI予測エンジン**: アンサンブル学習（Random Forest + XGBoost + LSTM）による価格予測
- **📊 テクニカル分析**: RSI、SMA、MACD、ボリンジャーバンド、ATRなど主要指標に対応
- **🎯 シグナル生成**: データ駆動型のBUY/SELL/HOLDシグナル
- **💼 ポートフォリオ管理**: リアルタイム損益追跡とリスク管理
- **🧪 バックテスト**: 戦略の過去データ検証
- **📱 モダンUI**: レスポンシブデザイン、ダークテーマ対応

### 対応市場

- 🇯🇵 **日本市場**: 日経225、東証プライム
- 🇺🇸 **米国市場**: S&P 500、NASDAQ

---

## 🏗️ アーキテクチャ

```
┌──────────────────────────────────────────────────────────────────┐
│                      ULT Trading Platform                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐          ┌──────────────────────┐      │
│  │  Frontend           │          │  Backend             │      │
│  │  (Next.js 16)       │◄────────►│  (Python 3.10+)      │      │
│  ├─────────────────────┤          ├──────────────────────┤      │
│  │ • React 19          │          │ • Market Correlation │      │
│  │ • TypeScript 5.0+   │          │ • Supply/Demand      │      │
│  │ • Zustand           │          │ • Trade Journal      │      │
│  │ • Chart.js          │          │ • Universe Manager   │      │
│  │ • Tailwind CSS      │          │ • Cache Manager      │      │
│  └─────────────────────┘          └──────────────────────┘      │
│           ▲                                   ▲                  │
│           │                                   │                  │
│           └───────────────┬───────────────────┘                  │
│                           │                                       │
│                  ┌────────▼────────┐                             │
│                  │   External APIs  │                             │
│                  ├─────────────────┤                             │
│                  │ • Alpha Vantage │                             │
│                  │ • Yahoo Finance │                             │
│                  └─────────────────┘                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 クイックスタート

### 前提条件

以下がインストールされている必要があります：

- **Node.js** 18.0+ ([ダウンロード](https://nodejs.org/))
- **npm** 9.0+ または **yarn** 1.22+
- **Python** 3.10+ ([ダウンロード](https://www.python.org/)) ※バックエンド機能を使用する場合
- **Git** ([ダウンロード](https://git-scm.com/))

### インストール手順

#### 1. リポジトリのクローン

```bash
git clone https://github.com/kaenozu/Ult.git
cd Ult
```

#### 2. フロントエンドのセットアップ

```bash
# trading-platformディレクトリに移動
cd trading-platform

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local

# .env.local を編集してAPIキーを設定
# エディタで .env.local を開き、ALPHA_VANTAGE_API_KEY を設定
```

**Alpha Vantage APIキーの取得**:
1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key) にアクセス
2. 無料のAPIキーを取得（メールアドレスのみで登録可能）
3. `.env.local` ファイルの `ALPHA_VANTAGE_API_KEY` に設定

#### 3. バックエンドのセットアップ（オプション）

バックエンドの高度な分析機能を使用する場合：

```bash
# プロジェクトルートに戻る
cd ..

# backendディレクトリに移動
cd backend

# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール（将来実装予定）
# pip install -r requirements.txt
```

**注**: バックエンドは現在開発中です。フロントエンドのみで基本的な機能は利用可能です。

#### 4. 開発サーバーの起動

```bash
# trading-platformディレクトリで実行
cd trading-platform
npm run dev
```

ブラウザで http://localhost:3000 を開いてアプリケーションにアクセスできます。

---

## 📁 プロジェクト構造

```
Ult/
├── trading-platform/          # フロントエンド（Next.js + React）
│   ├── app/                   # Next.js App Router
│   │   ├── components/        # Reactコンポーネント
│   │   ├── lib/              # ビジネスロジック・サービス
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
├── scripts/                   # ユーティリティスクリプト
├── docs/                      # プロジェクトドキュメント
├── skills/                    # 自動化スクリプト
└── README.md                  # このファイル
```

### 主要ディレクトリの説明

#### `trading-platform/`
フロントエンドアプリケーション。Next.js 16とReact 19を使用した最新のWebアプリケーション。

- **`app/components/`**: UIコンポーネント（チャート、シグナルパネル、注文パネルなど）
- **`app/lib/`**: ビジネスロジック（市場データ取得、テクニカル指標計算、AI予測など）
- **`app/store/`**: グローバル状態管理（Zustand）
- **`app/types/`**: TypeScript型定義

#### `backend/`
Python製のバックエンド分析エンジン。高度な市場分析機能を提供（現在開発中）。

- **`src/market_correlation/`**: 市場間の相関分析
- **`src/supply_demand/`**: 需給分析エンジン
- **`src/trade_journal_analyzer/`**: 取引ログ分析
- **`src/ult_universe/`**: 銘柄スクリーニング・ユニバース管理

---

## 🔧 開発

### フロントエンド開発コマンド

```bash
cd trading-platform

# 開発サーバー起動
npm run dev

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

# E2Eテスト（Playwright）
npm run test:e2e

# E2Eテスト（UIモード）
npm run test:e2e:ui
```

### バックエンド開発コマンド

```bash
cd backend

# テスト実行（将来実装予定）
# python -m pytest

# カバレッジ付きテスト
# python -m pytest --cov=src
```

### 開発ワークフロー

1. **機能ブランチの作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **変更の実装**
   - TDD（テスト駆動開発）を推奨
   - 型安全性を重視（TypeScriptの厳格モード）
   - ESLintルールに従う

3. **テストの実行**
   ```bash
   npm test
   npm run test:e2e
   ```

4. **コミット**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **プルリクエストの作成**

---

## 📖 詳細ドキュメント

### コアコンポーネント

- **[trading-platform/README.md](./trading-platform/README.md)** - フロントエンドの詳細ドキュメント
- **[REMAINING_TECH_DEBT_ROADMAP.md](./REMAINING_TECH_DEBT_ROADMAP.md)** - 技術的負債と改善計画

### 主要サービスクラス

#### MarketDataService
市場データの取得とキャッシュ管理を担当。

```typescript
import { MarketDataService } from '@/app/lib/MarketDataService';

const service = new MarketDataService();
const data = await service.fetchMarketData('^N225');
```

#### TechnicalIndicatorService
テクニカル指標（RSI、SMA、MACDなど）の計算。

```typescript
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

const rsi = technicalIndicatorService.calculateRSI(prices, 14);
const sma = technicalIndicatorService.calculateSMA(prices, 20);
```

#### ConsensusSignalService
複数のテクニカル指標を統合した売買シグナル生成。

```typescript
import { consensusSignalService } from '@/app/lib/ConsensusSignalService';

const signal = consensusSignalService.generateConsensus(ohlcvData);
// signal.type: 'BUY' | 'SELL' | 'HOLD'
// signal.confidence: 0-100
```

---

## 🧪 テスト

### テスト戦略

- **単体テスト**: Jest + React Testing Library
- **E2Eテスト**: Playwright
- **カバレッジ目標**: 80%以上

### テストの実行

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# 特定のテストファイル
npm test -- MarketDataService.test.ts

# E2Eテスト
npm run test:e2e

# E2Eテスト（ヘッドレスモード）
npm run test:e2e:headed
```

---

## 🔒 セキュリティ

### 環境変数の管理

- ✅ **APIキーは絶対にコミットしない**
- ✅ `.env.local` ファイルを使用（`.gitignore` で保護済み）
- ✅ 本番環境ではプラットフォームの環境変数機能を使用

### セキュリティチェック

```bash
# 依存関係の脆弱性スキャン
npm audit

# 深刻度の高い脆弱性のみ
npm audit --audit-level high

# 自動修正
npm audit fix
```

---

## 🎨 コーディング規約

### TypeScript

- **厳格モード**: `strict: true` を使用
- **any型の禁止**: できる限り `unknown` を使用
- **null安全性**: Optional Chaining (`?.`) を活用

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従う：

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット（機能変更なし）
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・ツール設定など
```

---

## 🚀 デプロイ

### Vercelへのデプロイ（推奨）

```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
cd trading-platform
vercel --prod

# 環境変数の設定
vercel env add ALPHA_VANTAGE_API_KEY
```

### Dockerでのデプロイ

```bash
# イメージのビルド
docker build -t ult-trading-platform ./trading-platform

# コンテナの実行
docker run -p 3000:3000 \
  -e ALPHA_VANTAGE_API_KEY=your_key_here \
  ult-trading-platform
```

---

## 🤝 貢献

プルリクエストを歓迎します！以下の手順に従ってください：

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/Ult.git
cd Ult

# フロントエンドのセットアップ
cd trading-platform
npm install
cp .env.example .env.local

# 開発サーバー起動
npm run dev
```

---

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

## 🙋‍♂️ サポート・お問い合わせ

### ドキュメント

- [フロントエンド詳細ドキュメント](./trading-platform/README.md)
- [API仕様](./docs/api.md)（将来実装予定）
- [技術的負債ロードマップ](./REMAINING_TECH_DEBT_ROADMAP.md)

### お問い合わせ

- **Issues**: [GitHub Issues](https://github.com/kaenozu/Ult/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kaenozu/Ult/discussions)

---

## 🎯 ロードマップ

### 近日実装予定（v1.1）

- [ ] WebSocketリアルタイムデータ接続
- [ ] バックテスト機能の強化
- [ ] ポートフォリオ分析ダッシュボード
- [ ] 高度なリスク管理機能

### 将来的な展望（v1.2+）

- [ ] Pythonバックエンドの完全統合
- [ ] モバイルアプリ版
- [ ] 機械学習モデルの継続的学習
- [ ] ソーシャル取引機能

---

<div align="center">
  <strong>⚡ AIで次のトレードを予測しよう ⚡</strong><br>
  <sub>※投資判断は自己責任で行ってください</sub>
</div>
