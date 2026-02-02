# 🟠 HIGH: エラーメッセージの言語混在

## 問題の説明

エラーメッセージが日本語と英語で混在しており、一貫性がありません。主要なエラーハンドラーで両言語が使用されています：

```typescript
// app/lib/error-handler.ts:48-76
ERROR_MESSAGES: {
  VALIDATION_ERROR: {
    message: '入力内容を確認してください',  // 日本語
    details: '無効なパラメータが含まれています'
  },
  API_ERROR: {
    message: 'データの取得に失敗しました',  // 日本語
    details: '外部サービスとの通信でエラーが発生しました'
  },
  // ... 他も日本語
}

// 一方、一部では英語も使用
const error = new Error('Internal Server Error');  // 英語
```

## 影響範囲

- **ファイル**:
  - `app/lib/error-handler.ts:48-76` の `ERROR_MESSAGES`
  - `app/lib/errors.ts` のエラークラス
  - 各APIルートの直接エラーレスポンス
  - UIコンポーネントのエラーメッセージ
- **国際化**: `next-intl` が導入されているが、エラーメッセージは未対応
- **一貫性**: 同じエラーでも異なる言語で返却される可能性

## 問題点

1. **開発者体験劣化**: ログが言語混在で解読困難
2. **国際化の矛盾**: アプリは多言語対応（`next-intl`）だがエラーメッセージは不完全
3. **テスト不安定**: メッセージ文字列でアサートするテストが语言依存
4. **メンテナンス**: 新しいエラー追加時に言語選択が不明確

## 推奨修正

### 1. エラーメッセージを一元管理

`app/lib/messages/` ディレクトリ作成：

```
messages/
  index.ts          # ロケール選択ロジック
  ja.json          # 日本語メッセージ
  en.json          # 英語メッセージ
```

### 2. メッセージ定義ファイル

`messages/ja.json`:

```json
{
  "errors": {
    "validation": "入力内容を確認してください",
    "validation.details": "無効なパラメータが含まれています",
    "network": "ネットワークエラーが発生しました",
    "network.details": "インターネット接続を確認してください",
    "api": "データの取得に失敗しました",
    "api.details": "外部サービスとの通信でエラーが発生しました",
    "rate_limit": "リクエスト回数の上限を超えました",
    "rate_limit.details": "しばらく待ってから再度お試しください",
    "internal": "予期しないエラーが発生しました",
    "internal.details": "管理者にお問い合わせください"
  }
}
```

`messages/en.json`:

```json
{
  "errors": {
    "validation": "Please check your input",
    "validation.details": "Invalid parameters detected",
    "network": "Network error occurred",
    "network.details": "Please check your internet connection",
    // ...
  }
}
```

### 3. エラーハンドラー更新

```typescript
// app/lib/error-handler.ts
import { messages } from '@/app/lib/messages';

export function handleApiError(error: unknown, context: string): NextResponse {
  const locale = determineLocale(req); // Accept-Language or user setting
  const msg = messages[locale] || messages['ja'];

  const errorInfo = extractErrorInfo(error);
  const message = msg.errors[errorInfo.code] || msg.errors.internal;

  return NextResponse.json({
    error: message,
    code: errorInfo.code,
    // ...
  }, { status });
}
```

### 4. ログメッセージも統一

内部ログは英語統一（開発者向け）：

```typescript
// logger.ts
logger.error(`Failed to fetch market data for ${symbol}: ${error.message}`);
```

### 5. 移行戦略

- 段階的移行：まずエラーレスポンスのみ統一
- 後方互換性：古いコードは暫定サポート
- テスト更新： `ja`/`en` 両方でテスト

## 受入基準

- [ ] 全エラーレスポンスメッセージが `messages/*.json` で定義
- [ ] ログは英語統一（初期ログ.levelに応じて表示）
- [ ] ユーザー向けメッセージはロケールに応じて切替
- [ ] 全テストケースが言語非依存に更新
- [ ] 新しいエラー追加時は両言語に定義

## 関連ファイル

- `app/lib/error-handler.ts:48-76`
- `app/lib/errors.ts:全体`
- `app/api/**/route.ts`（全APIルート）
- `app/components/**/*.tsx`（UIエラーメッセージ）

## 優先度

**P1 - High**: 国際化と開発者体験の核心的問題

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
