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

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.schemas import HealthResponse
from src.api.routers import (
    portfolio,
    trading,
    market,
    settings,
    alerts,
    websocket,
    circuit_breaker,
    approvals,
    learning,
)
from src.api.websocket_broadcaster import broadcaster
from src.api.websocket_manager import manager
from src.circuit_breaker import get_circuit_breaker
from src.continuous_learning import continuous_learning, TaskContext

logger = logging.getLogger(__name__)

# Global App State
start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Lifecycle Management"""
    startup_time = time.strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"API started at {startup_time}")

    # Start WebSocket broadcaster
    asyncio.create_task(broadcaster.start())

    # Set up Circuit Breaker callbacks for WebSocket broadcast
    cb = get_circuit_breaker()

    def broadcast_tripped(trigger_type, reason):
        from src.api.websocket_types import (
            CircuitBreakerStateEnum,
            CircuitBreakerTriggerTypeEnum,
            MessageFactory,
        )

        msg = MessageFactory.circuit_breaker_tripped(
            state=CircuitBreakerStateEnum.OPEN,
            trigger_type=CircuitBreakerTriggerTypeEnum(trigger_type.value),
            trigger_reason=reason,
            total_losses=cb.state.total_losses,
            kill_switch_active=cb.state.kill_switch_active,
            manual_reset_required=cb.state.manual_reset_required,
        )
        asyncio.create_task(
            manager.broadcast(msg.to_client().model_dump(), channel="circuit_breaker")
        )

    def broadcast_reset(previous_state):
        from src.api.websocket_types import CircuitBreakerStateEnum, MessageFactory

        msg = MessageFactory.circuit_breaker_reset(
            previous_state=CircuitBreakerStateEnum(previous_state),
            triggered_at=cb.state.triggered_at,
            reset_type="manual" if cb.state.manual_reset_required else "automatic",
        )
        asyncio.create_task(
            manager.broadcast(msg.to_client().model_dump(), channel="circuit_breaker")
        )

    def broadcast_status(event_name):
        from src.api.websocket_types import CircuitBreakerStateEnum, MessageFactory

        status_info = cb.get_status()
        msg = MessageFactory.circuit_breaker_status(
            state=CircuitBreakerStateEnum(status_info["state"]["state"]),
            can_trade=status_info["can_trade"],
            total_losses=status_info["state"]["total_losses"],
            peak_loss=status_info["state"]["peak_loss"],
            failure_count=status_info["state"]["failure_count"],
            kill_switch_active=status_info["state"]["kill_switch_active"],
            manual_reset_required=status_info["state"]["manual_reset_required"],
            config=status_info["config"],
        )
        asyncio.create_task(
            manager.broadcast(msg.to_client().model_dump(), channel="circuit_breaker")
        )

    cb.register_callback("tripped", broadcast_tripped)
    cb.register_callback("reset", broadcast_reset)
    cb.register_callback(
        "kill_switch_activated",
        lambda reason: broadcast_tripped("manual", f"Kill switch: {reason}"),
    )
    cb.register_callback("kill_switch_deactivated", lambda: broadcast_reset("open"))
    cb.register_callback("manual_reset", lambda: broadcast_reset("open"))

    yield

    # Stop WebSocket broadcaster
    await broadcaster.stop()
    logger.info("API shutdown")


def create_app() -> FastAPI:
    """Create FastAPI Application"""
    app = FastAPI(
        title="AGStock API",
        description="AI-Powered Stock Trading System API",
        version="3.0.0",
        lifespan=lifespan,
    )

    # CORS Settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all for local dev compatibility
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(portfolio.router, prefix="/api/v1", tags=["Portfolio"])
    app.include_router(trading.router, prefix="/api/v1", tags=["Trading"])
    app.include_router(market.router, prefix="/api/v1", tags=["Market"])
    app.include_router(settings.router, prefix="/api/v1", tags=["Settings"])
    app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
    app.include_router(
        circuit_breaker.router,
        prefix="/api/v1/circuit-breaker",
        tags=["Circuit Breaker"],
    )
    app.include_router(websocket.router, tags=["WebSocket"])
    app.include_router(approvals.router, prefix="/api/v1", tags=["Approvals"])
    app.include_router(learning.router, tags=["Learning"])

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
        uptime = time.time() - start_time
        return HealthResponse(
            status="healthy",
            version="3.0.0",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
        )

    # Global Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"API Error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": str(exc)},
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
