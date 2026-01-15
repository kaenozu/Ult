import logging
from typing import Dict, List, Any
from src.data.macro_loader import MacroLoader
from src.strategies.hedging_manager import HedgingManager

logger = logging.getLogger(__name__)


class AdaptiveRebalancer:
    """
    Orchestrates portfolio adjustments based on market regime.
    """

    def __init__(self):
        self.macro_loader = MacroLoader()
        self.hedge_manager = HedgingManager()

    def run_rebalance_check(self, portfolio: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Main entry point for daily/hourly rebalance checks.
        Returns a list of proposed actions (SELL/BUY).
        """
        logger.info("Starting adaptive rebalance check...")

        # 1. Get current market context
        macro_data = self.macro_loader.fetch_macro_data()
        macro_score = macro_data.get("macro_score", 100)

        actions = []

        # 2. Check for Hedging Needs
        hedge_proposals = self.hedge_manager.evaluate_hedging_needs(macro_data)
        actions.extend(hedge_proposals)

        # 3. Adjust Existing Positions (De-risking)
        if macro_score < 45:
            logger.warning(f"Macro Score {macro_score:.1f} is low. Evaluating portfolio trimming.")
            for pos in portfolio.get("positions", []):
                ticker = pos.get("ticker")
                profit_pct = pos.get("profit_pct", 0.0)

                # If macro is bad, be more aggressive with profit taking
                if profit_pct > 3.0:
                    actions.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "percentage": 50,  # Sell half to lock in gains
                            "reason": f"Defensive rebalance: Macro Score is low ({macro_score:.1f}). Trimming profitable position.",
                        }
                    )

                # If macro is bad, tighten stop losses (conceptual)
                elif profit_pct < -2.0:
                    actions.append(
                        {
                            "ticker": ticker,
                            "action": "SELL",
                            "percentage": 100,
                            "reason": f"Defensive rebalance: Macro Score is low ({macro_score:.1f}). Cutting losses early.",
                        }
                    )

        return actions
