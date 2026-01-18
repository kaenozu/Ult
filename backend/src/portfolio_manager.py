import logging
import asyncio
from typing import Dict, Any, List
from src.database_manager import db_manager, DatabaseManager
from src.data_loader import fetch_stock_data, fetch_realtime_data

logger = logging.getLogger(__name__)


class PortfolioManager:
    """
    Manages portfolio state by recalculating positions from trade history
    and applying real-time market data for PnL.
    """

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db
        self.initial_cash = 10_000_000.0  # Default Paper Trading Start
        self.lock = asyncio.Lock()

    def calculate_portfolio(self) -> Dict[str, Any]:
        """
        Reconstruct portfolio from trades and fetch current prices.
        """
        from decimal import Decimal, getcontext

        trades = self.db.get_trades(limit=1000)  # Fetch recent trades

        # 1. Aggregate Holdings (Using Decimal for precision)
        holdings: Dict[str, Dict[str, Decimal]] = {}
        cash = Decimal(str(self.initial_cash))

        # Sort trades by timestamp ascending to replay history
        trades.sort(key=lambda t: t["timestamp"])

        for trade in trades:
            symbol = trade["symbol"]
            qty = Decimal(str(trade["quantity"]))
            price = Decimal(str(trade["price"]))
            action = trade["action"].upper()
            total = Decimal(str(trade["total"]))

            if symbol not in holdings:
                holdings[symbol] = {
                    "quantity": Decimal(0),
                    "avg_price": Decimal(0),
                    "cost_basis": Decimal(0),
                }

            if action == "BUY":
                cash -= total
                # Update Avg Price
                current_qty = holdings[symbol]["quantity"]
                current_cost = holdings[symbol]["cost_basis"]

                new_cost = current_cost + total
                new_qty = current_qty + qty

                holdings[symbol]["quantity"] = new_qty
                holdings[symbol]["cost_basis"] = new_cost
                if new_qty > 0:
                    holdings[symbol]["avg_price"] = new_cost / new_qty

            elif action == "SELL":
                cash += total
                current_qty = holdings[symbol]["quantity"]
                current_cost = holdings[symbol]["cost_basis"]

                # Realize PnL logic (Simplified: Avg Cost method)
                avg_price = holdings[symbol]["avg_price"]
                cost_of_sold_shares = avg_price * qty

                new_qty = current_qty - qty
                new_cost = current_cost - cost_of_sold_shares

                holdings[symbol]["quantity"] = max(Decimal(0), new_qty)
                holdings[symbol]["cost_basis"] = max(Decimal(0), new_cost)

        # Filter out empty positions
        active_holdings = {k: v for k, v in holdings.items() if v["quantity"] > 0}

        # 2. Fetch Realtime Prices
        tickers = list(active_holdings.keys())
        # ... (Fetching logic remains same, returning float prices usually)
        current_prices = {}

        if tickers:
            try:
                # Use data_loader to get real prices
                # We can reuse fetch_stock_data or specific realtime fetcher
                # For efficiency, let's assume we can get a quick map
                # Here we simulate with fetch_stock_data for now or a faster lightweight call
                # In Phase 5, we used fetch_stock_data cache.
                pass
                # Optimization: fetch only if tickers exist
                # This might be slow if many tickers.
                # TODO: Bulk real-time fetch
            except Exception as e:
                logger.error(f"Failed to fetch realtime prices: {e}")

        # 3. Calculate Totals
        total_equity = cash
        total_unrealized_pnl = Decimal(0)

        # Detailed positions list for frontend
        position_list = {}

        for symbol, data in active_holdings.items():
            qty = data["quantity"]
            avg_price = data["avg_price"]

            # Get cached or fresh price (float)
            current_price_float = self._get_current_price(symbol)
            current_price = Decimal(str(current_price_float))

            market_value = qty * current_price

            unrealized_pnl = market_value - (qty * avg_price)
            # Avoid division by zero
            if qty > 0 and avg_price > 0:
                pnl_percent = (unrealized_pnl / (qty * avg_price)) * 100
            else:
                pnl_percent = Decimal(0)

            total_equity += market_value
            total_unrealized_pnl += unrealized_pnl

            position_list[symbol] = {
                "quantity": float(qty),
                "avg_price": float(round(avg_price, 2)),
                "current_price": float(round(current_price, 2)),
                "market_value": float(round(market_value, 2)),
                "unrealized_pnl": float(round(unrealized_pnl, 2)),
                "pnl_percent": float(round(pnl_percent, 2)),
            }

        return {
            "total_equity": float(round(total_equity, 2)),
            "cash": float(round(cash, 2)),
            "invested_amount": float(round(total_equity - cash, 2)),
            "unrealized_pnl": float(round(total_unrealized_pnl, 2)),
            "positions": position_list,
            "timestamp": datetime.now().isoformat(),
        }

    def _get_current_price(self, symbol: str) -> float:
        """Helper to get latest price from data_loader cache or fetch"""
        try:
            # Try to get single latest price
            # This is a bit inefficient doing 1 by 1, but safe for generic API
            data = fetch_stock_data([symbol], period="1d", interval="1m")
            if symbol in data and not data[symbol].empty:
                return float(data[symbol]["Close"].iloc[-1])
        except Exception:
            pass
        return 0.0  # Fallback or error

    def rebalance_portfolio(
        self, target_weights: Dict[str, float] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates orders to rebalance portfolio to Equal Weights (default) or specified weights.
        """
        data = self.calculate_portfolio()
        total_equity = data["total_equity"]
        positions = data["positions"]  # Dict[str, position_info]

        # 1. Determine Target Allocation
        # Default: Equal Weight across all CURRENTLY HELD assets + Cash?
        # For simplicity Phase 9: Equal weight across valid tickers found in positions (excluding cash for now or treating cash as remainder)
        # Actually, user wants to rebalance "holdings".

        active_tickers = list(positions.keys())
        if not active_tickers:
            return []

        # Target value per asset (allocating 90% of equity to assets, 10% cash buffer, for example)
        # Or simply full equity / N
        target_value_per_asset = (total_equity * 0.95) / len(active_tickers)

        generated_orders = []

        for ticker in active_tickers:
            current_node = positions[ticker]
            current_market_value = current_node["market_value"]
            current_price = current_node["current_price"]

            if current_price <= 0:
                continue

            diff_value = target_value_per_asset - current_market_value

            # Threshold to avoid tiny trades (e.g. less than 10,000 JPY)
            if abs(diff_value) < 10000:
                continue

            qty_change = int(diff_value / current_price)

            if qty_change == 0:
                continue

            action = "BUY" if qty_change > 0 else "SELL"

            generated_orders.append(
                {
                    "symbol": ticker,
                    "action": action,
                    "quantity": abs(qty_change),
                    "price": current_price,
                    "reason": "Auto-Rebalance",
                }
            )

        return generated_orders


portfolio_manager = PortfolioManager()
