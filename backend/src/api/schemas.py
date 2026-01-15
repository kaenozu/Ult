from typing import List, Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"

class PortfolioSummary(BaseModel):
    total_equity: float
    cash: float
    invested_amount: float
    unrealized_pnl: float
    position_count: int

class Position(BaseModel):
    ticker: str
    quantity: int
    avg_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None

class TradeRequest(BaseModel):
    ticker: str
    action: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: int = Field(..., gt=0)
    price: Optional[float] = None
    strategy: Optional[str] = None

class TradeResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None

class SignalResponse(BaseModel):
    ticker: str
    signal: int  # 1: BUY, -1: SELL, 0: HOLD
    confidence: float
    strategy: str
    explanation: str
    target_price: Optional[float] = None

class MarketDataResponse(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: str

class BacktestRequest(BaseModel):
    ticker: str
    strategy: str
    period: str = "1y"
    initial_capital: float = 1000000

class BacktestResponse(BaseModel):
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    total_trades: int

class ResetPortfolioRequest(BaseModel):
    initial_capital: float = Field(default=1000000, gt=0, description="初期資金（円）")

class AutoTradeConfig(BaseModel):
    max_budget_per_trade: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    enabled: Optional[bool] = None
