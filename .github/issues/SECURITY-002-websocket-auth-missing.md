# 🟠 HIGH: WebSocket認証未実装

## 問題の説明

WebSocketサーバー（`scripts/websocket-server.js`）に認証メカニズムが実装されていません。環境変数 `WS_AUTH_TOKEN` は定義されていますが、実際に接続時に検証されていません。

```javascript
// scripts/websocket-server.js:16-18
const WS_AUTH_TOKEN = process.env.WS_AUTH_TOKEN;  // 定義はあるが...
// scripts/websocket-server.js:64
wss.handleUpgrade(request, socket, head, (ws) => {
  wss.emit('connection', ws, request);  // ← ここで認証チェックなし
});
```

## 影響範囲

- **ファイル**: `scripts/websocket-server.js`
- **脆弱性**: 未認証クライアントがWebSocketに接続可能
- **環境変数**: `.env.example:42-43` で `WS_AUTH_TOKEN` 定義済み
- **影響**: 認証なしでリアルタイム市場データへアクセス可能

## リスク評価

- **機密性**: 高（市場データ、取引シグナル）
- **完全性**: 中（メッセージ送信は可能だが受信は制限されない場合も）
- **可用性**: 中（リソースの不正使用）

## 推奨修正

### 1. upgrade ハンドラで認証チェック追加

```javascript
wss.handleUpgrade(request, socket, head, (ws, request) => {
  // 認証トークンの検証
  const authHeader = request.headers['sec-websocket-protocol'];

  if (WS_AUTH_TOKEN) {
    const token = authHeader?.split(',')[0]?.trim();
    if (!token || token !== WS_AUTH_TOKEN) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  wss.emit('connection', ws, request);
});
```

### 2. セキュアなプロトコルネゴシエーション

クライアントは接続時にトークンを `Sec-WebSocket-Protocol` ヘッダーで送信：

```typescript
// フロントエンド側（client-side）
const ws = new WebSocket(wsUrl, ['Bearer', token]);
```

### 3. 環境変数検証の強化

`app/lib/config/env-validator.ts` で本番環境の `WS_AUTH_TOKEN` を必須化：

```typescript
if (isProduction) {
  const wsAuthToken = getEnv('WS_AUTH_TOKEN');
  if (!wsAuthToken || wsAuthToken.length < 32) {
    throw new EnvironmentValidationError(
      'WS_AUTH_TOKEN must be set to a secure random string in production'
    );
  }
}
```

### 4. 接続後にユーザー認証

WebSocket接続後にJWT認証を追加：

```javascript
wss.on('connection', (ws, request) => {
  const token = extractTokenFromProtocol(request.headers['sec-websocket-protocol']);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.userId;
  } catch (error) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // 以降の処理...
});
```

## 受入基準

- [ ] WebSocket接続時に認証トークン必須
- [ ] 無効なトークンは401または1008コードで拒否
- [ ] 本番環境では高エントロピーのランダムトークン
- [ ] 認証失敗時は適切にログ記録
- [ ] ドキュメントにWebSocket認証方法を記載

## 関連ファイル

- `scripts/websocket-server.js:31-67`
- `.env.example:42-43`
- `app/lib/config/env-validator.ts`
- `trading-platform/app/lib/auth.ts`

## 優先度

**P1 - High**: 認証機関の重要なゲートを閉めるため

---

**作成日**: 2026-02-02  
**レビュアー**: Code Review Summary  
**プロジェクト**: ULT Trading Platform
