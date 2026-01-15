import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class RiskParityRebalancer:
    """
    Optimizes portfolio weights using Risk Parity principles.
    Higher volatility assets get lower weights to equalize risk contribution.
    """

    def __init__(self, target_risk_pct: float = 0.02):
        self.target_risk_pct = target_risk_pct

    def calculate_weights(self, prices_dict: Dict[str, pd.DataFrame]) -> Dict[str, float]:
        """
        Calculate weights based on inverse volatility.
        """
        vols = {}
        for ticker, df in prices_dict.items():
            if df.empty or len(df) < 30:
                continue

            # Daily returns
            returns = df["Close"].pct_change().dropna()
            # Annualized Volatility
            vol = returns.std() * np.sqrt(252)
            if vol > 0:
                vols[ticker] = vol

        if not vols:
            return {}

        # Inverse Volatility weighting
        inv_vols = {t: 1.0 / v for t, v in vols.items()}
        total_inv_vol = sum(inv_vols.values())

        weights = {t: iv / total_inv_vol for t, iv in inv_vols.items()}

        logger.info(f"⚖️ Risk Parity Weights calculated for {len(weights)} assets.")
        return weights

    def suggest_rebalance(
        self, current_positions: Dict[str, Any], equity: float, weights: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Compares current positions to target weights and suggests trades.
        """
        suggestions = []
        for ticker, weight in weights.items():
            target_value = equity * weight
            current_value = current_positions.get(ticker, {}).get("market_value", 0.0)

            diff = target_value - current_value
            # Threshold: only rebalance if diff is > 5% of position or significant
            if abs(diff) > (equity * 0.01):
                suggestions.append(
                    {
                        "ticker": ticker,
                        "target_weight": weight,
                        "diff_value": diff,
                        "action": "BUY" if diff > 0 else "SELL",
                    }
                )

        return suggestions
