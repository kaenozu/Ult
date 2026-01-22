from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
import logging

from src.api.schemas import PortfolioSummary, Position
from src.api.dependencies import get_portfolio_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/portfolio", response_model=PortfolioSummary)
async def get_portfolio(pm=Depends(get_portfolio_manager)):
    """ポートフォリオサマリーを取得"""
    try:
        data = pm.calculate_portfolio()

        return PortfolioSummary(
            total_equity=data.get("total_equity", 0),
            cash=data.get("cash", 0),
            invested_amount=data.get("invested_amount", 0),
            unrealized_pnl=data.get("unrealized_pnl", 0),
            position_count=len(data.get("positions", [])),
        )
    except Exception as e:
        logger.error(f"Error getting portfolio: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions", response_model=List[Position])
async def get_positions(pm=Depends(get_portfolio_manager)):
    """保有ポジション一覧を取得"""
    try:
        data = pm.calculate_portfolio()
        positions_map = data.get("positions", {})

        return [
            Position(
                ticker=ticker,
                quantity=int(info["quantity"]),
                avg_price=float(info["avg_price"]),
                current_price=float(info["current_price"]),
                unrealized_pnl=float(info["unrealized_pnl"]),
            )
            for ticker, info in positions_map.items()
        ]
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/advice")
async def get_ai_advice(pm=Depends(get_portfolio_manager)):
    """AI投資助言取得"""
    from src.ai_advisor import ai_advisor
    from src.data.data_loader import fetch_stock_data
    from src.regime_detector import RegimeDetector

    # 1. Get Portfolio
    portfolio_data = pm.calculate_portfolio()

    # 2. Detect Regime (Using Toyota 7203.T as proxy)
    regime = "ranging"
    try:
        df = fetch_stock_data(["7203.T"], period="6mo")
        if "7203.T" in df:
            detector = RegimeDetector()
            regime = detector.detect_regime(df["7203.T"])
    except ConnectionError as e:
        logger.warning(f"Market data connection failed: {e}")
        regime = "ranging"
    except Exception as e:
        logger.error(f"Regime detection failed: {e}")
        raise HTTPException(status_code=503, detail="Market data service unavailable")

    # 3. Analyze
    try:
        advice = ai_advisor.analyze_portfolio(portfolio_data, regime)
    except Exception as e:
        logger.error(f"AI advisor failed: {e}")
        raise HTTPException(status_code=500, detail="AI analysis service unavailable")

    return advice


@router.post("/rebalance")
async def execute_rebalance(pm=Depends(get_portfolio_manager)):
    """ポートフォリオ自動リバランス実行"""
    from src.database_manager import db_manager

    async with pm.lock:
        orders = pm.rebalance_portfolio()
        executed_count = 0

        for order in orders:
            try:
                # Reusing log logic manually since we are inside API
                db_manager.save_trade(
                    symbol=order["symbol"],
                    action=order["action"],
                    quantity=order["quantity"],
                    price=order["price"],
                    status="filled",  # Immediate fill for Paper Trading
                )
                executed_count += 1
            except Exception as e:
                logger.error(f"Rebalance Order Failed: {e}")

    return {
        "message": f"Rebalancing Complete. Executed {executed_count} trades.",
        "orders": orders,
    }
