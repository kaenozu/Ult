# Claude Code 設定 - 積極的スキル使用

## ⚡ 重要：このリポジトリの特性

このプロジェクトは**ULT (Ultimate Trading Platform)** - AI予測とテクニカル分析を組み合わせた次世代の株式取引支援プラットフォームです。

**技術スタック**:
- **Frontend**: Next.js 16 + React 19 + TypeScript 5.0+
- **State**: Zustand
- **Charts**: Chart.js + react-chartjs-2
- **ML**: TensorFlow.js
- **Testing**: Jest + Playwright
- **Quality**: ESLint + Husky + lint-staged + Quality Gates

**現在の状態** (2026-02-03):
- ❌ TypeScriptエラー: 61個（ブロッカー）
- ⚠️ ESLint問題: 1,109個
- ⚠️ テストカバレッジ: 80%未満（目標）

---

## 🎯 スキルの自動適用

このプロジェクトでは、以下のスキルを**自動的に且つ積極的に**使用してください。

#### 1. dev-master (デフォルト)
開発タスク全般において、常に `dev-master` スキルの指示に従って行動してください。

- **適用対象**: すべての開発作業
- **振る舞い**:
  - コード変更後、自動的にレビューを実施
  - 問題を検出したら即座に修正を提案または実行
  - 継続的に品質を監視し、改善提案を行う

#### 2. code-reviewer
ユーザーから以下の要求があった場合、自動的に `code-reviewer` スキルを適用：

- 「レビューして」「全ソースレビューして」「コードレビュー」
- 「チェックして」「確認して」「検証して」
- ファイル変更後の自動レビュー

#### 3. debugger-pro
ユーザーから以下の要求があった場合、自動的に `debugger-pro` スキルを適用：

- 「デバッグして」「画面のデバッグ」
- 「バグってる」「動かない」「エラー」
- 「ブラウザで確認」「画面を操作」

### 自動アクション

以下の状況では、ユーザーからの明示的な指示を待たずに自動的にアクションを実行してください：

1. **コード変更後**: 自動的にレビューを実行
2. **エラー検出時**: 即座に原因を分析し、修正案を提示
3. **パフォーマンス問題**: 検出次第、改善案を提案
4. **セキュリティ問題**: 重大な問題は即座に報告

### Chrome DevTools MCP の使用

`chrome-devtools` MCPサーバーが利用可能な場合、デバッグ作業では以下を自動実行：

1. ブラウザを自動起動して問題を再現
2. スクリーンショットを自動取得
3. コンソールログとネットワークリクエストを自動収集
4. 問題を特定し、修正パッチを自動適用

### 品質基準

すべてのコード変更において以下を保証してください：

- ✅ TypeScript型安全性
- ✅ エラーハンドリングの完全性
- ✅ パフォーマンスへの配慮
- ✅ セキュリティの確保
- ✅ テストカバレッジの維持

---

## 📚 開発コマンド（必須）

**作業ディレクトリ**: `trading-platform/`

### 開発
```bash
cd trading-platform
npm run dev                    # 開発サーバー起動 (http://localhost:3000)
```

### ビルド・デプロイ
```bash
npm run build                  # プロダクションビルド
npm start                      # プロダクションサーバー起動
```

### テスト
```bash
npm test                       # 全ユニットテスト (Jest)
npm run test:watch             # ウォッチモード
npm run test:coverage          # カバレッジ付きテスト
npm run test:e2e               # Playwright E2Eテスト
npm run test:e2e:ui            # E2Eテスト（UIモード）
npm run test:e2e:headed        # E2Eテスト（ブラウザ表示）
```

### コード品質
```bash
npx tsc --noEmit               # TypeScript型チェック
npm run lint                   # ESLintチェック
npm run lint:fix               # 自動修正可能な問題
npm audit                      # セキュリティ監査
npm audit fix                  # 脆弱性自動修正
```

### インフラ
```bash
# ルートで実行
npm run ws:server              # WebSocketサーバー起動
cd trading-platform && npm run db:migrate:status  # マイグレーション状態
```

### 品質ゲート（PR前の事前チェック）
```bash
./scripts/quality-gates-check.sh
```

このスクリプトで以下を検証：
- ✅ テストカバレッジ ≥ 80%
- ✅ TypeScript: 0エラー
- ✅ ESLint: 0エラー
- ✅ セキュリティ: 高/重大脆弱性0
- ✅ ビルド成功

---

## 🏗️ アーキテクチャ概要

### ディレクトリ構成

```
trading-platform/
├── app/                          # Next.js App Router
│   ├── components/              # React UIコンポーネント
│   ├── lib/                     # ビジネスロジック・サービス
│   │   ├── api/                 # APIクライアント・ルート
│   │   ├── backtest/            # バックテストエンジン
│   │   ├── ml/                  # 機械学習モデル
│   │   ├── risk/                # リスク管理
│   │   ├── technicalAnalysis/   # テクニカル指標
│   │   └── websocket/           # リアルタイムデータ
│   ├── store/                   # Zustand状態管理
│   ├── types/                   # TypeScript型定義
│   └── __tests__/               # ユニットテスト
├── public/                      # 静的アセット
├── e2e/                         # Playwright E2Eテスト
└── scripts/                     # ビルド・ユーティリティ
```

### コアサービスアーキテクチャ

**Service Layer Pattern**: ほとんどのビジネスロジックは `app/lib/` にシングルトンサービスとして存在：

- `MarketDataService` - データ取得・キャッシュ管理
- `TechnicalIndicatorService` - RSI, SMA, MACD 等計算
- `ConsensusSignalService` - シグナル生成（BUY/SELL/HOLD）
- `BacktestService` - 戦略バックテスト
- `MLPredictionService` - AI/ML予測（アンサンブル学習）
- `RiskManagementService` - ポジションサイジング・リスク管理
- `PerformanceScreenerService` - O(N)最適化エンジン
- `WebSocketService` - リアルタイム更新

**設計原則**:
- サービスは基本的に不変シングルトン
- サービスは下位レベルのUtilityに依存、他のサービスには依存しない
- ドメインロジックは `lib/` 下の機能フォルダーに分離

### データフロー

1. **Market Data** → `MarketDataService` → Cache (IndexedDB) → UI
2. **Indicators** → `TechnicalIndicatorService` → 計算 → Chart
3. **Signals** → `ConsensusSignalService` → ML + Technical → 売買シグナル
4. **Backtest** → `BacktestService` → ヒストリカルデータ → P&Lシミュレーション
5. **WebSocket** → `WebSocketService` → リアルタイム更新

---

## 🧪 テスト戦略

### カバレッジ要件
- **80%以上**（lines, branches, functions, statements）
- `jest.config.js` と Quality Gates で強制

### テスト配置
- ユニットテスト: `__tests__/` または `*.test.ts`（同じディレクトリ）
- テストユーティリティ: `app/lib/__tests__/test-utils.ts`
- E2Eテスト: `e2e/*.spec.ts`

### 個別テスト実行
```bash
npm test -- MarketDataService.test.ts    # 単一テストファイル
npm test -- -t "テスト名パターン"         # 名前でフィルタ
npm run test:watch                      # ウォッチモード
```

---

## 📝 コーディング規約

### TypeScript
- **Strictモード**: `tsconfig.json` で `"strict": true`
- **`any`禁止**: `unknown` または具体的な型を使用
- **パスエイリアス**: `@/*` でプロジェクトルートを参照

### ESLint
- `eslint-config-next` ベース
- 未使用変数、`any`型、セマンティック問題を検出
- 自動修正可能: `npm run lint:fix`

### Git Hooks
- **pre-commit**: lint-staged（eslint + 関連テスト実行）
- `.husky/` と `package.json` で設定

### コミットメッセージ
Conventional Commits:
- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント更新
- `style:` フォーマット（機能変更なし）
- `refactor:` リファクタリング
- `test:` テスト追加
- `chore:` ビルド・ツール変更

---

## 🔒 セキュリティ対策

- **APIキー**: `.env.local` は絶対にコミットしない（.gitignore済み）
- **XSS対策**: `dompurify` でHTMLサニタイズ
- **認証**: `jsonwebbtoken` 使用
- **CSRF**: APIルートにCSRF保護
- **シークレット**: 環境変数のみ使用

---

## 📦 主要依存関係

### コアライブラリ
- `next@^16.1.6` - Reactフレームワーク
- `react@19.2.3` - UIライブラリ
- `zustand@^5.0.10` - 状態管理
- `chart.js@^4.5.1` - チャート描画
- `@tensorflow/tfjs@4.22.0` - ML推論

### 開発ツール
- `typescript@5.9.3`
- `eslint@^9` + `eslint-config-next`
- `jest@^30` + `@testing-library/*`
- `@playwright/test@^1.48`

詳細は `DEPENDENCIES.md` 参照。

---

## 🔄 CI/CDパイプライン

全PRがQuality Gatesワークフローをトリガー：

1. **Test** (Jest) カバレッジ ≥ 80%
2. **TypeScript** 型チェック（0エラー）
3. **ESLint** （0エラー）
4. **Security Audit** （高/重大脆弱性0）
5. **Build** （プロダクションビルド検証）
6. **E2E** （Playwright）
7. **Security** （GitHub Advanced Security）

ローカル事前チェック: `./scripts/quality-gates-check.sh`

---

## 🎯 現在の状態と優先事項

### 既知の問題 (2026-02-03)
- ❌ **TypeScriptエラー 61個**：
  - `app/api/sentiment/route.ts` （構文エラー）
  - `app/lib/__tests__/test-utils.ts` （不正なテストコード）
  - `app/lib/aiAnalytics/AnomalyDetection/AlertManager.ts` （カンマ/セミコロン問題）
- ⚠️ **ESLint警告 1,109個**（未使用変数、`any`型）
- ⚠️ テストカバレッジ: 目標80%未達

### 優先対応
1. TypeScriptの構文エラー修正（ブロッカー）
2. 不正なテストファイルのクリーンアップ
3. 未使用変数の削除
4. 新規コードでの `any` 型の撲滅
5. 80%カバレッジ達成のためテスト追加

---

## 📚 重要ドキュメント

- `README.md` - プロジェクト概要・クイックスタート
- `ROADMAP.md` - ロードマップ・マイルストーン
- `DEPENDENCIES.md` - 依存関係の説明
- `SECURITY.md` - セキュリティポリシー
- `CONTRIBUTING.md` - 開発ワークフロー
- `.github/issues/*.md` - 課題・技術的負債トラッキング

---

## 🎓 アーキテクチャパターン

### サービス設計
```typescript
// サービスパターン例
class MyService {
  private static instance: MyService;
  private constructor() {}

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }

  public doWork(input: InputType): OutputType {
    // コアロジックは純粋関数、副作用なし
    return this.calculate(input);
  }
}

export const myService = MyService.getInstance();
```

### 状態管理
- Zustandストアは `app/store/` に配置
- コンポーネントで `useStore()` 購読
- 細かいストアを維持（ドメインごとに1つ）

### APIルート
- App Router: `app/api/` にハンドラー配置
- `NextRequest`/`NextResponse` 型を使用
- 常に構造化されたレスポンスでエラー処理

---

## ⚡ クイックヒント

1. **ホットリロード**: Next.js開発サーバーは変更自動検知
2. **環境変数**: サーバー側コードのみ `process.env.*` アクセス可能
3. **DB**: IndexedDB via `app/lib/api/idb.ts`
4. **ログ**: `console.error` でエラー出力、本番はSentry
5. **パフォーマンス**: `PERFORMANCE_README.md` でO(N)最適化パターン参照

---

## 🚨 トラブルシューティング

### ポート3000が使用中
```bash
# ポート3000のプロセスを強制終了
lsof -ti:3000 | xargs kill -9  # macOS/Linux
# 別ポート使用
PORT=3001 npm run dev
```

### TypeScriptエラー後
```bash
npx tsc --noEmit  # 特定エラー確認
npm run lint:fix  # 自動修正可能な問題
```

### WebSocket接続失敗
```bash
# 別ターミナルでWebSocketサーバー起動
npm run ws:server:dev
# 接続確認: ws://localhost:3001
```

### テストタイムアウト
- E2E: `playwright.config.ts` でタイムアウト延長
- ユニット: 非同期操作に適切なクリーンアップがあるか確認

---

## 🔗 リポジトリリンク

- Issues: https://github.com/kaenozu/Ult/issues
- CI/CD: `.github/workflows/`
- Quality Gates: `scripts/quality-gates-check.sh`
- Backend: `/backend` （Python、開発中）

---

**最終更新**: 2026-02-03
**ベース**: README.md, DEPENDENCIES.md, ワークフロー設定, tsconfig.json

