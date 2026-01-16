"""
Trading Service Layer
ビジネスロジックをAPI層から分離
"""

import logging
from typing import Optional
from src.data_loader import fetch_stock_data, get_latest_price
from src.api.dependencies import get_paper_trader, get_portfolio_manager

logger = logging.getLogger(__name__)


class TradingService:
    """取引サービスクラス"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    async def get_stock_price(self, ticker: str) -> Optional[float]:
        """株価を取得（ビジネスロジック）"""
        try:
            # データ取得（バックエンドサービス経由）
            data_map = fetch_stock_data([ticker], period="5d")
            df = data_map.get(ticker)

            if df is None or df.empty:
                self.logger.warning(f"No data found for ticker: {ticker}")
                return None

            price = get_latest_price(df)

            if price <= 0:
                self.logger.warning(f"Invalid price for {ticker}: {price}")
                return None

            self.logger.info(f"Retrieved price for {ticker}: ${price:.2f}")
            return price

        except Exception as e:
            self.logger.error(f"Error fetching price for {ticker}: {e}")
            return None

    async def validate_trade_request(
        self, ticker: str, quantity: float, price: Optional[float]
    ) -> dict:
        """取引リクエストのバリデーション"""
        validation_result = {"is_valid": True, "errors": [], "warnings": []}

        # 基本バリデーション
        if not ticker or not isinstance(ticker, str):
            validation_result["is_valid"] = False
            validation_result["errors"].append("Invalid ticker")

        if not isinstance(quantity, (int, float)) or quantity <= 0:
            validation_result["is_valid"] = False
            validation_result["errors"].append("Invalid quantity")

        if quantity > 10000:  # 最大取引数量
            validation_result["warnings"].append("Large quantity trade")

        # 価格バリデーション
        if price is not None:
            if not isinstance(price, (int, float)) or price <= 0:
                validation_result["is_valid"] = False
                validation_result["errors"].append("Invalid price")

        return validation_result

    async def execute_trade_with_validation(
        self,
        ticker: str,
        action: str,
        quantity: float,
        requested_price: Optional[float] = None,
        strategy: str = "manual",
    ) -> dict:
        """バリデーション付き取引実行"""
        try:
            # 価格取得（指定がない場合）
            price = requested_price
            if price is None:
                price = await self.get_stock_price(ticker)
                if price is None:
                    return {
                        "success": False,
                        "error": "Could not fetch current price",
                        "error_code": "PRICE_UNAVAILABLE",
                    }

            # バリデーション
            validation = await self.validate_trade_request(ticker, quantity, price)
            if not validation["is_valid"]:
                return {
                    "success": False,
                    "error": "; ".join(validation["errors"]),
                    "error_code": "VALIDATION_FAILED",
                    "warnings": validation["warnings"],
                }

            # 依存関係取得（ここではモック）
            # pt = await get_paper_trader()
            # pm = await get_portfolio_manager()

            # 実際の取引実行（ここではシミュレーション）
            success = True  # 実際の実装では pt.execute_trade() を呼び出す

            if success:
                return {
                    "success": True,
                    "message": f"Trade executed: {action} {quantity} {ticker} @ ${price:.2f}",
                    "price": price,
                    "quantity": quantity,
                    "ticker": ticker,
                    "action": action,
                    "strategy": strategy,
                    "warnings": validation["warnings"],
                }
            else:
                return {
                    "success": False,
                    "error": "Trade execution failed",
                    "error_code": "EXECUTION_FAILED",
                }

        except Exception as e:
            self.logger.error(f"Trade execution error: {e}")
            return {
                "success": False,
                "error": "Internal trading error",
                "error_code": "INTERNAL_ERROR",
            }
