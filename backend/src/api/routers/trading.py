from fastapi import APIRouter, Depends, HTTPException
import logging

from src.api.schemas import TradeRequest, TradeResponse, AutoTradeConfig
from src.api.dependencies import get_paper_trader, get_auto_trader, get_portfolio_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/trade", response_model=TradeResponse)
async def execute_trade(
    request: TradeRequest,
    pt = Depends(get_paper_trader),
    pm = Depends(get_portfolio_manager)
):
    """取引を実行"""
    try:
        # 価格を取得（指定がなければ最新価格）
        price = request.price
        if price is None:
            from src.data_loader import fetch_stock_data, get_latest_price
            # Fetch recent data to get the latest price
            data_map = fetch_stock_data([request.ticker], period="5d")
            df = data_map.get(request.ticker)
            price = get_latest_price(df)
            
            if price <= 0:
                raise HTTPException(status_code=400, detail="Could not fetch price")
        
        # Async Irony: Use PortfolioManager lock to prevent race with rebalancing
        async with pm.lock:
            success = pt.execute_trade(
                ticker=request.ticker,
                action=request.action,
                quantity=request.quantity,
                price=price,
                strategy=request.strategy,
            )
        
        return TradeResponse(
            success=success,
            message=f"Trade {'executed' if success else 'failed'}: {request.action} {request.quantity} {request.ticker} @ {price}",
            order_id=None # TODO: Return actual Order ID
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/autotrade")
async def get_autotrade_status(at = Depends(get_auto_trader)):
    """自動売買の状態を取得"""
    return at.get_status()

@router.post("/config/autotrade")
async def configure_autotrade(config: AutoTradeConfig, at = Depends(get_auto_trader)):
    """自動売買の設定変更 / ON-OFF切り替え"""
    if config.enabled is not None:
        if config.enabled:
            at.start()
        else:
            at.stop()
    
    if config.max_budget_per_trade:
        at.max_budget_per_trade = config.max_budget_per_trade
    if config.stop_loss_pct:
        at.stop_loss_pct = config.stop_loss_pct
        
    return at.get_status()
