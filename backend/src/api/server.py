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

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.schemas import HealthResponse
from src.api.routers import (
    portfolio,
    trading,
    market,
    settings,
    websocket,
    alerts,
    circuit_breaker,
    approvals,
)
from src.api.vibe_endpoints import router as vibe_router
from src.di import container

logger = logging.getLogger(__name__)

# Dependency injection container handles all instances

# === Lifespan ===


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    logger.info("Living Nexus API starting...")

    # Start background tasks using dependency injection
    from src.api.routers.websocket import start_regime_monitoring

    monitoring_task = asyncio.create_task(start_regime_monitoring())

    # Initialize WebSocket connections if needed
    # Future: Initialize database connections, cache, etc.

    yield

    # シャットダウン時のクリーンアップ
    logger.info("Living Nexus API shutting down...")
    monitoring_task.cancel()
    try:
        await monitoring_task
    except asyncio.CancelledError:
        pass


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
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    # === API Routers Registration ===
    # Core Trading APIs
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    app.include_router(trading.router, prefix="/api/v1", tags=["Trading"])

    # Market Data APIs
    app.include_router(market.router, prefix="/api/v1", tags=["Market Data"])

    # Risk Management APIs
    app.include_router(alerts.router, prefix="/api/v1", tags=["Risk Management"])
    app.include_router(
        circuit_breaker.router, prefix="/api/v1", tags=["Risk Management"]
    )

    # Administrative APIs
    app.include_router(settings.router, prefix="/api/v1", tags=["Administration"])
    app.include_router(approvals.router, prefix="/api/v1", tags=["Administration"])

    # Real-time Communication
    app.include_router(websocket.router, tags=["WebSocket"])

    # Specialized Features
    # app.include_router(vibe_router, prefix="/api/v1", tags=["Experimental"])

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


# Direct app creation - no global state needed


# Module-level app instance for uvicorn compatibility
# Usage: uvicorn src.api.server:app --reload
app = create_app()


# === Main ===

if __name__ == "__main__":
    import uvicorn

    # Routes are registered in create_app via include_router
    uvicorn.run(create_app(), host="0.0.0.0", port=8000)
