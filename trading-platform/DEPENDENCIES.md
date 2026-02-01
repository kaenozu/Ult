# 依存関係について

このファイルは Trading Platform の依存関係（dependencies）について簡易的に説明します。

詳細なドキュメントは **[ルートディレクトリの DEPENDENCIES.md](../DEPENDENCIES.md)** を参照してください。

## クイックリファレンス

### 主要な Production Dependencies

| パッケージ | 目的 |
|-----------|------|
| `next` | React フレームワーク（SSR、ルーティング） |
| `react` / `react-dom` | UI ライブラリ |
| `chart.js` / `react-chartjs-2` | 株価チャート描画 |
| `zustand` | 状態管理 |
| `yahoo-finance2` | 株価データ取得 |
| `jsonwebtoken` | JWT 認証 |
| `dompurify` | XSS 対策 |
| `tailwind-merge` / `clsx` | CSS 管理 |
| `lucide-react` | アイコン |
| `sonner` | トースト通知 |

### 主要な Development Dependencies

| カテゴリ | パッケージ |
|---------|----------|
| **テスト** | `jest`, `@playwright/test`, `@testing-library/react` |
| **型安全性** | `typescript`, `@types/*` |
| **コード品質** | `eslint`, `eslint-config-next` |
| **Git Hooks** | `husky`, `lint-staged` |
| **スタイル** | `tailwindcss`, `postcss` |

## よくある質問

### なぜこのパッケージを使っているの？

詳細は [DEPENDENCIES.md](../DEPENDENCIES.md) の各パッケージの説明を参照してください。

### 依存関係を追加したい

1. 既存パッケージで代用できないか確認
2. セキュリティとメンテナンス状況をチェック
3. Bundle サイズへの影響を評価
4. [DEPENDENCIES.md](../DEPENDENCIES.md) に追加して PR を作成

### セキュリティチェック

```bash
npm audit
npm audit fix
```

## 参考リンク

- **[詳細ドキュメント](../DEPENDENCIES.md)** - 全依存関係の詳細説明
- **[依存関係管理スキル](../.github/skills/dependency-management.md)** - 管理手順
- **[貢献ガイド](../CONTRIBUTING.md)** - 開発環境セットアップ
