from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
import logging

from src.api.schemas import PortfolioSummary, Position
from src.api.dependencies import get_paper_trader

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/portfolio", response_model=PortfolioSummary)
async def get_portfolio(pt = Depends(get_paper_trader)):
    """ポートフォリオサマリーを取得"""
    try:
        balance = pt.get_current_balance()
        positions = pt.get_positions()
        return PortfolioSummary(
            total_equity=balance.get("total_equity", 0),
            cash=balance.get("cash", 0),
            invested_amount=balance.get("invested_amount", 0),
            unrealized_pnl=balance.get("unrealized_pnl", 0),
            position_count=len(positions) if not positions.empty else 0,
        )
    except Exception as e:
        logger.error(f"Error getting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/positions", response_model=List[Position])
async def get_positions(pt = Depends(get_paper_trader)):
    """保有ポジション一覧を取得"""
    try:
        positions_df = pt.get_positions()
        if positions_df.empty:
            return []
        
        return [
            Position(
                ticker=row["ticker"],
                quantity=int(row["quantity"]),
                avg_price=float(row["avg_price"]),
                current_price=row.get("current_price"), # If available
                unrealized_pnl=row.get("unrealized_pnl"), # If available
            )
            for _, row in positions_df.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
