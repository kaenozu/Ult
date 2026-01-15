import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class TaxOptimizer:
    """
    Identifies opportunities to reduce tax burden via Loss Harvesting.
    Optimized for Japan/US tax seasons (conceptual).
    """

    def __init__(self, tax_rate: float = 0.20315):  # Japan standard
        self.tax_rate = tax_rate

    def find_harvesting_opportunities(self, portfolio: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyzes holdings for unrealized losses that can offset realized gains.
        """
        realized_gains = portfolio.get("realized_gains_ytd", 0.0)
        positions = portfolio.get("positions", [])

        proposals = []

        # Only suggest if we have something to offset
        if realized_gains <= 0:
            logger.info("No realized gains to offset. Skipping tax optimization.")
            return []

        # Find positions with significant unrealized loss
        for pos in positions:
            unrealized_pnl = pos.get("unrealized_pnl", 0.0)
            ticker = pos.get("ticker")

            if unrealized_pnl < -50000:  # Example threshold: 50,000 JPY loss
                tax_savings = abs(unrealized_pnl) * self.tax_rate

                proposals.append(
                    {
                        "ticker": ticker,
                        "action": "TAX_LOSS_HARVEST",
                        "unrealized_pnl": unrealized_pnl,
                        "estimated_tax_savings": round(tax_savings, 0),
                        "reason": f"Realize loss of {abs(unrealized_pnl):,.0f} to offset YTD gains and save ~{tax_savings:,.0f} in taxes.",
                    }
                )

        return proposals

    def optimize_order_size(self, ticker: str, total_amount: float, avg_daily_volume: float) -> Dict[str, Any]:
        """
        Suggests splitting large orders to minimize market impact (slippage).
        """
        # If total amount > 1% of daily volume, suggest splitting
        impact_threshold = avg_daily_volume * 0.01

        if total_amount > impact_threshold:
            num_chunks = int(total_amount / (impact_threshold / 2)) + 1
            return {
                "action": "SPLIT_ORDER",
                "ticker": ticker,
                "chunks": num_chunks,
                "reason": f"Order size ({total_amount:,.0f}) exceeds 1% of daily volume. Splitting into {num_chunks} chunks to reduce impact.",
            }

        return {"action": "SINGLE_ORDER", "ticker": ticker}
