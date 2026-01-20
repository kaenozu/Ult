"""
Trading API Routes v1
取引関連のAPIエンドポイント v1
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..dependencies import get_trading_engine
from ...utils.validators import validate_trade_signal

router = APIRouter()


class TradeRequest(BaseModel):
    """取引リクエストモデル"""

    ticker: str = Field(..., description="銘柄コード")
    action: str = Field(..., description="取引アクション (BUY/SELL)")
    quantity: int = Field(..., gt=0, description="取引数量")
    price: float = Field(..., gt=0, description="取引価格")
    confidence: float = Field(..., ge=0, le=1, description="AI信頼度")
    reason: str = Field(..., min_length=5, max_length=500, description="取引理由")
    risk_score: Optional[float] = Field(None, ge=0, le=1, description="リスクスコア")


class TradeResponse(BaseModel):
    """取引レスポンスモデル"""

    success: bool
    trade_id: Optional[str] = None
    message: str
    timestamp: str


class PositionResponse(BaseModel):
    """ポジションレスポンスモデル"""

    ticker: str
    quantity: int
    entry_price: float
    current_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    market_value: float


class OrderStatusResponse(BaseModel):
    """注文ステータスレスポンス"""

    order_id: str
    status: str
    filled_quantity: Optional[int] = None
    filled_price: Optional[float] = None
    created_at: str
    updated_at: str


@router.post(
    "/trades", response_model=TradeResponse, status_code=status.HTTP_201_CREATED
)
async def execute_trade(
    trade_request: TradeRequest, engine=Depends(get_trading_engine)
):
    """
    取引を実行
    """
    try:
        # 取引シグナルを検証
        validated_signal = validate_trade_signal(trade_request.dict())

        # 取引を実行
        result = await engine.execute_trade(validated_signal)

        return TradeResponse(
            success=result.get("success", False),
            trade_id=result.get("trade_id"),
            message=result.get("message", "Trade executed successfully"),
            timestamp=result.get("timestamp", ""),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid trade request: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute trade",
        )


@router.get("/positions", response_model=List[PositionResponse])
async def get_positions(engine=Depends(get_trading_engine)):
    """
    保有ポジション一覧を取得
    """
    try:
        positions_data = await engine.get_positions()

        positions = []
        for pos in positions_data.get("positions", []):
            position = PositionResponse(**pos)
            positions.append(position)

        return positions

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve positions",
        )


@router.get("/orders/{order_id}", response_model=OrderStatusResponse)
async def get_order_status(order_id: str, engine=Depends(get_trading_engine)):
    """
    注文ステータスを取得
    """
    try:
        order_data = await engine.get_order_status(order_id)

        if not order_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        return OrderStatusResponse(**order_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order status",
        )


@router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, engine=Depends(get_trading_engine)):
    """
    注文をキャンセル
    """
    try:
        result = await engine.cancel_order(order_id)

        if not result.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Failed to cancel order"),
            )

        return {"message": "Order cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order",
        )


@router.get("/trades/history")
async def get_trade_history(
    limit: int = 50, offset: int = 0, engine=Depends(get_trading_engine)
):
    """
    取引履歴を取得
    """
    try:
        history = await engine.get_trade_history(limit=limit, offset=offset)
        return history

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve trade history",
        )


@router.post("/trades/simulate")
async def simulate_trade(
    trade_request: TradeRequest, engine=Depends(get_trading_engine)
):
    """
    取引をシミュレート（実行せずに結果を予測）
    """
    try:
        # 取引シグナルを検証
        validated_signal = validate_trade_signal(trade_request.dict())

        # シミュレーションを実行
        simulation_result = await engine.simulate_trade(validated_signal)

        return {"success": True, "simulation": simulation_result}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid trade request: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to simulate trade",
        )
