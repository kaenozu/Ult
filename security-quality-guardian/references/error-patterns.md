# Error Handling Patterns

ULT Trading Platformでのエラーハンドリングのベストプラクティスです。

## 1. エラーの送出

```typescript
import { ApiError, ValidationError, ErrorCodes } from '@/app/lib/errors';

// APIエラー
throw new ApiError('銘柄データの取得に失敗しました', { 
  statusCode: 404, 
  endpoint: '/api/stocks/AAPL' 
});

// バリデーションエラー
throw new ValidationError('quantity', '注文数量は1以上である必要があります', { value: 0 });
```

## 2. APIルートでのハンドリング

```typescript
import { handleApiError } from '@/app/lib/errors';

export async function GET(req: NextRequest) {
  try {
    // ... logic
  } catch (error) {
    return handleApiError(error, 'GET /api/trading/orders');
  }
}
```

## 3. 型ガードの使用

```typescript
import { isApiError, isValidationError } from '@/app/lib/errors';

try {
  await doSomething();
} catch (error) {
  if (isValidationError(error)) {
    // フィールド固有の処理
    console.error(`Field ${error.field} failed: ${error.message}`);
  } else if (isApiError(error)) {
    // ステータスコードに応じた処理
    if (error.statusCode === 429) {
      // レート制限対応
    }
  }
}
```
