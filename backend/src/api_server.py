"""
AGStock FastAPI Server
Internal API for UI/External Integration
"""

import sys
from pathlib import Path

# Add backend root to sys.path to resolve src imports
current_file = Path(__file__).resolve()
backend_root = current_file.parents[2]  # src/api/server.py -> src/api -> src -> backend
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.schemas import HealthResponse
from src.api.routers import portfolio, trading, market, settings, alerts
from src.services.log_monitor import StructuredLogger, MonitoringSystem

logger = logging.getLogger(__name__)

# Global App State
start_time = time.time()

# Initialize monitoring system
structured_logger = StructuredLogger(log_level="INFO")
monitoring_system = MonitoringSystem(structured_logger)
monitoring_system.start_monitoring()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Lifecycle Management"""
    startup_time = time.strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"API started at {startup_time}")

    # Startup: Initialize monitoring
    monitoring_system.start_monitoring()
    structured_logger.log_structured(
        "INFO", "application_startup", startup_time=startup_time
    )

    yield

    # Shutdown: Cleanup monitoring
    monitoring_system.stop_monitoring()
    structured_logger.log_structured(
        "INFO", "application_shutdown", shutdown_time=time.strftime("%Y-%m-%d %H:%M:%S")
    )
    logger.info("API shutdown")


def create_app() -> FastAPI:
    """Create FastAPI Application"""
    app = FastAPI(
        title="AGStock API",
        description="AI-Powered Stock Trading System API",
        version="3.0.0",
        lifespan=lifespan,
    )

    # CORS Settings - Environment-based configuration
    cors_origins = [
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
        "http://localhost:8000",  # FastAPI dev server
        "http://127.0.0.1:8000",
    ]

    # Add production domains if in production
    if os.getenv("ENVIRONMENT") == "production":
        # Add your production domain here
        cors_origins.extend(
            [
                "https://yourdomain.com",
                "https://api.yourdomain.com",
            ]
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=86400,  # Cache preflight for 24 hours
    )

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()

        # Generate request ID
        request_id = f"{int(start_time)}_{hash(str(request.url)) % 10000}"
        request.state.request_id = request_id

        # Log incoming request
        structured_logger.log_structured(
            "INFO",
            "api_request_start",
            request_id=request_id,
            method=request.method,
            path=str(request.url.path),
            query_params=str(request.url.query),
            user_agent=request.headers.get("user-agent", "unknown"),
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log successful response
            structured_logger.log_api_request(
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration=process_time,
                user_agent=request.headers.get("user-agent", "unknown"),
            )

            return response

        except Exception as exc:
            process_time = time.time() - start_time

            # Log error response
            structured_logger.log_structured(
                "ERROR",
                "api_request_error",
                request_id=request_id,
                method=request.method,
                path=str(request.url.path),
                duration=process_time,
                error=str(exc),
            )

            raise

    # Register Routers
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    app.include_router(trading.router, prefix="/api/v1", tags=["Trading"])
    app.include_router(market.router, prefix="/api/v1", tags=["Market"])
    app.include_router(settings.router, prefix="/api/v1", tags=["Settings"])
    app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])

    # Root Routes
    @app.get("/", tags=["Root"])
    async def root():
        """API Root"""
        return {
            "name": "AGStock API",
            "version": "3.0.0",
            "docs": "/docs",
            "health": "/health",
        }

    @app.get("/health", response_model=HealthResponse, tags=["System"])
    async def health_check():
        """Health Check"""
        start_time_req = time.time()
        uptime = time.time() - start_time

        # ヘルスチェック結果取得
        health_status = monitoring_system.get_health_status()

        response_time = time.time() - start_time_req

        # APIリクエストログ
        structured_logger.log_api_request(
            method="GET", path="/health", status_code=200, duration=response_time
        )

        return HealthResponse(
            status=health_status["overall_status"],
            version="3.0.0",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
        )

    @app.get("/monitoring/health", tags=["Monitoring"])
    async def monitoring_health():
        """Monitoring Health Status"""
        return monitoring_system.get_health_status()

    @app.get("/monitoring/alerts", tags=["Monitoring"])
    async def monitoring_alerts():
        """Active Monitoring Alerts"""
        return {"alerts": monitoring_system.get_active_alerts()}

    @app.get("/monitoring/metrics", tags=["Monitoring"])
    async def monitoring_metrics():
        """Monitoring Metrics Summary"""
        return monitoring_system.get_metrics_summary()

    # Global Exception Handler - Security-focused
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Log full error details for debugging
        logger.error(f"API Error: {exc}", exc_info=True)

        # 構造化ログにエラーを記録
        structured_logger.log_error(
            error_type=type(exc).__name__,
            message=str(exc),
            traceback=str(exc.__traceback__) if hasattr(exc, "__traceback__") else None,
            request_id=getattr(request.state, "request_id", None),
            path=str(request.url.path),
        )

        # Return sanitized error message to client
        error_message = "Internal server error"
        if isinstance(exc, HTTPException):
            # FastAPI's HTTPException is safe to expose
            error_message = exc.detail
        elif os.getenv("ENVIRONMENT") == "development":
            # In development, show more details for debugging
            error_message = str(exc)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": error_message,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "path": str(request.url.path),
            },
        )

    return app


_app = None


def get_app() -> FastAPI:
    global _app
    if _app is None:
        _app = create_app()
    return _app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(create_app(), host="0.0.0.0", port=8000)
