import logging
import asyncio
from typing import Dict, Any, List
from src.database_manager import db_manager, DatabaseManager
from src.data.data_loader import fetch_stock_data, fetch_realtime_data

logger = logging.getLogger(__name__)

class PortfolioManager:
    """
    Manages portfolio state by recalculating positions from trade history
    and applying real-time market data for PnL.
    """
    
    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db
        self.initial_cash = 10_000_000.0
        self.lock = asyncio.Lock()
        
        # Lazy import to avoid circular dependency if any
        # Real-time dependency injection would be better, but for now:
        from src.api.dependencies import get_paper_trader
        self.pt = get_paper_trader()

    def calculate_portfolio(self) -> Dict[str, Any]:
        """
        Retrieve portfolio state from PaperTrader (Source of Truth).
        """
        # 1. Get Balance Summary
        summary = self.pt.get_current_balance()
        
        # 2. Get Positions
        df_positions = self.pt.get_positions()
        
        position_list = {}
        if not df_positions.empty:
            for _, row in df_positions.iterrows():
                symbol = row['ticker']
                position_list[symbol] = {
                    "quantity": float(row['quantity']),
                    "avg_price": float(row['avg_price']),
                    "current_price": float(row['current_price']),
                    "market_value": float(row['market_value']),
                    "unrealized_pnl": float(row['unrealized_pnl']),
                    "pnl_percent": float(row['unrealized_pnl_pct']) * 100, # convert to %
                    "sector": row.get('sector', 'Market')
                }

        return {
            "total_equity": summary['total_equity'],
            "cash": summary['cash'],
            "invested_amount": summary['invested_amount'],
            "unrealized_pnl": summary['unrealized_pnl'],
            "positions": position_list,
            "timestamp": "now"
        }

    # Removed _get_current_price as it's no longer used efficiently

    def rebalance_portfolio(self, target_weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """
        Generates orders to rebalance portfolio to Equal Weights (default) or specified weights.
        """
        data = self.calculate_portfolio()
        total_equity = data['total_equity']
        positions = data['positions'] # Dict[str, position_info]
        
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
            current_market_value = current_node['market_value']
            current_price = current_node['current_price']
            
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
            
            generated_orders.append({
                "symbol": ticker,
                "action": action,
                "quantity": abs(qty_change),
                "price": current_price,
                "reason": "Auto-Rebalance"
            })
            
        return generated_orders

portfolio_manager = PortfolioManager()