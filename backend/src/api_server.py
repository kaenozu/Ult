"""
AGStock FastAPI Server
Internal API for UI/External Integration
"""
import sys
from pathlib import Path

# Add backend root to sys.path to resolve src imports
current_file = Path(__file__).resolve()
backend_root = current_file.parents[2] # src/api/server.py -> src/api -> src -> backend
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import logging
import time
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.schemas import HealthResponse
from src.api.routers import portfolio, trading, market, settings, alerts

logger = logging.getLogger(__name__)

# Global App State
start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Lifecycle Management"""
    startup_time = time.strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"API started at {startup_time}")
    yield
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
        allow_origins=["*"], # Allow all for local dev compatibility
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
