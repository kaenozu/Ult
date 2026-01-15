import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PositionSizer:
    """
    Calculates the optimal trade size using the Kelly Criterion
    and historical performance metrics.
    """

    def __init__(self, max_position_pct: float = 0.2, default_win_rate: float = 0.55):
        self.max_position_pct = max_position_pct
        self.default_win_rate = default_win_rate

    def calculate_size(self, ticker: str, total_equity: float, win_rate: float = None) -> Dict[str, Any]:
        """
        Uses Kelly Criterion: f* = (bp - q) / b
        f* = Fraction of capital to bet
        b = Net odds received on the wager (Profit/Loss ratio)
        p = Probability of winning
        q = Probability of losing (1-p)
        """
        p = win_rate if win_rate is not None else self.default_win_rate
        q = 1.0 - p

        # Assume generic b=1.5 (Profit 1.5x of Risk) if not specified
        b = 1.5

        kelly_f = (b * p - q) / b

        # Adjust for 'Fractional Kelly' for safety (e.g., half-Kelly)
        safe_f = max(0, kelly_f * 0.5)

        # Cap at max position size
        final_f = min(safe_f, self.max_position_pct)

        amount = total_equity * final_f

        return {
            "ticker": ticker,
            "equity_fraction": round(final_f, 4),
            "amount": round(amount, 0),
            "method": "Kelly Criterion (Half-Kelly)",
            "params": {"win_rate": p, "profit_loss_ratio": b},
        }
