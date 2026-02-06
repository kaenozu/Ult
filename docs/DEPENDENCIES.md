# 依存関係ドキュメント

このドキュメントでは、ULT Trading Platform プロジェクトで使用している全ての依存関係（dependencies）とその目的を説明します。

## 📋 目次

- [ルートプロジェクト](#ルートプロジェクト)
- [Trading Platform](#trading-platform)
  - [Production Dependencies](#production-dependencies)
  - [Development Dependencies](#development-dependencies)
- [依存関係の管理](#依存関係の管理)

---

## ルートプロジェクト

### Production Dependencies

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `ws` | ^8.19.0 | WebSocket サーバー実装。リアルタイムデータ通信に使用 |

**説明**: ルートプロジェクトは主に開発ツールとWebSocketサーバーのためのシンプルな構成です。

---

## Trading Platform

Trading Platform は Next.js ベースのフロントエンドアプリケーションで、多くの依存関係を持っています。

### Production Dependencies

本番環境で必要な依存関係です。これらはアプリケーションの実行に不可欠です。

#### 🎨 UI フレームワーク & コンポーネント

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `next` | ^16.1.6 | React フレームワーク。SSR、ルーティング、最適化機能を提供 |
| `react` | 19.2.3 | UI コンポーネントライブラリ（コア） |
| `react-dom` | 19.2.3 | React の DOM レンダリング機能 |

**理由**: Next.js 16 は最新の App Router、Server Components、画像最適化などモダンな機能を提供します。React 19 は最新のパフォーマンス改善を含みます。

#### 📊 チャート & データ可視化

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `chart.js` | ^4.5.1 | チャートライブラリ（コア）。株価チャート描画の基盤 |
| `react-chartjs-2` | ^5.3.1 | Chart.js の React ラッパー。React で Chart.js を簡単に使用 |

**理由**: Chart.js は軽量で高性能なチャートライブラリです。取引プラットフォームの株価チャート、テクニカル指標表示に使用します。

#### 🎯 状態管理 & データフェッチ

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `zustand` | ^5.0.10 | 軽量な状態管理ライブラリ。グローバルステート管理に使用 |
| `yahoo-finance2` | ^3.11.2 | Yahoo Finance API クライアント。株価データの取得 |

**理由**: Zustand は Redux よりシンプルで、ボイラープレートが少ないです。Yahoo Finance は無料で信頼性の高い株価データソースです。

#### 🔐 セキュリティ & 認証

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `jsonwebtoken` | ^9.0.3 | JWT トークンの生成と検証。ユーザー認証に使用 |
| `dompurify` | ^3.3.1 | XSS 攻撃防止。HTML サニタイゼーション |

**理由**: JWT は stateless な認証方式で、スケーラブルです。DOMPurify はユーザー入力を安全に表示するために必須です。

#### 🎨 スタイリング & UI ユーティリティ

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `clsx` | ^2.1.1 | クラス名の条件付き結合。動的 CSS クラス管理 |
| `tailwind-merge` | ^3.4.0 | Tailwind CSS クラスのマージ。クラス競合の解決 |
| `lucide-react` | ^0.562.0 | アイコンライブラリ。モダンで軽量な SVG アイコン |
| `sonner` | ^2.0.7 | トースト通知ライブラリ。ユーザーへのフィードバック表示 |

**理由**: 
- `clsx` と `tailwind-merge` は Tailwind CSS の効率的な使用に不可欠
- `lucide-react` は軽量で、Tree-shaking に対応した高品質アイコン
- `sonner` はアクセシブルで使いやすいトースト通知

---

### Development Dependencies

開発時のみ必要な依存関係です。本番ビルドには含まれません。

#### 🧪 テスト

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `jest` | ^30.2.0 | JavaScript テストフレームワーク。ユニットテスト実行 |
| `jest-environment-jsdom` | ^30.2.0 | Jest の DOM 環境。React コンポーネントテスト用 |
| `@testing-library/react` | ^16.3.2 | React コンポーネントのテストユーティリティ |
| `@testing-library/jest-dom` | ^6.9.1 | Jest の DOM マッチャー拡張 |
| `@testing-library/dom` | ^10.4.1 | DOM テストユーティリティ（コア） |
| `@playwright/test` | ^1.48.0 | E2E テストフレームワーク。ブラウザ自動化テスト |
| `fast-check` | ^4.5.3 | プロパティベーステスト。ランダムデータでのテスト |
| `@fast-check/jest` | ^1.8.2 | fast-check の Jest 統合 |

**理由**: 
- Jest は標準的なテストフレームワークで、高速かつ機能豊富
- Testing Library は React の推奨テストツール
- Playwright は信頼性の高い E2E テストを実現
- fast-check はエッジケースの発見に有効

#### 🔍 コード品質 & Lint

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `eslint` | ^9 | JavaScript/TypeScript リンター。コード品質維持 |
| `eslint-config-next` | 16.1.4 | Next.js 公式 ESLint 設定 |
| `husky` | ^9.1.6 | Git hooks 管理。コミット前の自動チェック |
| `lint-staged` | ^15.2.10 | ステージされたファイルのみを Lint。高速化 |

**理由**: 
- ESLint はコーディング規約を強制し、バグを早期発見
- Next.js 公式設定で最適なルールセット
- Husky + lint-staged で品質を自動的に保証

#### 📦 ビルド & スタイル

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `typescript` | ^5 | TypeScript コンパイラ。型安全性を提供 |
| `tailwindcss` | ^4.1.18 | ユーティリティファースト CSS フレームワーク |
| `@tailwindcss/postcss` | ^4.1.18 | Tailwind CSS の PostCSS プラグイン |
| `postcss` | ^8.5.6 | CSS 変換ツール。Tailwind CSS の処理に必要 |

**理由**: 
- TypeScript は大規模アプリケーションの保守性を向上
- Tailwind CSS は高速で一貫性のあるスタイリング
- PostCSS は CSS の最適化と変換

#### 🔧 型定義

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `@types/node` | ^20 | Node.js API の型定義 |
| `@types/react` | ^19 | React の型定義 |
| `@types/react-dom` | ^19 | React DOM の型定義 |
| `@types/jest` | ^30.0.0 | Jest の型定義 |
| `@types/jsonwebtoken` | ^9.0.10 | jsonwebtoken の型定義 |
| `@types/dompurify` | ^3.0.5 | DOMPurify の型定義 |
| `@types/ws` | ^8.18.1 | WebSocket (ws) の型定義 |

**理由**: TypeScript で外部ライブラリを型安全に使用するために必要です。

#### 🔌 その他開発ツール

| パッケージ | バージョン | 目的 |
|-----------|----------|------|
| `ws` | ^8.19.0 | WebSocket 開発サーバー用（devDependencies） |

**理由**: 開発時の WebSocket テストサーバーとして使用します。

---

## 依存関係の管理

### バージョン管理戦略

- **Production dependencies**: 安定版のみを使用。`^` でマイナーアップデートを許可
- **Development dependencies**: 最新版を積極的に採用。開発効率向上のため

### セキュリティ

```bash
# 定期的な脆弱性チェック
npm audit

# 自動修正
npm audit fix
```

### 更新手順

```bash
# 古いパッケージの確認
npm outdated

# 安全な更新
npm update

# メジャーバージョン更新（慎重に）
npm install <package>@latest
```

### 関連ドキュメント

- [依存関係管理スキル](./.github/skills/dependency-management.md) - 詳細な管理手順
- [貢献ガイド](./CONTRIBUTING.md) - 開発環境セットアップ
- [セキュリティサマリー](./SECURITY_SUMMARY.md) - セキュリティ対策

---

## 📊 依存関係の統計

### Trading Platform

- **Production dependencies**: 13 パッケージ
- **Development dependencies**: 24 パッケージ
- **合計**: 37 パッケージ

### カテゴリ別内訳

| カテゴリ | パッケージ数 |
|---------|------------|
| UI フレームワーク | 3 |
| チャート・可視化 | 2 |
| 状態管理・データ | 2 |
| セキュリティ | 2 |
| スタイリング・UI | 4 |
| テスト | 8 |
| コード品質 | 4 |
| ビルド・スタイル | 4 |
| 型定義 | 7 |
| その他 | 1 |

---

## 💡 よくある質問

### Q: なぜ React 19 を使用しているのですか？

A: React 19 は最新の Server Components、改善された並行レンダリング、より良いパフォーマンスを提供します。Next.js 16 との互換性も最適化されています。

### Q: なぜ Zustand を選んだのですか？Redux ではなく？

A: Zustand は Redux よりシンプルで、ボイラープレートが少なく、Bundle サイズも小さいです。小〜中規模アプリケーションに最適です。

### Q: Chart.js の代わりに他のチャートライブラリは検討しましたか？

A: はい。Recharts、Victory、D3.js も検討しましたが、Chart.js が最もパフォーマンスが良く、ドキュメントも充実しているため採用しました。

### Q: 依存関係を追加したい場合、どうすればよいですか？

A: 以下の手順に従ってください：
1. 既存の依存関係で代用できないか検討
2. パッケージのセキュリティとメンテナンス状況を確認
3. Bundle サイズへの影響を評価
4. このドキュメントに追加理由を記載
5. Pull Request を作成

---

**最終更新**: 2026-02-01  
**メンテナー**: kaenozu  
**ライセンス**: MIT
