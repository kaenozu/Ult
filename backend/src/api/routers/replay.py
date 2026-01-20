from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime
import json
import logging

from src.paper_trader import PaperTrader
from src.analysis.performance_analyzer import PerformanceAnalyzer

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
    TODO: Implement full snapshot retrieval.
    """
    # This would require querying by ID, which get_trade_history doesn't support directly yet
    # For Phase 10 MVP, history includes the context, so this might be redundant unless payloads are huge.
    return {"status": "Not implemented, use /history"}

@router.get("/analytics", response_model=Dict[str, Any])
async def get_performance_analytics(trader: PaperTrader = Depends(get_paper_trader)):
    """
    Get performance metrics (Sharpe, WinRate, etc.)
    """
    # Fetch all history for analysis
    df = trader.get_trade_history(limit=10000)
    
    # Calculate PnL per trade is tricky because 'orders' table splits BUY/SELL.
    # We need to match distinct trades (Round-Trip) to calculate true Win Rate.
    # This logic belongs in PerformanceAnalyzer but requires 'trades' not 'orders'.
    # For MVP: We only export raw orders. The frontend or Analyzer must reconstruct round-trips.
    
    # BUT, to show *something* useful:
    # We can calculate "Daily PnL" from the balance table
    balance_df = trader.get_equity_history(days=365)
    
    # Use Analyzer on Equity Curve
    # Construct a 'trades' list from daily changes for Sharpe Calculation
    daily_returns = balance_df['total_equity'].pct_change().dropna()
    
    # Mocking standard analyzer usage for now just to return 'balance' stats
    return {
        "current_equity": float(balance_df['total_equity'].iloc[-1]) if not balance_df.empty else 0,
        "daily_returns": daily_returns.tolist(),
        "equity_curve": balance_df.to_dict(orient="records")
    }

