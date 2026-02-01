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

`.env.local` ファイルに以下の環境変数を設定：

```env
# Alpha Vantage APIキー（無料プランでOK）
# https://www.alphavantage.co/support/#api-key で取得
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Next.js設定
NEXT_PUBLIC_APP_URL=http://localhost:3000

# オプション: バックエンドAPI URL
BACKEND_API_URL=http://localhost:8000
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

現在のカバレッジ状況は、CI/CDパイプラインで自動的に確認されます。

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

### セキュリティ対策

- ✅ APIキーのサーバーサイド限定
- ✅ 入力値検証とサニタイズ
- ✅ SQLインジェクション対策
- ✅ XSS対策
- ✅ CSRFトークン
- ✅ レート制限

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

# 環境変数を設定
vercel env add ALPHA_VANTAGE_API_KEY
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
docker run -p 3000:3000 -e ALPHA_VANTAGE_API_KEY=your_key trader-pro
```

## 🔒 セキュリティベストプラクティス

### 環境変数の保護

```bash
# ✅ 正しい: サーバーサイドのみで使用
ALPHA_VANTAGE_API_KEY=your_key

# ❌ 危険: クライアントサイドに露出
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_key
```

### 鍵管理のルール

1. **コミット禁止**: `.env.local` は `.gitignore` で保護
2. **テンプレート使用**: `.env.example` を参考に設定
3. **本番環境**: プラットフォームの環境変数を使用
   - Vercel: Project Settings > Environment Variables
   - Docker: `-e` フラグまたは `--env-file`
   - Kubernetes: Secret/ConfigMap

### APIキーの検証

アプリケーションは以下を検証します：
- キーが設定されているか
- プレースホルダー値でないか
- 最小文字数（10文字以上）

```typescript
// 不安全なキーは自動的に拒否されます
const insecurePatterns = ['your_api_key_here', 'example', 'placeholder', 'xxx'];
```

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