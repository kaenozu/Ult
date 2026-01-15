"""
Kelly Criterion for Position Sizing (Phase 30-3)

This module calculates optimal position sizes using the Kelly Criterion.
f* = (p * b - q) / b
where:
    pass
- p: Probability of winning
- b: Win/Loss ratio (Average Gain / Average Loss)
- q: Probability of losing (1 - p)
"""

import logging

import pandas as pd

logger = logging.getLogger(__name__)


class KellyCriterion:
    def __init__(self, half_kelly: bool = True, max_position_size: float = 0.2):
        self.half_kelly = half_kelly
        self.max_position_size = max_position_size

    def calculate_size(self, win_rate: float, win_loss_ratio: float) -> float:
        """
        Calculate optimal position size using Kelly Criterion.

        Args:
            win_rate: Probability of winning (0.0 to 1.0)
            win_loss_ratio: Average Gain / Average Loss (must be > 0)

        Returns:
            Optimal position size (0.0 to 1.0)
        """
        if win_loss_ratio <= 0:
            return 0.0

        p = win_rate
        q = 1.0 - p
        b = win_loss_ratio

        kelly_fraction = (p * b - q) / b

        if kelly_fraction < 0:
            return 0.0

        if self.half_kelly:
            kelly_fraction *= 0.5

        # Cap at max position size
        return min(kelly_fraction, self.max_position_size)

    def calculate_from_history(self, returns: pd.Series) -> float:
        """
        Calculate Kelly size from historical returns.

        Args:
            returns: Series of trade returns (pct change)

        Returns:
            Optimal position size
        """
        if returns is None or returns.empty:
            return 0.0

        wins = returns[returns > 0]
        losses = returns[returns < 0]

        if len(wins) == 0:
            return 0.0

        if len(losses) == 0:
            return self.max_position_size

        win_rate = len(wins) / len(returns)
        avg_win = wins.mean()
        avg_loss = abs(losses.mean())

        if avg_loss == 0:
            return self.max_position_size

        win_loss_ratio = avg_win / avg_loss

        return self.calculate_size(win_rate, win_loss_ratio)
