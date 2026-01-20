"""
API v1 Routes
API v1のエントリーポイントとルーターの統合
"""

from fastapi import APIRouter

from .trading import router as trading_router
from .market import router as market_router

# 既存のルーターをインポート（移行期間中の互換性のため）
from ...routers.portfolio as portfolio_router
from ...routers.websocket as websocket_router

# v1 APIメインルーター
v1_router = APIRouter()

# サブドメインルーターを登録
v1_router.include_router(
    trading_router,
    prefix="/trading",
    tags=["Trading Operations"]
)

v1_router.include_router(
    market_router,
    prefix="/market",
    tags=["Market Data"]
)

# 既存ルーターをv1に統合
v1_router.include_router(
    portfolio_router,
    prefix="/portfolio",
    tags=["Portfolio Management"]
)

v1_router.include_router(
    websocket_router,
    prefix="/ws",
    tags=["WebSocket"]
)

__all__ = ["v1_router"]