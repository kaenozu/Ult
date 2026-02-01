# Ult - Advanced Trading Platform

**Ult**は、AI予測と高度なテクニカル分析を統合した次世代株式取引支援プラットフォームです。日本市場と米国市場のリアルタイム分析、自動化されたWebスクレイピング、包括的なバックエンド分析ツールを提供します。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 概要

Ultは3つの主要コンポーネントで構成される包括的な取引支援エコシステムです：

1. **Trading Platform** - Next.js + Reactによる高機能トレーディングフロントエンド
2. **Backend Services** - Python製の市場分析・需給分析エンジン
3. **Playwright Scraper** - 堅牢なWebスクレイピングツール

### 主な特徴

- 🤖 **AI予測エンジン** - Random Forest + XGBoost + LSTMのアンサンブルモデル
- 📊 **リアルタイム市場分析** - 日本市場（日経225、東証）と米国市場（S&P 500、NASDAQ）対応
- 🔄 **WebSocket統合** - リアルタイムデータストリーミング
- 🛡️ **堅牢なエラーハンドリング** - リトライロジックと指数バックオフ
- 📈 **包括的なテクニカル指標** - RSI, MACD, ボリンジャーバンド、ATRなど
- 🎯 **取引ジャーナル分析** - トレード履歴の分析と最適化

---

## 📁 プロジェクト構造

```
Ult/
├── trading-platform/     # Next.js フロントエンド
│   ├── app/             # Next.js App Router
│   ├── components/      # Reactコンポーネント
│   ├── lib/            # ライブラリとユーティリティ
│   └── e2e/            # E2Eテスト (Playwright)
├── backend/            # Python バックエンドサービス
│   ├── src/
│   │   ├── market_correlation/   # 市場相関分析
│   │   ├── supply_demand/        # 需給分析
│   │   ├── trade_journal_analyzer/ # 取引分析
│   │   └── ult_universe/         # 銘柄ユニバース管理
│   └── tests/          # Pytestテストスイート
├── playwright_scraper/  # Webスクレイピングツール
│   ├── scraper.py      # メインスクレイパー実装
│   └── config/         # 設定ファイル
├── scripts/            # ユーティリティスクリプト
│   └── websocket-server.js  # WebSocketサーバー
└── docs/              # プロジェクトドキュメント
```

---

## 🚀 クイックスタート

### 前提条件

- **Node.js** 20.x以上
- **Python** 3.8以上
- **npm** または **yarn**
- **pip** または **poetry**

### 1. Trading Platform のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/kaenozu/Ult.git
cd Ult/trading-platform

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### 2. Backend Services のセットアップ

```bash
cd backend

# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# テストの実行
pytest tests/
```

### 3. Playwright Scraper のセットアップ

```bash
cd playwright_scraper

# 依存関係のインストール
pip install -r requirements.txt

# Playwrightブラウザのインストール
playwright install

# 使用例
python scraper.py --url https://example.com/data
```

### 4. WebSocketサーバーの起動

```bash
# リポジトリルートから
cd scripts
node websocket-server.js

# または trading-platform から
npm run ws:server
```

---

## 📚 ドキュメント

各コンポーネントの詳細なドキュメント：

- **[Trading Platform README](./trading-platform/README.md)** - フロントエンドの詳細、機能、使用方法
- **[Playwright Scraper README](./playwright_scraper/README.md)** - スクレイパーの設定とカスタマイズ
- **[Roadmap](./ROADMAP.md)** - プロジェクトロードマップと今後の計画
- **[Docs Directory](./docs/)** - 追加ドキュメントとガイド

---

## 🧪 テスト

### Trading Platform

```bash
cd trading-platform

# ユニットテスト
npm test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e

# E2Eテスト（UIモード）
npm run test:e2e:ui
```

### Backend

```bash
cd backend

# すべてのテストを実行
pytest

# カバレッジ付きテスト
pytest --cov=src --cov-report=html
```

---

## 🛠️ 開発

### Linting

```bash
# Trading Platform
cd trading-platform
npm run lint
npm run lint:fix

# Backend（flake8/pylintなどを使用）
cd backend
flake8 src/
```

### ビルド

```bash
# Trading Platform プロダクションビルド
cd trading-platform
npm run build
npm start
```

---

## 🎨 主要機能

### Trading Platform

- **リアルタイムチャート** - Chart.jsによる高性能チャート描画
- **AI予測シグナル** - 機械学習モデルによる価格予測
- **テクニカル指標** - 20種類以上のテクニカル指標を実装
- **マルチタイムフレーム** - 日足、週足、月足分析
- **リスク管理** - ポジションサイジング、損益計算
- **取引履歴** - 過去の取引を分析・可視化

### Backend Services

- **市場相関分析** - 日経平均・NASDAQとの相関性分析
- **需給分析** - 出来高、板情報の分析
- **取引ジャーナル** - トレード履歴の統計分析
- **銘柄ユニバース** - 監視銘柄の管理と評価

### Playwright Scraper

- **ログイン自動化** - 認証が必要なサイトに対応
- **ページネーション** - 複数ページの自動巡回
- **リトライロジック** - 指数バックオフによる堅牢性
- **データエクスポート** - JSON/CSV形式での保存
- **リクエスト制御** - 画像、CSS、JSのブロック機能

---

## 🔧 設定

### 環境変数

Trading Platformの `.env.local` ファイル例：

```env
# API設定
YAHOO_FINANCE_API_KEY=your_api_key_here
ALPHA_VANTAGE_API_KEY=your_api_key_here

# WebSocket設定
WEBSOCKET_URL=ws://localhost:3001

# データベース設定（オプション）
DATABASE_URL=postgresql://user:password@localhost:5432/ult_db
```

### カスタマイズ

各コンポーネントの詳細なカスタマイズ方法については、それぞれのREADMEを参照してください。

---

## 🤝 コントリビューション

コントリビューションを歓迎します！以下の手順でご協力ください：

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

### コーディング規約

- **TypeScript/JavaScript**: ESLintルールに従う
- **Python**: PEP 8スタイルガイドに従う
- **コミットメッセージ**: 明確で説明的なメッセージを記述
- **テスト**: 新機能には必ずテストを追加

---

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

---

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Playwright Documentation](https://playwright.dev)
- [Python Documentation](https://docs.python.org/3/)

---

## 📞 サポート

質問や問題がある場合は、[Issues](https://github.com/kaenozu/Ult/issues)で報告してください。

---

**Built with ❤️ by the Ult Team**
