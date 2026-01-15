import logging
from typing import Dict, List, Any
from src.schemas import TradingDecision

logger = logging.getLogger(__name__)


class HedgingManager:
    """
    Suggests hedging positions based on macro market instability.
    Targets Inverse are ETFs or assets that move opposite to the main market.
    """

    # Example hedging targets (Japan & US)
    HEDGE_TARGETS = {
        "JP": [
            {
                "ticker": "1357.T",
                "name": "NF日経ダブルインバース",
                "type": "Inverse ETF",
            },
            {
                "ticker": "1360.T",
                "name": "楽天日経ダブルインバース",
                "type": "Inverse ETF",
            },
        ],
        "US": [
            {"ticker": "VXX", "name": "VIX Short-Term Futures", "type": "Volatility"},
            {"ticker": "SH", "name": "ProShares Short S&P500", "type": "Inverse ETF"},
        ],
    }

    def evaluate_hedging_needs(self, macro_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyzes macro score and suggests hedges if instability is high.
        """
        macro_score = macro_data.get("macro_score", 100)
        vix_data = macro_data.get("vix", {})
        vix_val = vix_data.get("value", 15.0)

        proposals = []

        # Trigger logic: Macro Score < 40 or VIX > 25
        if macro_score < 40 or vix_val > 25:
            logger.warning(f"High risk detected (Macro: {macro_score}, VIX: {vix_val}). Proposing hedges.")

            # Propose 1-2 hedge symbols
            region = "JP"  # Default to JP for this context
            for asset in self.HEDGE_TARGETS[region]:
                proposals.append(
                    {
                        "ticker": asset["ticker"],
                        "name": asset["name"],
                        "action": "BUY",
                        "reason": f"Automated hedge triggered by Macro Score ({macro_score:.1f}) and VIX ({vix_val:.1f}).",
                        "priority": "HIGH" if macro_score < 30 else "MEDIUM",
                    }
                )

        return proposals

    def apply_hedging_logic_to_decision(
        self,
        ticker: str,
        original_decision: TradingDecision,
        macro_data: Dict[str, Any],
    ) -> TradingDecision:
        """
        Adjusts an individual stock decision based on hedging needs.
        If market is crashing, convert BUY to HOLD or SELL unless it's a defensive stock.
        """
        macro_score = macro_data.get("macro_score", 100)

        if macro_score < 35 and original_decision == TradingDecision.BUY:
            logger.info(f"Downgrading BUY to HOLD for {ticker} due to extreme macro risk.")
            return TradingDecision.HOLD

        return original_decision
