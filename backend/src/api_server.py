"""
AGStock FastAPI Web API
RESTful API for external system integration
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.config_loader import config, get_api_config, get_security_config
from src.database_manager import db_manager

logger = logging.getLogger(__name__)

start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理"""
    startup_time = time.strftime("%Y-%m-%d %H:%M:%S")
    logger.info(f"API started at {startup_time}")
    yield
    logger.info("API shutdown")


app = FastAPI(
    title="AGStock API",
    description="AI-Powered Investment Trading System API",
    version="3.0.0",
    lifespan=lifespan,
)

CORS_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """ヘルスチェック応答"""

    status: str
    version: str
    uptime_seconds: float
    components: Dict[str, str]


class PortfolioResponse(BaseModel):
    """ポートフォリオ応答"""

    total_value: float
    cash_balance: float
    positions: Dict[str, Any]
    daily_return: float
    total_return: float
    timestamp: str


class TradeRequest(BaseModel):
    """取引リクエスト"""

    symbol: str = Field(..., min_length=1, max_length=10)
    action: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    order_type: str = Field(default="market", pattern="^(market|limit)$")
    price: Optional[float] = None


class TradeResponse(BaseModel):
    """取引応答"""

    trade_id: str
    symbol: str
    action: str
    quantity: float
    price: float
    total: float
    status: str
    timestamp: str


class MarketDataResponse(BaseModel):
    """市場データ応答"""

    symbol: str
    price: float
    change_percent: float
    volume: int
    timestamp: str


class AlertRequest(BaseModel):
    """アラートリクエスト"""

    alert_type: str
    message: str
    severity: str = Field(default="info", pattern="^(info|warning|critical)$")


class AlertResponse(BaseModel):
    """アラート応答"""

    alert_id: str
    alert_type: str
    message: str
    severity: str
    status: str
    timestamp: str


class PredictionResponse(BaseModel):
    """予測応答"""

    symbol: str
    prediction: str
    confidence: float
    target_price: float
    timestamp: str


request_counts: Dict[str, float] = {}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """レート制限ミドルウェア"""
    client_ip = request.client.host
    current_time = time.time()
    window = 60

    if client_ip not in request_counts:
        request_counts[client_ip] = []

    request_counts[client_ip] = [t for t in request_counts[client_ip] if current_time - t < window]

    if len(request_counts[client_ip]) >= 60:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": "Rate limit exceeded"},
        )

    request_counts[client_ip].append(current_time)
    response = await call_next(request)
    return response


@app.get("/", tags=["Root"])
async def root():
    """APIルート"""
    return {
        "name": "AGStock API",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """ヘルスチェック"""
    uptime = time.time() - start_time
    return HealthResponse(
        status="healthy",
        version="3.0.0",
        uptime_seconds=round(uptime, 2),
        components={
            "database": "connected",
            "ai_system": "active",
            "market_data": "active",
        },
    )


@app.get("/api/v1/portfolio", response_model=PortfolioResponse, tags=["Portfolio"])
async def get_portfolio():
    """ポートフォリオ取得"""
    latest = db_manager.get_latest_portfolio()
    if not latest:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    positions = latest.get("positions", "{}")
    import json

    try:
        positions_dict = json.loads(positions)
    except:
        positions_dict = {}
    return PortfolioResponse(
        total_value=latest["total_value"],
        cash_balance=latest["cash_balance"],
        positions=positions_dict,
        daily_return=latest.get("daily_return", 0),
        total_return=latest.get("total_return", 0),
        timestamp=latest["timestamp"],
    )


@app.post("/api/v1/portfolio", tags=["Portfolio"])
async def save_portfolio(
    total_value: float,
    cash_balance: float,
    positions: Dict[str, Any],
    daily_return: float = 0,
    total_return: float = 0,
):
    """ポートフォリオ保存"""
    import json

    portfolio_id = db_manager.save_portfolio(
        total_value=total_value,
        cash_balance=cash_balance,
        positions=positions,
        daily_return=daily_return,
        total_return=total_return,
    )
    return {"portfolio_id": portfolio_id, "status": "saved"}


@app.get("/api/v1/trades", response_model=List[TradeResponse], tags=["Trading"])
async def get_trades(symbol: Optional[str] = None, limit: int = 50):
    """取引履歴取得"""
    trades = db_manager.get_trades(symbol=symbol, limit=limit)
    return [
        TradeResponse(
            trade_id=t["id"],
            symbol=t["symbol"],
            action=t["action"],
            quantity=t["quantity"],
            price=t["price"],
            total=t["total"],
            status=t["status"],
            timestamp=t["timestamp"],
        )
        for t in trades
    ]


@app.post("/api/v1/trades", response_model=TradeResponse, tags=["Trading"])
async def create_trade(request: TradeRequest):
    """新規取引作成"""
    trade_id = db_manager.save_trade(
        symbol=request.symbol,
        action=request.action,
        quantity=request.quantity,
        price=request.price or 0,
        status="pending",
    )
    return TradeResponse(
        trade_id=trade_id,
        symbol=request.symbol,
        action=request.action,
        quantity=request.quantity,
        price=request.price or 0,
        total=request.quantity * (request.price or 0),
        status="pending",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
    )


@app.get("/api/v1/market/{symbol}", response_model=MarketDataResponse, tags=["Market"])
async def get_market_data(symbol: str):
    """市場データ取得（ダミー実装）"""
    import random

    return MarketDataResponse(
        symbol=symbol.upper(),
        price=round(random.uniform(100, 500), 2),
        change_percent=round(random.uniform(-5, 5), 2),
        volume=int(random.uniform(1000000, 10000000)),
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
    )


@app.get("/api/v1/alerts", response_model=List[AlertResponse], tags=["Alerts"])
async def get_alerts(status: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
    """アラート履歴取得"""
    alerts = db_manager.get_alerts(status=status, severity=severity, limit=limit)
    return [
        AlertResponse(
            alert_id=a["id"],
            alert_type=a["alert_type"],
            message=a["message"],
            severity=a["severity"],
            status=a["status"],
            timestamp=a["timestamp"],
        )
        for a in alerts
    ]


@app.post("/api/v1/alerts", response_model=AlertResponse, tags=["Alerts"])
async def create_alert(request: AlertRequest):
    """新規アラート作成"""
    alert_id = db_manager.save_alert(
        alert_type=request.alert_type,
        message=request.message,
        severity=request.severity,
    )
    return AlertResponse(
        alert_id=alert_id,
        alert_type=request.alert_type,
        message=request.message,
        severity=request.severity,
        status="active",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
    )


@app.get("/api/v1/config", tags=["Config"])
async def get_config():
    """設定取得（機密情報を除く）"""
    full_config = config.get_all()
    sensitive_keys = ["api_key", "password", "secret", "token"]
    for key in list(full_config.keys()):
        for sk in sensitive_keys:
            if sk in key.lower():
                full_config[key] = "***REDACTED***"
    return full_config


@app.get("/api/v1/audit", tags=["Audit"])
async def get_audit_logs(module: Optional[str] = None, action: Optional[str] = None, limit: int = 100):
    """監査ログ取得"""
    logs = db_manager.get_audit_logs(module=module, action=action, limit=limit)
    return logs


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """グローバル例外ハンドラー"""
    logger.error(f"API Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": str(exc)},
    )


def run_api(host: str = "0.0.0.0", port: int = 8000):
    """APIサーバー起動"""
    import uvicorn

    uvicorn.run(app, host=host, port=port)
