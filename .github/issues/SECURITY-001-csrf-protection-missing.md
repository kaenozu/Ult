# 🔴 CRITICAL: CSRF対策未実装

## 問題の説明

プロジェクト全体でCSRF（Cross-Site Request Forgery）対策が実装されていません。`docs/improvement-proposals.md:1000` に「CSRF対策 未実装」と明記されています。

## 影響範囲

- **リスクレベル**: 中〜高
- **攻撃ベクトル**: 認証済みユーザーが悪意あるサイト経由で意図しない操作を実行される可能性
- **現在の状態**:
  - JWTトークン認証を使用しているため、トークン盗難が必要
  - 但还是完全なCSRF対策が必要

##  Required Remediation

### 1. CSRFトークン実装

`next-csrf` または `csrf` ライブラリを導入：

```bash
npm install csrf
```

### 2. ミドルウェア作成

`app/lib/api-middleware.ts` にCSRFミドルウェアを追加：

```typescript
import { randomBytes } from 'crypto';

export function csrfProtection(req: NextRequest): NextResponse | null {
  // GETリクエストはCSRFトークンを生成・返却
  // POST/PUT/DELETEはトークンを検証
}
```

### 3. 全POSTルートに適用

- `app/api/trading/route.ts:227` (POST)
- その他の全POST/PUT/DELETEエンドポイント

### 4. フロントエンドでのトークン送信

`fetch` ラッパーにCSRFトークン自動追加機能を実装。

## 代替案（軽量）

- SameSite Cookie 設定: `SameSite=Strict` または `Lax`
- カスタムヘッダー: `X-Requested-With: XMLHttpRequest`
- Double Submit Cookie パターン

## 受入基準

- [ ] CSRFトークンが全変更操作で必須化
- [ ] トークンはランダムでセッションごとに異なる
- [ ] 自動テストでCSRF攻撃シナリオをカバー
- [ ] ドキュメントにCSRF対策說明を追加

## 関連ファイル

- `docs/improvement-proposals.md:1000`
- `app/api/trading/route.ts:227`
- `app/lib/api-middleware.ts`

## 優先度

**P0 - Critical**: 本番環境にデプロイする前に必須対応

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
