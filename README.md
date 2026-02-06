# 📈 ULT - Ultimate Trading Platform

[![CI](https://github.com/kaenozu/Ult/actions/workflows/ci.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/ci.yml)
[![Quality Gates](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/quality-gates.yml)
[![Security](https://github.com/kaenozu/Ult/actions/workflows/security.yml/badge.svg)](https://github.com/kaenozu/Ult/actions/workflows/security.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ULT (Ultimate Trading Platform)** は、AI予測とテクニカル分析を組み合わせた株式取引支援プラットフォームです。

---

## 🎯 主要機能

- **🤖 AI予測エンジン**: TensorFlow.jsによる価格予測
- **📊 テクニカル分析**: RSI、SMA、MACD、ボリンジャーバンド、ATR
- **🎯 シグナル生成**: BUY/SELL/HOLDシグナル
- **💼 ポートフォリオ管理**: リアルタイム損益追跡
- **🧪 バックテスト**: 戦略の過去データ検証
- **📱 モダンUI**: ダークテーマ対応

---

## 🚀 クイックスタート

### 前提条件

- **Node.js** 18.0+
- **npm** 9.0+

### インストール

```bash
# クローン
git clone https://github.com/kaenozu/Ult.git
cd Ult/trading-platform

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して ALPHA_VANTAGE_API_KEY を設定

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く。

---

## 📁 プロジェクト構成

```
Ult/
├── trading-platform/     # フロントエンド（Next.js 16 + React 19）
│   ├── app/              # Next.js App Router
│   │   ├── components/   # Reactコンポーネント
│   │   ├── lib/          # ビジネスロジック
│   │   ├── store/        # Zustand状態管理
│   │   └── types/        # TypeScript型定義
│   └── e2e/              # Playwright E2Eテスト
│
├── backend/              # Pythonバックエンド（開発中）
│   └── src/
│       ├── market_correlation/  # 市場相関分析
│       ├── supply_demand/       # 需給分析
│       └── trade_journal_analyzer/  # 取引ジャーナル
│
├── db/                   # データベーススキーマ
├── docs/                 # ドキュメント
├── scripts/              # ユーティリティ
└── skills/               # AIエージェントスキル
```

---

## 🔧 開発コマンド

```bash
cd trading-platform

# 開発
npm run dev              # 開発サーバー
npm run build            # ビルド
npm run start            # 本番サーバー

# 品質チェック
npx tsc --noEmit         # 型チェック
npm run lint             # ESLint
npm run lint:fix         # 自動修正

# テスト
npm test                 # Jestテスト
npm run test:coverage    # カバレッジ付き
npm run test:e2e         # Playwright E2E

# 品質ゲート（全チェック）
./scripts/quality-gates-check.sh
```

---

## 🏗️ 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 16, React 19 |
| 言語 | TypeScript 5.9 |
| 状態管理 | Zustand 5 |
| チャート | Chart.js, react-chartjs-2 |
| ML | TensorFlow.js 4.22 |
| テスト | Jest 30, Playwright |
| スタイル | Tailwind CSS 4 |

---

## 📊 CI/CD

GitHub Actionsによる包括的なパイプライン：

| ワークフロー | 説明 |
|--------------|------|
| ci.yml | CI統合 |
| quality-gates.yml | 品質ゲート（カバレッジ80%+, 型, Lint, セキュリティ） |
| security.yml | 脆弱性スキャン |
| backend.yml | Pythonバックエンドテスト |
| db-validation.yml | DBスキーマ検証 |
| monkey-test.yml | ランダム操作テスト |

### 品質基準

- ✅ テストカバレッジ ≥ 80%
- ✅ TypeScript エラー = 0
- ✅ ESLint エラー = 0
- ✅ High/Critical 脆弱性 = 0

---

## 📚 ドキュメント

### ルートレベル
- [README.md](README.md) - このファイル
- [ROADMAP.md](ROADMAP.md) - ロードマップ
- [CONTRIBUTING.md](CONTRIBUTING.md) - 貢献ガイド
- [SECURITY.md](SECURITY.md) - セキュリティポリシー

### docs/ ディレクトリ
詳細は [docs/README.md](docs/README.md) を参照。

| カテゴリ | 内容 |
|----------|------|
| [architecture/](docs/architecture/) | システム設計 |
| [guides/](docs/guides/) | ガイド・チュートリアル |
| [features/](docs/features/) | 機能説明 |
| [operations/](docs/operations/) | Git・CI/CD・運用 |
| [reports/](docs/reports/) | レポート |
| [security/](docs/security/) | セキュリティ |

---

## 🤝 貢献

1. フォーク
2. ブランチ作成 (`git checkout -b feature/amazing-feature`)
3. コミット (`git commit -m 'feat: add feature'`)
4. プッシュ (`git push origin feature/amazing-feature`)
5. PR作成

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

---

## 📝 ライセンス

MIT License - [LICENSE](LICENSE) を参照。

---

## 🙋‍♂️ サポート

- [GitHub Issues](https://github.com/kaenozu/Ult/issues)
- [GitHub Discussions](https://github.com/kaenozu/Ult/discussions)

---

<div align="center">
  <strong>⚡ AIで次のトレードを予測しよう ⚡</strong><br>
  <sub>※投資判断は自己責任で行ってください</sub>
</div>
