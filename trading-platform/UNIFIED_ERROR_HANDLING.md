# 統一エラーハンドリング実装ガイド

## 概要

このドキュメントは、Issue #207 「エラーハンドリングとメッセージ処理の統一」の実装結果をまとめたものです。

## 問題

エラーハンドリングのパターンが統一されておらず、コードが重複していました:

1. **重複するlogError実装**
   - `app/lib/errors.ts` に実装A
   - `app/lib/error-handler.ts` に実装B（重複）

2. **重複するメッセージ生成関数**
   - `getUserErrorMessage()` in `errors.ts`
   - `getUserFriendlyMessage()` in `errorHandler.ts` - 単にgetUserErrorMessageを呼ぶだけ

3. **不明確な役割分担**
   - 3つのファイルの責任範囲が明確でない

## 解決策

### アーキテクチャの明確化

```
┌─────────────────────────────────────────────────────────┐
│                   app/lib/errors.ts                     │
│              コアエラーシステム (統一実装)                │
│                                                         │
│  • すべてのエラークラス定義                               │
│  • getUserErrorMessage() - ユーザー向けメッセージ         │
│  • logError() - 統一ロギング                            │
│  • handleError(), withErrorHandling() - ラッパー         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ imports
              ┌───────────┴───────────┐
              │                       │
┌─────────────┴──────────┐  ┌────────┴────────────────┐
│ error-handler.ts       │  │ errorHandler.ts         │
│ (API Routes専用)        │  │ (リカバリーサービス)      │
│                        │  │                         │
│ • handleApiError()     │  │ • ErrorHandler class    │
│ • NextResponse生成      │  │ • リカバリー戦略         │
│ • logError() - 委譲    │  │ • エラー監視/統計        │
│   @deprecated          │  │ • getUserFriendlyMessage│
│                        │  │   @deprecated           │
└────────────────────────┘  └─────────────────────────┘
```

### 実装の詳細

#### 1. errors.ts - コアエラーシステム

**役割**: すべてのエラー処理の中心

```typescript
// エラークラス階層
TradingError (基底クラス)
  ├─ AppError
  ├─ ApiError
  │   ├─ NetworkError
  │   ├─ RateLimitError
  │   └─ AuthenticationError
  ├─ ValidationError
  ├─ DataError
  │   └─ NotFoundError
  ├─ OrderError
  ├─ RiskManagementError
  ├─ TimeoutError
  └─ SystemError

// 統一ユーティリティ
export function getUserErrorMessage(error: unknown): string
export function logError(error: unknown, context: string): void
export function handleError(error: unknown, context?: string): TradingError
export async function withErrorHandling<T>(...): Promise<WithErrorHandlingResult<T>>
```

#### 2. error-handler.ts - Next.js API Routes専用

**役割**: HTTPレスポンス生成に特化

```typescript
// メイン関数
export function handleApiError(
  error: unknown,
  context: string,
  statusCode?: number
): NextResponse<ErrorResponse>

// ショートカット
export function validationError(message: string, field?: string)
export function notFoundError(message?: string)
export function rateLimitError(message?: string)
export function internalError(message?: string)

// @deprecated - v2.0.0で削除予定
export function logError(error: unknown, context: string)
```

#### 3. errorHandler.ts - エラーリカバリーサービス

**役割**: 高度なエラー処理とリカバリー

```typescript
export class ErrorHandler {
  // リカバリー戦略の決定
  handleError(error: TradingError, context?: ErrorContext): ErrorRecovery
  
  // エラー監視とレポート（Sentry連携準備済み）
  async reportError(error: TradingError, context?: ErrorContext): Promise<void>
  
  // フォールバック付き実行
  async handleWithFallback(
    operation: string,
    action: () => Promise<any>,
    fallback: () => any
  ): Promise<any>
  
  // バッチ処理
  async handleBatch<T>(...): Promise<Array<...>>
  
  // @deprecated - v2.0.0で削除予定
  getUserFriendlyMessage(error: TradingError): string
}
```

## 使用例

### フロントエンド / フック

```typescript
import { getUserErrorMessage } from '@/app/lib/errors';

function useStockData() {
  const [error, setError] = useState<string | null>(null);
  
  try {
    const data = await fetchStockData();
    // ... 処理
  } catch (err) {
    const message = getUserErrorMessage(err);
    setError(message);
    toast.error(message);
  }
}
```

### API Routes

```typescript
import { handleApiError, validationError } from '@/app/lib/error-handler';

export async function GET(request: Request) {
  try {
    // パラメータ検証
    if (!params.symbol) {
      return validationError('Symbol is required', 'symbol');
    }
    
    // データ取得
    const data = await fetchMarketData(params.symbol);
    return NextResponse.json(data);
    
  } catch (error) {
    return handleApiError(error, 'market/route', 502);
  }
}
```

### サービス層（リカバリー必要時）

```typescript
import { errorHandler } from '@/app/lib/errorHandler';

async function fetchDataWithFallback(symbol: string) {
  return await errorHandler.handleWithFallback(
    'fetchMarketData',
    async () => {
      // メインの処理
      return await api.fetchLiveData(symbol);
    },
    () => {
      // フォールバック
      return getCachedData(symbol);
    }
  );
}
```

## マイグレーションガイド

### Deprecated Functions

以下の関数は v2.0.0 で削除予定です。

#### 1. errorHandler.getUserFriendlyMessage()

```typescript
// ❌ Before (削除予定)
import { errorHandler } from '@/app/lib/errorHandler';
const message = errorHandler.getUserFriendlyMessage(error);

// ✅ After (推奨)
import { getUserErrorMessage } from '@/app/lib/errors';
const message = getUserErrorMessage(error);
```

#### 2. logError() from error-handler.ts

```typescript
// ❌ Before (削除予定)
import { logError } from '@/app/lib/error-handler';
logError(error, 'context');

// ✅ After (推奨)
import { logError } from '@/app/lib/errors';
logError(error, 'context');
```

**注意**: API routesで `handleApiError()` を使用している場合は変更不要です。内部的に統一実装を使用しています。

## テスト結果

### 単体テスト
```
✅ errors.test.ts: 16/16 passed
✅ error-handler.test.ts: 17/17 passed
✅ Total: 33/33 tests passed
```

### セキュリティスキャン
```
✅ CodeQL Analysis: 0 alerts found
✅ No security vulnerabilities detected
```

### Lintチェック
```
✅ ESLint: 0 errors
⚠️ Warnings: Pre-existing warnings only (unrelated to changes)
```

## 完了基準の達成

| 基準 | 状態 | 詳細 |
|------|------|------|
| 統一エラークラス（AppError）の作成 | ✅ | 既に実装済み |
| 共通エラーハンドラーの実装 | ✅ | errors.ts に統一 |
| ユーザー向けエラーメッセージの標準化 | ✅ | getUserErrorMessage() に統一 |
| エラー監視（Sentry等）の導入検討 | ⚠️ | 準備完了（本番環境で有効化可能） |
| 全API呼び出しが統一ハンドリングを使用 | ✅ | 確認済み |

## 影響範囲

### 変更なし（後方互換性維持）
- ✅ API routes
- ✅ フロントエンドコンポーネント
- ✅ 既存のエラーハンドリングロジック

### 変更あり
- ✅ テストファイル: 現在のAPI仕様に更新
- ✅ ドキュメント: 役割を明確化
- ✅ Deprecation警告: 追加（マイグレーションガイド付き）

## 今後の計画

### Phase 2: エラー監視の有効化（推奨）

Sentryなどのエラー監視サービスを本番環境で有効化:

```typescript
// errorHandler.ts - 既に準備済み
async reportError(error: TradingError, context?: ErrorContext) {
  if (process.env.NODE_ENV === 'production') {
    // ✅ この部分を有効化
    await sentry.captureException(error, {
      tags: { context: context?.operation },
      extra: context
    });
  }
}
```

### Phase 3: Deprecated機能の削除（v2.0.0）

以下の機能を削除:
1. `errorHandler.getUserFriendlyMessage()`
2. `error-handler.ts` の `logError()` ラッパー

## 参考資料

- [Issue #207](https://github.com/kaenozu/Ult/issues/207) - エラーハンドリングとメッセージ処理の統一
- [ROADMAP.md](../ROADMAP.md) - Phase 1.6: Error handling improvements
- [CODE_REVIEW_20260201.md](./CODE_REVIEW_20260201.md) - Section 2.3: Error handling

## 質問やフィードバック

このドキュメントや実装について質問がある場合は、Issue #207 にコメントしてください。

---

**実装完了日**: 2026-02-01  
**担当者**: GitHub Copilot (@copilot)  
**レビュー**: ✅ Completed
