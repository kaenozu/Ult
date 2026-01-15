import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ParameterOptimizer:
    """
    Optimizes trading parameters (e.g., stop-loss, take-profit)
    based on recent performance and market volatility.
    """

    def __init__(self, base_config: Dict[str, Any]):
        self.config = base_config

    def optimize_parameters(self, performance_data: Dict[str, Any], market_vix: float) -> Dict[str, Any]:
        """
        Dynamically adjusts parameters.
        Logic:
            pass
        - If Win Rate is high, slightly tighten stop-loss to lock in gains faster.
        - If VIX is high, widen stop-loss to avoid being 'whipsawed'.
        """
        win_rate = performance_data.get("win_rate", 0.5)

        # Base settings
        stop_loss = 0.05  # 5%
        take_profit = 0.10  # 10%

        # Volatility adjustment
        if market_vix > 30:
            stop_loss = 0.07  # Widen to 7% in high vol
            logger.info(f"Wide stops enabled due to high VIX ({market_vix:.1f})")

        # Performance adjustment
        if win_rate > 0.6:
            take_profit = 0.15  # Be more aggressive if winning
            logger.info(f"Aggressive take-profit enabled due to high win-rate ({win_rate:.1%})")

        return {
            "stop_loss_pct": stop_loss,
            "take_profit_pct": take_profit,
            "max_position_size_pct": 0.15 if market_vix < 25 else 0.10,
        }
