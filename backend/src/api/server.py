"""
AGStock FastAPI Server

内部APIを提供し、UI/外部システムとの連携を実現。
"""

import sys
from pathlib import Path

# Add backend root to sys.path to resolve src imports
# This must be done BEFORE importing from src if running as script
current_file = Path(__file__).resolve()
backend_root = current_file.parents[2]  # src/api/server.py -> src/api -> src -> backend
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.schemas import HealthResponse
from src.api.routers import portfolio, trading, market, settings
from src.core.config import settings

logger = logging.getLogger(__name__)

# グローバルアプリインスタンス
_app: Optional[FastAPI] = None

# === Lifespan ===


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    logger.info("AGStock API starting...")
    # 起動時の初期化
    yield
    # シャットダウン時のクリーンアップ
    logger.info("AGStock API shutting down...")


# === App Factory ===


def create_app() -> FastAPI:
    """FastAPIアプリケーションを作成"""
    app = FastAPI(
        title="AGStock API",
        description="AI-Powered Stock Trading System API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get("cors_origins", ["*"]),  # 本番環境では制限すること
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ルーターを登録
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    app.include_router(trading.router, prefix="/api/v1", tags=["Trading"])
    app.include_router(market.router, prefix="/api/v1", tags=["Market"])
    app.include_router(settings.router, prefix="/api/v1", tags=["Settings"])

    # Root Routes
    @app.get("/", response_model=HealthResponse)
    async def root():
        """ヘルスチェック"""
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
        )

    @app.get("/api/v1/health", response_model=HealthResponse)
    async def health_check():
        """詳細ヘルスチェック"""
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
        )

    return app


def get_app() -> FastAPI:
    """シングルトンアプリインスタンスを取得"""
    global _app
    if _app is None:
        _app = create_app()
    return _app


# === Main ===

if __name__ == "__main__":
    import uvicorn

    # Routes are registered in create_app via include_router
    uvicorn.run(create_app(), host="0.0.0.0", port=8000)
