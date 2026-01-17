from fastapi import APIRouter, Depends, HTTPException
import logging

from src.api.schemas import TradeRequest, TradeResponse, AutoTradeConfig
from src.api.dependencies import (
    get_paper_trader,
    get_portfolio_manager,
    get_auto_trader,
)
from src.services.trading_service import TradingService

router = APIRouter()
logger = logging.getLogger(__name__)

trading_service = TradingService()


@router.post("/trade", response_model=TradeResponse)
async def execute_trade(
    request: TradeRequest,
    pt=Depends(get_paper_trader),
    pm=Depends(get_portfolio_manager),
):
    """取引を実行（リファクタリング済み）"""
    try:
        # サービス層を使用して取引を実行
        result = await trading_service.execute_trade_with_validation(
            ticker=request.ticker,
            action=request.action,
            quantity=request.quantity,
            requested_price=request.price,
            strategy=request.strategy or "manual",
        )

        if result["success"]:
            # 実際の取引実行（既存の依存関係を使用）
            async with pm.lock:
                success = pt.execute_trade(
                    ticker=request.ticker,
                    action=request.action,
                    quantity=request.quantity,
                    price=result["price"],
                    strategy=result["strategy"],
                )

            return TradeResponse(
                success=success,
                message=result["message"],
                order_id=None,  # TODO: Return actual Order ID
            )
        else:
            # バリデーションエラー
            error_detail = result["error"]
            if result.get("warnings"):
                error_detail += f" (Warnings: {', '.join(result['warnings'])})"

            raise HTTPException(status_code=400, detail=error_detail)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        # 情報漏洩防止のため、詳細なエラーメッセージを返さない
        raise HTTPException(
            status_code=500, detail="Internal server error during trade execution"
        )


@router.get("/status/autotrade")
async def get_autotrade_status(at=Depends(get_auto_trader)):
    """自動売買の状態を取得"""
    return at.get_status()


@router.post("/config/autotrade")
async def configure_autotrade(config: AutoTradeConfig, at=Depends(get_auto_trader)):
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
