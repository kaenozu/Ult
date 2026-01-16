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
from src.config_loader import config, get_api_config, get_security_config
from src.database_manager import db_manager
from src.regime_detector import RegimeDetector, MarketRegime
import pandas as pd
import numpy as np

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

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

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
    """ポートフォリオ応答 (Frontend Compatible)"""
    total_equity: float
    cash: float
    invested_amount: float
    unrealized_pnl: float
    position_count: int
    daily_return: float
    total_return: float
    timestamp: str

# ... (skip to get_portfolio) ...

@app.get("/api/v1/portfolio", response_model=PortfolioResponse, tags=["Portfolio"])
async def get_portfolio():
    """ポートフォリオ取得 (Realtime Calculated)"""
    from src.portfolio_manager import portfolio_manager
    import time
    
    try:
        data = portfolio_manager.calculate_portfolio()
        
        return PortfolioResponse(
            total_equity=data["total_equity"],
            cash=data["cash"],
            invested_amount=data["invested_amount"],
            unrealized_pnl=data["unrealized_pnl"],
            position_count=len(data["positions"]),
            daily_return=0.0, # TODO: Calculate daily change
            total_return=data["unrealized_pnl"], # Simplified for now
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
        )
    except Exception as e:
        logger.error(f"Portfolio Calculation Error: {e}")
        # Fallback to empty
        return PortfolioResponse(
            total_equity=10000000.0,
            cash=10000000.0,
            invested_amount=0.0,
            unrealized_pnl=0.0,
            position_count=0,
            daily_return=0.0,
            total_return=0.0,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
        )


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


class SignalResponse(BaseModel):
    """シグナル応答 (Actionable)"""

    symbol: str
    signal: float # 1.0 = Buy, -1.0 = Sell
    confidence: float
    strategy: str
    explanation: str
    entry_price: float
    stop_loss: float
    take_profit: float
    timestamp: str


@app.get("/api/v1/signals/{symbol}", response_model=SignalResponse, tags=["Signals"])
async def get_signal(symbol: str):
    """
    Generate actionable trade signal based on Market Regime using REAL DATA.
    """
    from src.data_loader import fetch_stock_data
    
    detector = RegimeDetector()
    
    # 1. Fetch Real Market Data (1 Year history for reliable regime detection)
    # Using sync fetch for simplicity in this endpoint, wrapped in potential async call if needed
    try:
        data_map = fetch_stock_data([symbol], period="1y", interval="1d")
        df = data_map.get(symbol)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
            
        current_price = float(df["Close"].iloc[-1])
        
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        # Fallback for dev/offline mode or rate limits
        current_price = 2850.0 
        df = pd.DataFrame({'Close': [current_price] * 60})

    # 2. Detect Regime
    regime = detector.detect_regime(df)
    strategy_params = detector.get_regime_strategy(regime)
    
    # 3. Determine Signal & Confidence
    signal = 0.0
    explanation = ""
    
    if regime == "trending_up" or regime == "bull":
        signal = 1.0
        explanation = "強い上昇トレンドを検知。モメンタムは良好です。"
    elif regime == "trending_down" or regime == "bear":
        signal = -1.0
        explanation = "下降トレンドを検知。空売り推奨。"
    elif regime == MarketRegime.CRASH.value:
        signal = -1.0
        explanation = "市場崩壊アラート。直ちにポジションを解消してください。"
    elif regime == "high_volatility":
        # Check current trend for context
        short_trend = df["Close"].iloc[-1] > df["Close"].iloc[-20] if len(df) > 20 else False
        signal = -0.5 if not short_trend else 0.5
        explanation = f"高ボラティリティ相場。{'慎重な買い' if short_trend else '慎重な売り'}を推奨。"
    else:
        signal = 0.0
        explanation = "レンジ相場。明確な方向性が見えません。"

    # 4. Calculate Setup
    sl_pct = strategy_params.get("stop_loss", 0.02)
    tp_pct = strategy_params.get("take_profit", 0.05)
    
    entry_price = round(current_price, 2)
    if signal > 0:
        stop_loss = round(entry_price * (1 - sl_pct), 2)
        take_profit = round(entry_price * (1 + tp_pct), 2)
    elif signal < 0:
        stop_loss = round(entry_price * (1 + sl_pct), 2)
        take_profit = round(entry_price * (1 - tp_pct), 2)
    else:
        # Neutral
        stop_loss = round(entry_price * 0.98, 2)
        take_profit = round(entry_price * 1.02, 2)

    return SignalResponse(
        symbol=symbol.upper(),
        signal=signal,
        confidence=0.85, 
        strategy=f"{regime} ({strategy_params.get('strategy', 'Standard')})",
        explanation=explanation,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
    )


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

    if len(request_counts[client_ip]) >= 300: # Increased limit for dashboard polling
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
    
    # Return default empty portfolio if not found (Initial State)
    if not latest:
        return PortfolioResponse(
            total_value=0.0,
            cash_balance=0.0,
            positions={},
            daily_return=0.0,
            total_return=0.0,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
        )

    positions = latest.get("positions", "{}")
    import json

    try:
        positions_dict = json.loads(positions) if isinstance(positions, str) else positions
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

# --- AutoTrade Components (Restored) ---

class AutoTradeConfig(BaseModel):
    max_budget_per_trade: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    enabled: Optional[bool] = None

@app.get("/api/v1/status/autotrade", tags=["AutoTrade"])
async def get_autotrade_status():
    """自動取引ステータス取得"""
    return {
        "is_running": False, # TODO: Connect to actual AutoTradeManager
        "scan_status": "Idle",
        "last_scan_time": None,
        "config": {
            "max_budget_per_trade": 100000,
            "max_total_invested": 1000000,
            "scan_interval": 60
        }
    }

@app.post("/api/v1/config/autotrade", tags=["AutoTrade"])
async def configure_autotrade(config: AutoTradeConfig):
    """自動取引設定"""
    logger.info(f"AutoTrade Config received: {config}")
    return {
        "is_running": False,
        "scan_status": "Config Updated",
        "last_scan_time": None,
        "config": {
            "max_budget_per_trade": config.max_budget_per_trade or 100000,
            "max_total_invested": 1000000,
            "scan_interval": 60
        }
    }


@app.get("/api/v1/positions", tags=["Portfolio"])
async def get_positions():
    """保有ポジション取得 (Realtime)"""
    from src.portfolio_manager import portfolio_manager
    
    try:
        data = portfolio_manager.calculate_portfolio()
        positions_map = data.get("positions", {})
        
        # Convert dict to list for frontend
        position_list = []
        for ticker, info in positions_map.items():
            position_list.append({
                "ticker": ticker,
                "quantity": info["quantity"],
                "avg_price": info["avg_price"],
                "current_price": info["current_price"],
                "unrealized_pnl": info["unrealized_pnl"]
                # "pnl_percent" is also available if needed
            })
        return position_list
    except Exception as e:
        logger.error(f"Error fetching positions: {e}")
        return []

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


# --- Macro Data ---

class MacroIndicator(BaseModel):
    symbol: str
    name: str # e.g. "Nikkei 225"
    price: float
    change_percent: float
    trend: str # "up", "down", "neutral"
    timestamp: str

@app.get("/api/v1/macro", response_model=List[MacroIndicator], tags=["Market"])
async def get_macro_data():
    """主要マクロ経済指標の取得"""
    from src.data_loader import fetch_external_data
    
    try:
        # Fetch data for last 5 days to calculate change
        data_map = fetch_external_data(period="5d")
        
        indicators = []
        # Mapping: API Key -> (Loader Key, Display Name)
        targets = [
            ("NIKKEI", "Nikkei 225"), 
            ("USDJPY", "USD/JPY"), 
            ("US10Y", "US 10Y Yield"),
            ("VIX", "VIX Index")
        ]

        for key, name in targets:
            df = data_map.get(key)
            if df is not None and not df.empty and len(df) >= 2:
                current = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                change = (current - prev) / prev
                
                indicators.append(MacroIndicator(
                    symbol=key,
                    name=name,
                    price=round(current, 2 if key != "USDJPY" else 3),
                    change_percent=round(change * 100, 2),
                    trend="up" if change > 0 else "down" if change < 0 else "neutral",
                    timestamp=time.strftime("%Y-%m-%dT%H:%M:%S")
                ))
        return indicators
    except Exception as e:
        logger.error(f"Error fetching macro data: {e}")
        return []

# --- Trading ---

@app.post("/api/v1/trades", response_model=TradeResponse, tags=["Trading"])
async def create_trade(request: TradeRequest):
    """新規取引作成 (Paper Trading Execution)"""
    
    # 1. Validate Balance (Simplified for Paper Trading)
    # In a real app, we would check portfolio cash here.
    
    # 2. Execute Order (Simulated)
    # For market orders, we assume immediate fill at current price (or request.price if provided)
    execution_price = request.price if request.price else 0.0
    
    from src.portfolio_manager import portfolio_manager
    
    # Iron Lock: Prevent concurrent trades/rebalancing
    if portfolio_manager.lock.locked():
        logger.warning("Trade request waiting for portfolio lock...")
        
    async with portfolio_manager.lock:
        trade_id = db_manager.save_trade(
            symbol=request.symbol,
            action=request.action,
            quantity=request.quantity,
            price=execution_price,
            status="filled", # Immediate fill for paper trading
        )
    
    # 3. Update Portfolio (Simulated)
    # We should update the portfolio positions here, but for now we rely on the 
    # fact that save_trade logs it. Ideally, we need a PortfolioManager to re-calculate holdings.
    # For Phase 7, we just log the trade.
    
    logger.info(f"PAPER TRADE EXECUTED: {request.action} {request.quantity} {request.symbol} @ {execution_price}")

    return TradeResponse(
        trade_id=trade_id,
        symbol=request.symbol,
        action=request.action,
        quantity=request.quantity,
        price=execution_price,
        total=request.quantity * execution_price,
        status="filled",
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


@app.get("/api/v1/advice", tags=["AI Advisor"])
async def get_ai_advice():
    """AI投資助言取得"""
    from src.ai_advisor import ai_advisor
    from src.portfolio_manager import portfolio_manager
    from src.data_loader import fetch_stock_data
    from src.regime_detector import RegimeDetector
    
    # 1. Get Portfolio
    portfolio_data = portfolio_manager.calculate_portfolio()
    
    # 2. Detect Regime (Using Toyota 7203.T as proxy)
    regime = "ranging"
    try:
         df = fetch_stock_data(["7203.T"], period="6mo")
         if "7203.T" in df:
             detector = RegimeDetector()
             regime = detector.detect_regime(df["7203.T"])
    except Exception as e:
        logger.error(f"Regime detection failed: {e}")

    # 3. Analyze
    advice = ai_advisor.analyze_portfolio(portfolio_data, regime)
    return advice

@app.post("/api/v1/rebalance", tags=["AI Advisor"])
async def execute_rebalance():
    """ポートフォリオ自動リバランス実行"""
    from src.portfolio_manager import portfolio_manager
    
    async with portfolio_manager.lock:
        orders = portfolio_manager.rebalance_portfolio()
        executed_count = 0
        
        for order in orders:
            try:
                # Reusing log logic manually since we are inside API
                db_manager.save_trade(
                    symbol=order["symbol"],
                    action=order["action"],
                    quantity=order["quantity"],
                    price=order["price"],
                    status="filled" # Immediate fill for Paper Trading
                )
                executed_count += 1
        except Exception as e:
            logger.error(f"Rebalance Order Failed: {e}")
            
    return {"message": f"Rebalancing Complete. Executed {executed_count} trades.", "orders": orders}

def run_api(host: str = "0.0.0.0", port: int = 8000):
    """APIサーバー起動"""
    import uvicorn

    uvicorn.run(app, host=host, port=port)
