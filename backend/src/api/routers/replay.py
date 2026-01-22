from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import logging
import pandas as pd
import numpy as np

from src.paper_trader import PaperTrader
from src.backtesting.engine import BacktestEngine
from src.data.data_loader import fetch_stock_data
from src.strategies.technical.rsi_strategy import RSIStrategy
# Try import other strategies dynamically or use a simple one for demo
try:
    from src.strategies.range_strategy import GuerillaStrategy
except ImportError:
    GuerillaStrategy = None

router = APIRouter(prefix="/api/v1/replay", tags=["replay"])
logger = logging.getLogger(__name__)

# Helper to get PaperTrader instance (Dependency Injection mock)
def get_paper_trader():
    # In a real app, this should return the singleton instance used by the Agent
    # For now, we instantiate a readonly connection to the same DB
    return PaperTrader()

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_trade_history(limit: int = 100, trader: PaperTrader = Depends(get_paper_trader)):
    """
    Get generic trade history.
    """
    df = trader.get_trade_history(limit=limit)
    if df.empty:
        return []

    # SQLite returns JSON strings for thought_context if stored that way.
    # We need to parse them back to dicts for the API response if they are strings.
    trades = df.to_dict(orient="records")
    for trade in trades:
        if "thought_context" in trade and isinstance(trade["thought_context"], str):
             try:
                 trade["thought_context"] = json.loads(trade["thought_context"])
             except:
                 pass
    return trades

@router.get("/snapshot/{trade_id}")
async def get_trade_snapshot(trade_id: int):
    """
    Get detailed snapshot for a specific trade (Thought, Market State).
    """
    # For now, we return a mock structure if we can't query by ID easily
    # Or we can scan the recent history.
    # Ideally, we should add `get_order_by_id` to PaperTrader.
    return {"status": "Not fully implemented, rely on /history context"}

@router.get("/analytics", response_model=Dict[str, Any])
async def get_performance_analytics(trader: PaperTrader = Depends(get_paper_trader)):
    """
    Get performance metrics (Sharpe, WinRate, etc.)
    """
    # Fetch all history for analysis
    df = trader.get_trade_history(limit=10000)

    balance_df = trader.get_equity_history(days=365)

    daily_returns = []
    if not balance_df.empty and 'total_equity' in balance_df.columns:
         daily_returns = balance_df['total_equity'].pct_change().dropna().tolist()

    return {
        "current_equity": float(balance_df['total_equity'].iloc[-1]) if not balance_df.empty else 0,
        "daily_returns": daily_returns,
        "equity_curve": balance_df.to_dict(orient="records")
    }

class ChaosSimulationRequest(Dict[str, Any]):
    # Pydantic model is better but using dict for flexibility for now
    pass

@router.post("/simulate")
async def run_chaos_simulation(payload: Dict[str, Any] = Body(...)):
    """
    Run an on-demand backtest with chaos parameters.

    Payload:
    {
        "ticker": "7203.T",
        "days": 90,
        "chaos": {
            "packet_loss_prob": 0.1,
            "slippage_std_dev": 0.05
        }
    }
    """
    try:
        ticker = payload.get("ticker", "7203.T")
        days = int(payload.get("days", 90))
        chaos_config = payload.get("chaos", {})

        # 1. Fetch Data
        # Calculate start date
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days + 60) # +60 buffer for indicators

        # We need a period string for yfinance
        period = "1y"
        if days < 30: period = "3mo"
        elif days > 365: period = "2y"

        logger.info(f"Fetching data for {ticker} over {period}...")
        data_map = fetch_stock_data([ticker], period=period)
        if not data_map or ticker not in data_map:
             raise HTTPException(status_code=404, detail=f"No data found for {ticker}")

        df = data_map[ticker]

        # 2. Select Strategy
        # For demo, we use Guerilla if available, else RSI
        if GuerillaStrategy:
             strategy = GuerillaStrategy()
        else:
             strategy = RSIStrategy()

        # 3. Run Simulation (Normal)
        logger.info("Running baseline simulation...")
        engine_normal = BacktestEngine(initial_capital=1000000)
        res_normal = engine_normal.run(df, strategy)

        # 4. Run Simulation (Chaos)
        logger.info(f"Running chaos simulation with {chaos_config}...")
        engine_chaos = BacktestEngine(initial_capital=1000000, chaos_config=chaos_config)
        res_chaos = engine_chaos.run(df, strategy)

        # 5. Format Results
        def format_curve(res):
            if res is None: return []
            curve = res.get("equity_curve")
            if isinstance(curve, pd.Series):
                 # Convert to list of dicts: {date: val, value: val}
                 return [{"date": d.isoformat(), "value": float(v)} for d, v in curve.items()]
            return []

        return {
            "ticker": ticker,
            "strategy": strategy.__class__.__name__,
            "baseline": {
                "total_return": float(res_normal.get("total_return", 0)),
                "sharpe": float(res_normal.get("sharpe_ratio", 0)),
                "trades": res_normal.get("num_trades", 0),
                "curve": format_curve(res_normal)
            },
            "chaos": {
                "total_return": float(res_chaos.get("total_return", 0)),
                "sharpe": float(res_chaos.get("sharpe_ratio", 0)),
                "trades": res_chaos.get("num_trades", 0),
                "curve": format_curve(res_chaos)
            }
        }

    except Exception as e:
        logger.error(f"Simulation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
