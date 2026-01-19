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

    def calculate_size(self, ticker: str, total_equity: float, win_rate: float = None, sentiment_score: float = 0.0) -> Dict[str, Any]:
        """
        Uses Kelly Criterion: f* = (bp - q) / b
        f* = Fraction of capital to bet
        b = Net odds received on the wager (Profit/Loss ratio)
        p = Probability of winning
        q = Probability of losing (1-p)
        
        Sentiment Score (-1.0 to 1.0) adjusts 'p' (Win Rate)
        """
        base_p = win_rate if win_rate is not None else self.default_win_rate
        
        # Neural Adjustment: 
        # Shift win probability by up to +/- 10% based on sentiment
        # e.g. Score 0.8 -> +8% win rate assumption
        sentiment_impact = sentiment_score * 0.10
        p = min(0.9, max(0.1, base_p + sentiment_impact))
        
        q = 1.0 - p

        # Assume generic b=1.5 (Profit 1.5x of Risk) if not specified
        b = 1.5

        kelly_f = (b * p - q) / b

        # Adjust for 'Fractional Kelly' for safety (e.g., half-Kelly)
        # However, high confidence (sentiment) can increase this fraction
        fraction_multiplier = 0.5
        if sentiment_score > 0.8:
            fraction_multiplier = 0.8 # Go bigger on conviction
        
        safe_f = max(0, kelly_f * fraction_multiplier)

        # Cap at max position size
        final_f = min(safe_f, self.max_position_pct)

        amount = total_equity * final_f

        return {
            "ticker": ticker,
            "equity_fraction": round(final_f, 4),
            "amount": round(amount, 0),
            "method": "Neural Kelly",
            "params": {
                "base_win_rate": base_p,
                "adjusted_win_rate": p, 
                "sentiment_impact": sentiment_impact,
                "kelly_fraction": fraction_multiplier
            },
        }
