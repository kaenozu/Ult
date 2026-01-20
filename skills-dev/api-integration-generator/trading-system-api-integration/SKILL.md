# API Integration Generator Skill

# API統合自動生成スキル

## Overview

AI取引プラットフォームのAPI開発、統合、連携を自動化する専門スキル。既存のシステムアーキテクチャに基づいて、最適なAPI設計と実装を生成します。

## Capabilities

### 1. FastAPI Endpoint Generation

- RESTful APIエンドポイントの自動生成
- OpenAPI/Swagger仕様書の作成
- リクエスト/レスポンスモデルの定義
- バリデーションとエラーハンドリングの統合

### 2. Database Integration

- SQLAlchemyモデルの自動生成
- データベース接続設定
- CRUD操作の実装
- マイグレーションスクリプトの作成

### 3. External API Integration

- 外部サービス連携用クライアント生成
- 認証とレートリミット実装
- エラーハンドリングとリトライロジック
- キャッシュ戦略の統合

### 4. WebSocket Real-time Communication

- WebSocketエンドポイントの実装
- リアルタイムデータストリーミング
- クライアント接続管理
- ブロードキャスト機能

### 5. Authentication & Authorization

- JWTベース認証システム
- RBAC（役割ベースアクセス制御）
- APIキー管理
- OAuth2.0統合

## Implementation Strategy

### Prerequisites

- FastAPIフレームワーク
- SQLAlchemy ORM
- Pydanticモデル
- 既存のデータベーススキーマ
- 外部APIドキュメント

### Integration Points

- `src/api/v1/` ディレクトリ構造
- 既存ルーター実装
- データベース接続設定
- 外部サービスAPI仕様

### Generated Output Examples

```python
# FastAPIエンドポイント自動生成
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class TradeRequest(BaseModel):
    ticker: str
    action: str
    quantity: int
    price: float
    confidence: float
    reason: str

class TradeResponse(BaseModel):
    success: bool
    trade_id: Optional[str] = None
    message: str

@router.post("/trades", response_model=TradeResponse, status_code=201)
async def execute_trade(
    trade: TradeRequest,
    current_user: dict = Depends(get_current_user)
):
    """取引を実行"""
    try:
        # ビジネスロジックの実装
        result = await trading_service.execute_trade(trade, current_user)
        return TradeResponse(
            success=True,
            trade_id=result.trade_id,
            message="Trade executed successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/trades")
async def get_trades(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """取引履歴を取得"""
    trades = await trading_service.get_user_trades(current_user["id"], limit)
    return {"trades": trades}
```

```python
# 外部APIクライアント生成
import aiohttp
import asyncio
from typing import Dict, Any, Optional

class ExternalAPIClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def get_market_data(self, ticker: str) -> Dict[str, Any]:
        """市場データを取得"""
        url = f"{self.base_url}/market/{ticker}"

        async with self.session.get(url) as response:
            response.raise_for_status()
            return await response.json()

    async def submit_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """取引をサブミット"""
        url = f"{self.base_url}/trades"

        async with self.session.post(url, json=trade_data) as response:
            response.raise_for_status()
            return await response.json()
```

## Integration Workflows

### 1. New API Endpoint Development

- API仕様からエンドポイント自動生成
- データモデルとバリデーション作成
- テストコードの同時生成
- OpenAPIドキュメントの更新

### 2. External Service Integration

- APIドキュメント解析とクライアント生成
- 認証設定の自動実装
- レート制限とリトライロジック
- キャッシュ戦略の適用

### 3. Database Schema Integration

- 既存スキーマからSQLAlchemyモデル生成
- CRUD操作の実装
- マイグレーションスクリプト作成
- パフォーマンス最適化

## Expected Benefits

- API開発速度: 50%向上
- 統合エラー削減: 60%
- ドキュメント品質: 自動化により100%カバー
- 外部サービス連携時間: 70%削減

## Use Cases

1. 新規機能のAPIエンドポイント追加
2. 外部マーケットデータプロバイダ連携
3. ブローカチェーン統合
4. マイクロサービス間通信
5. WebSocketリアルタイム機能実装

## Security Considerations

- APIキーの安全な管理
- 認証・認可の適切な実装
- レート制限とDDoS対策
- 入力検証とサニタイズ
- 監査ログの実装
