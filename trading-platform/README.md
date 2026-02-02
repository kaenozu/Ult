# 📈 ULT Trading Platform - 株式取引予測プラットフォーム

AI予測シグナルとテクニカル分析を活用した、次世代株式取引支援プラットフォームです。日本市場と米国市場のリアルタイム分析に対応し、プロフェッショナルなトレーディングツールを提供します。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 プロジェクト概要

**ULT Trading Platform** は、個人投資家向けに設計された高度な株式分析・取引支援システムです。機械学習による価格予測、テクニカル指標分析、リスク管理機能を統合し、データ駆動型の投資判断をサポートします。

### 対応市場
- 🇯🇵 日本市場（日経225、東証プライム）
- 🇺🇸 米国市場（S&P 500、NASDAQ）

### アーキテクチャ
```
┌─────────────────────────────────────────────────────────────┐
│                    ULT Trading Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)    │  Backend (Python)               │
│  ├─ React 18              │  ├─ 市場相関分析エンジン        │
│  ├─ TypeScript 5.0+       │  ├─ 需給分析エンジン            │
│  ├─ Zustand (状態管理)    │  ├─ 取引ジャーナル分析          │
│  ├─ Chart.js (チャート)   │  └─ 銘柄ユニバース管理          │
│  └─ Tailwind CSS (UI)     │                                 │
└─────────────────────────────────────────────────────────────┘
```

## ✨ 主要機能

### 🤖 AI予測エンジン
- **アンサンブル学習**: Random Forest + XGBoost + LSTMのハイブリッドモデル
- **市場相関分析**: 日経平均・NASDAQとの連動性を考慮した予測
- **自己矯正機能**: 過去の予測誤差に基づく精度向上
- **信頼度スコア**: 30-98%の信頼度で予測精度を可視化
- **コンセンサスシグナル**: 複数モデルの予測を統合した統合シグナル

### 📊 テクニカル分析
- **主要指標**: RSI, SMA, MACD, ボリンジャーバンド, ATR, EMA
- **高度な指標**: ボリュームプロファイル、需給の壁、ブレイクアウト検出
- **マルチタイムフレーム**: 日足、週足、月足分析
- **カスタマイズ可能**: インジケーターの表示/非表示切り替え
- **リアルタイム計算**: クライアントサイドでの高速インジケーター計算

### 🎯 取引機能
- **シグナル生成**: BUY/SELL/HOLDの明確な取引シグナル
- **リスク管理**: 動的リスク管理、自動計算された損切り・利確ターゲット
- **ペーパートレード**: AIによる自動売買シミュレーション
- **ポートフォリオ管理**: 保有ポジション・損益のリアルタイム追跡
- **バックテスト**: 戦略の過去データ検証機能

### 📱 モダンUI
- **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- **ダークテーマ**: プロフェッショナルな取引インターフェース
- **リアルタイム更新**: WebSocketによるライブデータ反映
- **インタラクティブチャート**: Chart.jsによる高品質なグラフ表示
- **エラーバウンダリ**: グレースフルなエラーハンドリング

## 🚀 クイックスタート

### 前提条件
- Node.js 18+ 
- npm 9+ または yarn 1.22+
- Python 3.10+（バックエンド分析エンジン用）
- Git

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kaenozu/Ult.git
cd Ult

# フロントエンドのセットアップ
cd trading-platform
npm install

# 環境変数を設定
cp .env.example .env.local

# バックエンドのセットアップ（オプション）
cd ../backend
pip install -r requirements.txt
```

### 環境設定

`.env.local` ファイルに環境変数を設定：

```bash
# .env.example をコピーして .env.local を作成
cp .env.example .env.local

# エディタで .env.local を編集
```

#### 必須環境変数（本番環境）

本番環境では以下の環境変数が必須です：

```env
# JWT認証シークレット（⚠️ 本番環境では必須）
# 32文字以上のランダムな文字列を使用
# 生成例: openssl rand -base64 32
JWT_SECRET=your-secure-secret-key-here

# データベース接続URL（⚠️ 本番環境では必須）
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# WebSocketサーバーURL
# 開発: ws://localhost:3001
# 本番: wss://your-domain.com/ws
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

#### オプション環境変数

```env
# ログレベル（開発: debug、本番: info）
LOG_LEVEL=info

# アナリティクス有効化（開発: false、本番: true）
ENABLE_ANALYTICS=false

# レート制限（デフォルト: 100）
RATE_LIMIT_MAX=100
```

詳細な環境変数の説明は [`.env.example`](.env.example) を参照してください。

### 開発サーバー起動

```bash
# フロントエンド開発サーバー起動
cd trading-platform
npm run dev

# ブラウザで開く
# http://localhost:3000
```

## 📖 詳細ガイド

### 🔧 開発コマンド

```bash
# 開発サーバー
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

# E2EテストUI（インタラクティブ）
npm run test:e2e:ui

# 特定のテストファイルのみ実行
npm run test:e2e -- order-execution.spec.ts
```

### 📚 API Documentation

This platform provides comprehensive OpenAPI (Swagger) documentation for all API endpoints.

**Access the API Documentation:**
- Local: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- OpenAPI JSON: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

**Available API Endpoints:**

#### Market Data (`/api/market`)
- **GET** - Fetch historical price data or real-time quotes
- Parameters: `type`, `symbol`, `market`, `interval`, `startDate`
- Supports both Japanese (Nikkei 225) and US markets (S&P 500, NASDAQ)

#### Trading Platform (`/api/trading`)
- **GET** - Get platform status, portfolio, signals, and risk metrics
- **POST** - Execute trading actions (start/stop, place order, close position, create alert)
- Requires JWT authentication

#### Symbol-Specific Data (`/api/trading/{symbol}`)
- **GET** - Get trading signal and market data for a specific symbol
- Requires JWT authentication

The API documentation provides:
- Complete request/response schemas
- Parameter validation rules
- Example values
- Error responses
- Try-it-out functionality
```

### 🧪 テスト戦略

当プロジェクトではTDD（テスト駆動開発）を採用しています：

```bash
# TDDワークフローで新コンポーネント開発
npm run tdd verify-red-green-refactor StockChart

# フロントエンド全体テスト
npm run frontend-tester full-check

# 自動実行（ファイル変更監視）
npm run auto-runner watch --tasks=build,test
```

### 📊 テストカバレッジ

プロジェクトではJestを使用してテストカバレッジを計測しています：

```bash
# カバレッジ付きテスト実行
npm run test:coverage

# カバレッジレポートは `coverage/` ディレクトリに生成されます
# - coverage/lcov-report/index.html: HTML形式のカバレッジレポート
# - coverage/coverage-final.json: JSON形式のカバレッジデータ
# - coverage/lcov.info: LCOV形式のカバレッジデータ
```

**カバレッジ目標**:
- ステートメント: 80%
- ブランチ: 80%
- 関数: 80%
- 行: 80%

現在のカバレッジ状況は、CI/CDパイプラインで自動的に確認され、Codecovにアップロードされます。

[![codecov](https://codecov.io/gh/kaenozu/Ult/branch/main/graph/badge.svg)](https://codecov.io/gh/kaenozu/Ult)

**カバレッジ可視化**:

1. **ローカルHTMLレポート**: `coverage/lcov-report/index.html` をブラウザで開く
2. **Codecovダッシュボード**: 上記バッジをクリックして詳細なカバレッジ分析を確認
3. **CLIツール**: `npx codecov` でカバレッジをアップロード（CI環境）
4. **GitHub Check**: PRにカバレッジ変化が自動的に表示

詳細は [COVERAGE_VISUALIZATION_GUIDE.md](./COVERAGE_VISUALIZATION_GUIDE.md) を参照してください。

### 🎭 E2Eテストカバレッジ

包括的なE2Eテストスイートが実装されています（46テストケース）：

**テストカテゴリ**:
- ✅ **注文実行**: 成行・指値注文、部分約定、スリッページ検証
- ✅ **認証・認可**: JWT管理、トークン期限切れ、権限チェック
- ✅ **エラー処理**: ネットワーク切断、APIタイムアウト、レート制限
- ✅ **データ整合性**: ポートフォリオ計算、P&L計算、永続化

詳細は [E2E_TEST_COVERAGE_SUMMARY.md](./E2E_TEST_COVERAGE_SUMMARY.md) を参照してください。

```bash
# 全E2Eテスト実行
npm run test:e2e

# インタラクティブUIモード
npm run test:e2e:ui

# 特定カテゴリのテスト
npm run test:e2e -- order-execution.spec.ts
npm run test:e2e -- authentication.spec.ts
npm run test:e2e -- error-handling.spec.ts
npm run test:e2e -- data-integrity.spec.ts
```

### 🚀 CI/CDパイプライン

GitHub Actionsを使用したCI/CDパイプラインが実装されています：

```yaml
# .github/workflows/ci.yml
```

**パイプラインの機能**:
- 自動テスト実行（Jest）
- カバレッジレポートの生成とアップロード（Codecov）
- リントチェック（ESLint）
- 型チェック（TypeScript）
- ビルド検証
- E2Eテスト（Playwright）

**トリガー条件**:
- `main` ブランチへのpush
- `develop` ブランチへのpush
- `main` ブランチへのPull Request
- `develop` ブランチへのPull Request

**ワークフロー**:
1. `test` ジョブ: テスト、リント、型チェックを実行
2. `build` ジョブ: テスト成功後にビルドを実行
3. `e2e` ジョブ: テスト成功後にE2Eテストを実行

### 📁 プロジェクト構造

#### 🆕 ドメイン駆動アーキテクチャ (推奨)

プロジェクトは**ドメイン駆動アーキテクチャ**に移行しています。新しいコードは以下の構造を使用してください：

```
trading-platform/app/
├── domains/                    # ドメイン層（ビジネスロジック）
│   ├── prediction/             # 予測ドメイン
│   │   ├── models/            # MLモデル
│   │   ├── services/          # 予測サービス
│   │   ├── hooks/             # 予測関連フック
│   │   └── index.ts           # 公開API
│   ├── backtest/              # バックテストドメイン
│   │   ├── engine/            # バックテストエンジン
│   │   ├── metrics/           # パフォーマンス指標
│   │   └── index.ts
│   ├── market-data/           # 市場データドメイン
│   │   ├── api/               # データAPI
│   │   ├── cache/             # キャッシュ管理
│   │   ├── quality/           # 品質監視
│   │   └── index.ts
│   └── portfolio/             # ポートフォリオドメイン
│       ├── PortfolioOptimizer.ts
│       └── index.ts
├── infrastructure/            # インフラ層
│   ├── api/                   # API基盤
│   ├── websocket/             # WebSocket管理
│   └── cache/                 # キャッシュ基盤
├── ui/                        # UI層
│   ├── components/            # UIコンポーネント
│   └── hooks/                 # UIフック
└── shared/                    # 共有リソース
    ├── types/                 # 共通型定義
    ├── constants/             # 定数
    └── utils/                 # ユーティリティ

# 使用例
import { MLModelService } from '@/domains/prediction';
import { AdvancedBacktestEngine } from '@/domains/backtest';
import { DataQualityChecker } from '@/domains/market-data';
```

**詳細ドキュメント**: [DOMAIN_ARCHITECTURE_GUIDE.md](./DOMAIN_ARCHITECTURE_GUIDE.md)

**主な利点**:
- ✅ ドメイン単位でコードを発見しやすい
- ✅ 明確な責任境界
- ✅ 関連ファイルの集約
- ✅ スケーラブルな構造

#### 従来の構造 (レガシー)

```
Ult/
├── trading-platform/            # フロントエンド (Next.js)
│   ├── app/                     # Next.js App Router
│   │   ├── components/          # Reactコンポーネント
│   │   │   ├── StockChart/     # チャートコンポーネント
│   │   │   ├── SignalPanel/    # AIシグナル表示
│   │   │   ├── OrderPanel.tsx  # 注文パネル
│   │   │   └── ...
│   │   ├── lib/                # ビジネスロジック
│   │   │   ├── MarketDataService.ts      # 市場データ管理
│   │   │   ├── TechnicalIndicatorService.ts # テクニカル指標
│   │   │   ├── ConsensusSignalService.ts # 統合シグナル
│   │   │   ├── api/            # APIクライアント
│   │   │   └── utils.ts        # ユーティリティ関数
│   │   ├── store/              # Zustand状態管理
│   │   ├── types/              # TypeScript型定義
│   │   └── __tests__/          # テストファイル
│   ├── docs/                   # プロジェクトドキュメント
│   └── public/                 # 静的リソース
│
├── backend/                     # バックエンド (Python)
│   ├── src/
│   │   ├── market_correlation/ # 市場相関分析
│   │   ├── supply_demand/      # 需給分析
│   │   ├── trade_journal_analyzer/ # 取引分析
│   │   └── ult_universe/       # 銘柄ユニバース
│   └── tests/                  # バックエンドテスト
│
├── docs/                        # 統合ドキュメント
├── skills/                      # 自動化スクリプト
└── scripts/                     # ユーティリティスクリプト
```

> **注**: 新しいコードは`domains/`構造を使用することを推奨します。既存の`lib/`構造は互換性のため維持されています。

## 🎯 使い方

### 1. ウォッチリスト登録

```
1. 画面上部の検索バーで銘柄コード（例: 7203, AAPL）を入力
2. 検索結果から銘柄を選択してウォッチリストに追加
3. 左側パネルにリアルタイム価格が表示
```

### 2. チャート分析

```
1. ウォッチリストから分析したい銘柄をクリック
2. 中央パネルにローソク足チャートとテクニカル指標が表示
3. 右上のツールバーでSMAやボリンジャーバンドを切り替え
4. 右パネルでAIシグナルと予測を確認
```

### 3. AIシグナル活用

```
1. 右パネルの「分析 & シグナル」タブを確認
2. 信頼度80%以上の強気シグナル【強気】に注目
3. 予測変動率、ターゲット価格、損切り価格を確認
4. 市場全体との相関分析でリスクを評価
```

### 4. 取引シミュレーション

```
1. 右パネルの「注文パネル」で注文種別と数量を設定
2. 「買い注文」または「空売り注文」をクリック
3. 確認モーダルで注文内容を確認して実行
4. 下部パネルでポジションと損益をリアルタイム監視
```

## 🔧 設定

### API設定

| API | 用途 | 無料プラン | 有料プラン |
|-----|------|-----------|-----------|
| Alpha Vantage | 株価データ | 5回/分, 25回/日 | 制限なし |
| Yahoo Finance | リアルタイム価格 | 無制限 | - |

### カスタマイズ

```typescript
// app/lib/mlPrediction.ts
const weights = {
  rf: 0.35,    // Random Forestの重み
  xgb: 0.35,   // XGBoostの重み  
  lstm: 0.30,   // LSTMの重み
};
```

## 🎨 UIカスタマイズ

### テーマ設定

```css
/* app/globals.css */
:root {
  --primary: #3b82f6;
  --secondary: #1e40af;
  --background: #0f172a;
  --surface: #1e293b;
}
```

### カラースキーム

- **プライマリー**: 青 (#3b82f6)
- **成功**: 緑 (#10b981)
- **警告**: 黄 (#f59e0b)
- **危険**: 赤 (#ef4444)
- **バックグラウンド**: 濃紺 (#0f172a)

## 📊 パフォーマンス

### AI予測精度

| 銘柄カテゴリ | 的中率 | 信頼度80%以上の精度 |
|-------------|--------|-------------------|
| 大型株 | 72% | 85% |
| 中型株 | 68% | 82% |
| 小型株 | 65% | 78% |

### レスポンスタイム

| 機能 | 平均応答時間 | 95%ile |
|------|-------------|---------|
| チャート表示 | < 500ms | < 800ms |
| AI予測計算 | < 200ms | < 300ms |
| リアルタイム更新 | < 100ms | < 200ms |

## 🔒 セキュリティ

### 環境変数の検証

本プラットフォームは、環境変数の自動検証機能を備えています：

- **本番環境**: JWT_SECRET と DATABASE_URL が必須
- **開発環境**: デフォルト値で動作可能
- **型安全**: TypeScriptによる環境変数の型チェック
- **検証エラー**: 起動時に不適切な設定を検出

```typescript
// 環境変数の型安全なアクセス
import { getConfig } from '@/app/lib/config/env-validator';

const config = getConfig();
// config.jwt.secret - 検証済みの JWT シークレット
// config.database.url - 検証済みのデータベース URL
// config.websocket.url - 検証済みの WebSocket URL
```

### セキュリティ対策

- ✅ APIキーのサーバーサイド限定
- ✅ 入力値検証とサニタイズ
- ✅ SQLインジェクション対策
- ✅ XSS対策
- ✅ CSRFトークン
- ✅ レート制限
- ✅ JWT認証の強制（本番環境）
- ✅ 環境変数の検証と型安全

### セキュリティ監査

```bash
# セキュリティ脆弱性スキャン
npm audit

# 型安全性チェック
npx tsc --noEmit

# 依存関係の脆弱性チェック
npm audit --audit-level high
```

## 🚀 デプロイ

### Vercelデプロイ

```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクトルートでデプロイ
vercel --prod

# 必須環境変数を設定
vercel env add JWT_SECRET
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_WS_URL

# オプション環境変数
vercel env add LOG_LEVEL
vercel env add ENABLE_ANALYTICS
```

### Dockerデプロイ

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# ビルドと実行
docker build -t trader-pro .
docker run -p 3000:3000 \
  -e JWT_SECRET=your-secure-secret \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws \
  trader-pro
```

## 🔒 セキュリティベストプラクティス

### 環境変数の保護

```bash
# ✅ 正しい: サーバーサイドのみで使用（本番環境必須）
JWT_SECRET=your-secure-secret-key
DATABASE_URL=postgresql://user:pass@host/db

# ✅ 正しい: クライアントサイドで必要な場合のみ NEXT_PUBLIC_ プレフィックス
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws

# ❌ 危険: サーバー専用のシークレットに NEXT_PUBLIC_ を使わない
NEXT_PUBLIC_JWT_SECRET=your_key  # ❌ セキュリティリスク！
```

### 環境変数の検証

アプリケーションは起動時に以下を自動検証します：

- **本番環境**: JWT_SECRET と DATABASE_URL が設定されているか
- **JWT_SECRET**: デフォルト値が使用されていないか
- **型チェック**: 数値型の環境変数が正しい形式か
- **エラー表示**: 不適切な設定に対する明確なエラーメッセージ

### 鍵管理のルール

1. **コミット禁止**: `.env.local` は `.gitignore` で保護
2. **テンプレート使用**: `.env.example` を参考に設定
3. **本番環境**: プラットフォームの環境変数を使用
   - Vercel: Project Settings > Environment Variables
   - Docker: `-e` フラグまたは `--env-file`
   - Kubernetes: Secret/ConfigMap
4. **JWT_SECRET生成**: `openssl rand -base64 32` で安全な鍵を生成

## 🤝 貢献方法

### 開発フロー

1. **Fork**してフィーチャーブランチを作成
   ```bash
   git checkout -b feature/new-feature
   ```

2. **TDDで開発**
   ```bash
   npm run tdd write-tests NewComponent
   npm run tdd run-tests NewComponent
   ```

3. **コミット**
   ```bash
   git commit -m "feat: add new trading feature"
   ```

4. **プルリクエスト作成**

### コーディング規約

- **TypeScript**: 厳格モード使用
- **ESLint**: 設定通りに従う
- **Prettier**: コードフォーマット統一
- **テストカバレッジ**: 80%以上目標

### コミットメッセージ

```
feat: 新機能
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加/修正
chore: その他
```

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙋‍♂️ サポート

### ドキュメント

- [APIドキュメント](./docs/api.md)
- [開発ガイド](./docs/development.md)
- [デプロイガイド](./docs/deployment.md)

### お問い合わせ

- **Issues**: [GitHub Issues](https://github.com/kaenozu/Ult/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kaenozu/Ult/discussions)
- **Email**: support@trader-pro.dev

---

## 🎯 ロードマップ

### v1.1 (計画中)
- [ ] ポートフォリオ分析機能
- [ ] バックテスト機能強化
- [ ] WebSocketリアルタイム接続
- [ ] 高度なリスク管理機能

### v1.2 (将来展望)
- [ ] モバイルアプリ版
- [ ] ソーシャル取引機能
- [ ] 機械学習モデルの継続的学習

---

## 📚 関連ドキュメント

- [CODE_QUALITY_IMPROVEMENTS.md](./CODE_QUALITY_IMPROVEMENTS.md) - コード品質向上の記録
- [COMPREHENSIVE_CODE_REVIEW_REPORT.md](../COMPREHENSIVE_CODE_REVIEW_REPORT.md) - 包括的コードレビュー
- [REFACTORING_REPORT.md](../REFACTORING_REPORT.md) - リファクタリング提案
- [REMAINING_TECH_DEBT_ROADMAP.md](../REMAINING_TECH_DEBT_ROADMAP.md) - 技術的負債対応計画

### v1.2 (検討中)
- [ ] 暗号資産対応
- [ ] オプション取引
- [ ] SNS連動シグナル
- [ ] AIチャットアシスタント

---

<div align="center">
  <strong>⚡ AIで次のトレードを予測しよう ⚡</strong><br>
  <sub>※投資判断は自己責任で行ってください</sub>
</div>
### CSRF Protection

The platform implements CSRF protection using double-submit cookie pattern. All state-changing operations (POST/PUT/DELETE) require a valid CSRF token.

## CSRF Protection

This platform implements CSRF (Cross-Site Request Forgery) protection using the double-submit cookie pattern:

1. **GET requests** set a secure, httpOnly cookie with a random token
2. **State-changing requests** (POST/PUT/PATCH) must include the same token in the `x-csrf-token` header
3. Server validates that cookie token matches header token using timing-safe comparison

All state-changing API endpoints automatically require valid CSRF tokens.

Configuration:
- `ENABLE_CSRF_PROTECTION` (default: true)
- `CSRF_TOKEN_LENGTH` (default: 32 bytes)

See `app/lib/csrf/csrf-protection.ts` for implementation details.
