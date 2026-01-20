# Testing Automation Skill

# テスト自動化スキル

## Overview

AI取引プラットフォームのテストカバレッジ向上とテスト自動化を支援する専門スキル。

## Capabilities

### 1. API Endpoint Testing

- FastAPIエンドポイントの包括的テスト生成
- WebSocket接続テスト
- 認証・認可テストの自動生成
- リクエスト・レスポンスの妥当性検証

### 2. Component Testing

- Reactコンポーネントのユニットテスト自動生成
- フックのテストカバレッジ向上
- UIインタラクションテストの作成
- アクセシビリティテストの追加

### 3. Integration Testing

- フロントエンド・バックエンド連携テスト
- データベース操作テスト
- 外部API連携テスト
- エンドツーエンドシナリオテスト

### 4. Performance Testing

- API負荷テストの自動生成
- フロントエンドレンダリングパフォーマンス測定
- メモリ使用量テスト
- レスポンスタイム測定

### 5. Test Data Management

- テストデータの自動生成
- モックオブジェクトの作成
- シナリオベースのテストデータ準備
- テスト環境のセットアップ

## Implementation Strategy

### Prerequisites

- Jest/pytestテストフレームワーク
- Playwright/E2Eテストツール
- FastAPIテストクライアント
- 既存のテスト構造

### Integration Points

- `src/__tests__/` ディレクトリ
- APIエンドポイント仕様
- コンポーネント仕様
- データベーススキーマ

### Generated Output Examples

```typescript
// APIエンドポイントテスト
describe('Trading API', () => {
  describe('POST /api/v1/trades', () => {
    it('should execute trade successfully', async () => {
      const tradeRequest = {
        ticker: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.0,
        confidence: 0.85,
        reason: 'AI predicted upward trend',
      };

      const response = await request(app).post('/api/v1/trades').send(tradeRequest).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.trade_id).toBeDefined();
    });
  });
});
```

```python
# APIルーターテスト
@pytest.mark.asyncio
async def test_execute_trade_success(client):
    """取引実行の成功テスト"""
    trade_data = {
        "ticker": "AAPL",
        "action": "BUY",
        "quantity": 100,
        "price": 150.0,
        "confidence": 0.85,
        "reason": "AI predicted upward trend"
    }

    response = client.post("/api/v1/trades", json=trade_data)

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "trade_id" in data
```

## Expected Benefits

- テストカバレッジ: 60% → 85%
- テスト作成時間: 70%削減
- バグ検出率: 40%向上
- 回帰テスト自動化率: 80%

## Use Cases

1. 新APIエンドポイント開発時の即時テスト生成
2. 既存コードのテストカバレッジ向上
3. CI/CDパイプラインでの自動テスト実行
4. リファクタリング時の回帰テスト保証
