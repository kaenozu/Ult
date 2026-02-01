# Agent Skill: Security Hardening

## 概要
このスキルは、Trading Platformのセキュリティ強化と脆弱性対策のためのガイドラインです。

## 適用シナリオ
- セキュリティレビュー実施
- 脆弱性パッチ適用
- セキュリティ監査対応

## セキュリティチェックリスト

### 入力検証

```typescript
// Zodスキーマ検証
import { z } from 'zod';

const OrderSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive().max(1000000),
  price: z.number().positive()
});

// APIルートでの使用
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = OrderSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.format() },
      { status: 400 }
    );
  }
  // 検証済みデータの使用
  const order = result.data;
}
```

### XSS防止

```typescript
// DOMPurify使用
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userInput);

// Reactでの安全なレンダリング
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />

// または安全な方法
<div>{userContent}</div> {/* React自動エスケープ */}
```

### SQL/NoSQLインジェクション防止

```typescript
// ❌ 禁止: 文字列連結
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ 推奨: パラメータ化クエリ
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);

// ✅ 推奨: ORM使用
await prisma.user.findUnique({ where: { id: userId } });
```

## 認証・認可

### JWT認証

```typescript
// JWTミドルウェア
import { verify } from 'jsonwebtoken';

export const authMiddleware = (handler: Handler) => {
  return async (req: NextRequest) => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return handler(req);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
};
```

### 権限チェック

```typescript
// RBAC実装
const checkPermission = (user: User, permission: string) => {
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenError('Insufficient permissions');
  }
};

// APIルートでの使用
export const POST = authMiddleware(async (req) => {
  checkPermission(req.user, 'trade:execute');
  // 取引実行ロジック
});
```

## セキュリティヘッダー

### Next.js設定

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ];
  }
};
```

## レート制限

### IPベース制限

```typescript
// IPレートリミッター
import { ipRateLimiter } from '@/app/lib/ip-rate-limit';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  
  if (!ipRateLimiter.check(clientIp, { maxRequests: 10, windowMs: 60000 })) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  // リクエスト処理
}
```

### ユーザー別制限

```typescript
// ユーザー別レート制限
const userRateLimit = new Map<string, number[]>();

const checkUserRateLimit = (userId: string) => {
  const now = Date.now();
  const requests = userRateLimit.get(userId) || [];
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 100) {
    return false;
  }
  
  recentRequests.push(now);
  userRateLimit.set(userId, recentRequests);
  return true;
};
```

## セキュアなデータ処理

### 機密データの取り扱い

```typescript
// ❌ 禁止: クライアントに機密データを露出
const user = { id: 1, email: 'user@example.com', passwordHash: '...' };
return NextResponse.json(user);

// ✅ 推奨: 必要なデータのみ返却
const publicUser = { id: user.id, email: user.email };
return NextResponse.json(publicUser);
```

### 暗号化

```typescript
// 機密データの暗号化
import { encrypt, decrypt } from '@/app/lib/crypto';

const sensitiveData = 'secret information';
const encrypted = encrypt(sensitiveData, process.env.ENCRYPTION_KEY);
const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY);
```

## セキュリティ監査

### 自動セキュリティチェック

```bash
# npm audit
npm audit

# 依存関係の脆弱性スキャン
npm audit fix

# Snykスキャン
npx snyk test

# GitGuardian（シークレット検出）
# GitHub統合で自動実行
```

### コードレビューチェックリスト

- [ ] 入力検証の実装
- [ ] 認証・認可の確認
- [ ] XSS対策の確認
- [ ] レート制限の実装
- [ ] エラーメッセージの情報漏洩防止
- [ ] 機密データの適切な取り扱い
- [ ] ログへの機密情報出力防止

## 脆弱性対応フロー

### 1. 脆弱性発見

```bash
# セキュリティアラート確認
gh security-alert view <alert-id>

# CVEデータベース確認
npm audit --json
```

### 2. 緊急パッチ適用

```bash
# パッチ適用
npm audit fix

# 強制的な更新
npm audit fix --force

# 個別パッケージ更新
npm update <package-name>
```

### 3. ホットフィックスデプロイ

```bash
# 緊急ブランチ作成
git checkout -b hotfix/security-patch

# 修正適用
# [セキュリティ修正コード]

# テスト実行
npm test

# PR作成
gh pr create --title "[SECURITY] Fix vulnerability" --body "CVE-XXXX-XXXX"
```

## セキュリティテスト

### ペネトレーションテスト

```bash
# OWASP ZAP
zap.sh -quickurl http://localhost:3000

# Burp Suite
# プロキシ設定して手動テスト
```

### 自動化テスト

```typescript
// セキュリティテスト例
describe('Security', () => {
  it('should reject invalid JWT', async () => {
    const res = await fetch('/api/protected', {
      headers: { authorization: 'Bearer invalid_token' }
    });
    expect(res.status).toBe(401);
  });

  it('should sanitize XSS attempts', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = DOMPurify.sanitize(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });
});
```

## セキュリティインシデント対応

### インシデント発生時

1. **即座の対応**
   - 影響範囲の特定
   - 一時的な対策実装
   - ユーザーへの通知準備

2. **調査**
   - ログ分析
   - 攻撃経路の特定
   - 被害範囲の把握

3. **復旧**
   - パッチ適用
   - 監視強化
   - 再発防止策の実装

## 関連ドキュメント
- FOR_OPENCODE.md - セキュリティ修正履歴
- .github/skills/code-review.md - セキュリティレビュー
- GitHub Security Advisories
