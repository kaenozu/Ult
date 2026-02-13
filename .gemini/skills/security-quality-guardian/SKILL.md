---
name: security-quality-guardian
description: Enforce security standards and unified error handling patterns. Use when modifying authentication logic, setting HTTP headers, or implementing new error handling.
---

# Security & Quality Guardian

このスキルは、ULT Trading Platformにおけるセキュリティ基準とコード品質の維持を目的としています。

## 🛡️ セキュリティ・ガードレール

### 1. JWT設定
- **JWT_SECRET**: 最小32文字。
- **実装要件**: `app/lib/auth.ts` の `verifyAuthToken` および `generateAuthToken` では、32文字未満の場合に必ず `Error` を投げること。単なるログ出力や `null` 返却は禁止。
- **検証**: 開発・テスト・本番の全環境で強制。

### 2. HTTP セキュリティヘッダー
- **X-Frame-Options**: `DENY` を必須とする（クリックジャッキング対策）。
- **CSP**: `default-src 'self'` を基本とし、インラインスクリプトを最小限に抑える。
- **Strict-Transport-Security**: 本番環境では必須。

## 🏗️ 統一エラーハンドリング

エラーを投げる際は、`@/app/lib/errors` から適切なサブクラスを使用すること。

### 推奨されるエラークラス
- `ApiError`: 外部APIや内部APIのエラー。HTTPステータスコードを保持。
- `ValidationError`: 入力バリデーション失敗。
- `AuthError`: 認証・認可の失敗。
- `TradingError`: 取引ロジック、注文、リスク管理のエラー。
- `SystemError`: 設定不備やシステムリソースの問題。

詳細な実装パターンは [references/error-patterns.md](references/error-patterns.md) を参照。

## 🧪 検証ワークフロー (TDD)
1. 変更前に、セキュリティ要件を検証するテストを追加する。
2. テストが失敗（RED）することを確認する。
3. 要件を満たす実装を行い、テストを成功（GREEN）させる。
