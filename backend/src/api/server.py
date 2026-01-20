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
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.schemas import HealthResponse
from src.api.responses import (
    ErrorResponse,
    ErrorDetail,
    internal_error,
    bad_request_error,
    ValidationError,
)
from src.infra.logging_config import setup_logging, metrics
from src.api.routers import (
    portfolio,
    trading,
    market,
    settings as settings_router,
    websocket,
    alerts,
    circuit_breaker,
    approvals,
    replay,  # Phase 10: The Time Machine
    vision,  # Phase 11: The Eyes of God
)
from src.api.routers import (
    portfolio,
    trading,
    market,
    settings as settings_router,
    websocket,
    alerts,
    circuit_breaker,
    approvals,
    replay,  # Phase 10: The Time Machine
    vision,  # Phase 11: The Eyes of God
)


from src.api.vibe_endpoints import router as vibe_router
from src.di import container
from src.core.agent_loop import AutonomousAgent
from src.core.config import settings as app_settings

logger = logging.getLogger(__name__)

# Dependency injection container handles all instances

# === Lifespan ===


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # Setup structured logging
    setup_logging(
        log_level=app_settings.system.log_level
        if hasattr(app_settings.system, "log_level")
        else "INFO",
        log_dir=str(app_settings.system.data_dir / "logs"),
    )
    logger = logging.getLogger(__name__)
    logger.info("Living Nexus API starting...")

    # Validate required API keys at startup
    if not app_settings.gemini_api_key and not app_settings.openai_api_key:
        raise ValueError(
            "At least one AI API key (GEMINI_API_KEY or OPENAI_API_KEY) is required"
        )

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


def configure_cors(app: FastAPI) -> None:
    """CORSミドルウェアを設定"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.system.cors_origins,
        allow_credentials=app_settings.system.cors_allow_credentials,
        allow_methods=app_settings.system.cors_allow_methods,
        allow_headers=app_settings.system.cors_allow_headers,
    )


def register_routers(app: FastAPI) -> None:
    """APIルーターを登録"""
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

    # Phase 7: News Shock Defense
    from src.api.routers import shock_radar

    app.include_router(shock_radar.router, prefix="/api/v1", tags=["Risk Management"])

    # Phase 10: The Time Machine (Replay & Analytics)
    app.include_router(replay.router)

    # Phase 11: The Eyes of God (Multimodal Vision)
    app.include_router(vision.router, prefix="/api/v1")

    # Administrative APIs
    app.include_router(
        settings_router.router, prefix="/api/v1", tags=["Administration"]
    )
    app.include_router(approvals.router, prefix="/api/v1", tags=["Administration"])

    # Real-time Communication
    app.include_router(websocket.router, tags=["WebSocket"])

    # Specialized Features
    # app.include_router(vibe_router, prefix="/api/v1", tags=["Experimental"])


def register_health_routes(app: FastAPI) -> None:
    """ヘルスチェックルートを登録"""

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

    @app.get("/metrics")
    async def metrics_endpoint():
        """Application metrics for monitoring"""
        return metrics.get_metrics()

    @app.get("/api/v1/health", response_model=HealthResponse)
    async def health_check():
        """詳細ヘルスチェック"""
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
        )


def setup_exception_handlers(app: FastAPI) -> None:
    """グローバル例外ハンドラを設定"""
    from fastapi import HTTPException, Request, JSONResponse
    from fastapi.exceptions import RequestValidationError
    from pydantic import ValidationError as PydanticValidationError
    import logging

    logger = logging.getLogger(__name__)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP例外ハンドラ"""
        logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
        error_response, status_code = bad_request_error(
            message=exc.detail,
            error_code=f"HTTP_{exc.status_code}",
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        """リクエストバリデーションエラーハンドラ"""
        logger.warning(f"Validation error: {exc.errors()}")
        errors = [
            ErrorDetail(
                field=".".join(str(loc) for loc in error["loc"]), message=error["msg"]
            )
            for error in exc.errors()
        ]
        error_response, status_code = bad_request_error(
            message="Request validation failed",
            error_code="VALIDATION_ERROR",
            errors=errors,
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request, exc: PydanticValidationError
    ):
        """Pydanticバリデーションエラーハンドラ"""
        logger.warning(f"Pydantic validation error: {exc.errors()}")
        errors = [
            ErrorDetail(
                field=".".join(str(loc) for loc in error["loc"]), message=error["msg"]
            )
            for error in exc.errors()
        ]
        error_response, status_code = bad_request_error(
            message="Data validation failed",
            error_code="PYDANTIC_VALIDATION_ERROR",
            errors=errors,
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request, exc: PydanticValidationError
    ):
        """Pydanticバリデーションエラーハンドラ"""
        logger.warning(f"Pydantic validation error: {exc.errors()}")
        errors = [
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
            }
            for error in exc.errors()
        ]
        error_response, status_code = bad_request_error(
            message="Data validation failed",
            error_code="PYDANTIC_VALIDATION_ERROR",
            errors=errors,
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """一般例外ハンドラ"""
        logger.error(f"Unexpected error: {exc}", exc_info=True)
        error_response, status_code = internal_error(
            message="An unexpected error occurred",
            error_code="INTERNAL_ERROR",
        )
        return JSONResponse(
            status_code=status_code,
            content=error_response.dict(exclude_none=True),
        )


def create_app() -> FastAPI:
    """FastAPIアプリケーションを作成"""
    app = FastAPI(
        title="AGStock API",
        description="AI-Powered Stock Trading System API",
        version="1.0.0",
        lifespan=lifespan,
    )

    # 設定適用
    configure_cors(app)
    setup_exception_handlers(app)
    register_routers(app)
    register_health_routes(app)

    return app


# Direct app creation - no global state needed


# Module-level app instance for uvicorn compatibility
# Usage: uvicorn src.api.server:app --reload
app = create_app()


def get_app():
    return app


# === Main ===

if __name__ == "__main__":
    import uvicorn

    # Routes are registered in create_app via include_router
    uvicorn.run(create_app(), host="0.0.0.0", port=8000)
