"""
Intelligent Position Sizer
Dynamically calculates position sizes based on multiple factors.
"""

import logging
from typing import Dict, Optional
import numpy as np

from src.kelly_criterion import KellyCriterion
from src.types import TradeSignal, PortfolioPosition, MarketRegime

logger = logging.getLogger(__name__)


class IntelligentPositionSizer:
    """
    Calculates optimal position sizes using multiple factors:
        pass
    - Kelly Criterion (base sizing)
    - Volatility adjustment
    - Portfolio correlation
    - Market regime
    - Signal confidence
    """

    def __init__(
        self,
        max_position_pct: float = 0.15,
        min_position_pct: float = 0.02,
        kelly_fraction: float = 0.25,  # Use 1/4 Kelly for safety
    ):
        self.max_position_pct = max_position_pct
        self.min_position_pct = min_position_pct
        self.kelly_fraction = kelly_fraction
        self.kelly = KellyCriterion()

    def calculate_position_size(
        self,
        signal: TradeSignal,
        total_equity: float,
        portfolio: Dict[str, PortfolioPosition],
        regime: Optional[MarketRegime] = None,
        volatility: Optional[float] = None,
    ) -> int:
        """
        Calculate optimal position size.

        Args:
            signal: Trade signal
            total_equity: Total portfolio equity
            portfolio: Current portfolio positions
            regime: Market regime information
            volatility: Asset volatility (annualized)

        Returns:
            Number of shares to trade
        """
        # 1. Base size from Kelly Criterion
        kelly_pct = self._calculate_kelly_size(signal)

        # 2. Volatility adjustment
        vol_adj = self._volatility_adjustment(volatility)

        # 3. Correlation adjustment
        corr_adj = self._correlation_adjustment(signal.ticker, portfolio)

        # 4. Regime adjustment
        regime_adj = self._regime_adjustment(regime)

        # 5. Confidence adjustment
        confidence_adj = signal.confidence

        # Combine all factors
        final_pct = kelly_pct * vol_adj * corr_adj * regime_adj * confidence_adj

        # Clip to min/max
        final_pct = np.clip(final_pct, self.min_position_pct, self.max_position_pct)

        # Calculate dollar amount
        position_value = total_equity * final_pct

        # Convert to shares
        shares = int(position_value / signal.price)

        logger.info(
            f"Position size for {signal.ticker}: {shares} shares "
            f"({final_pct:.1%} of equity, ¥{position_value:,.0f})"
        )

        return max(shares, 1)  # At least 1 share

    def _calculate_kelly_size(self, signal: TradeSignal) -> float:
        """Calculate Kelly Criterion position size."""
        # Estimate win probability from confidence
        win_prob = signal.confidence

        # Estimate win/loss ratio (simplified)
        # Assume 2:1 reward-to-risk ratio
        win_loss_ratio = 2.0

        # Kelly formula: (p * b - q) / b
        # where p = win prob, q = loss prob, b = win/loss ratio
        kelly_pct = (win_prob * win_loss_ratio - (1 - win_prob)) / win_loss_ratio

        # Use fractional Kelly for safety
        kelly_pct = kelly_pct * self.kelly_fraction

        # Ensure non-negative
        return max(kelly_pct, 0.01)

    def _volatility_adjustment(self, volatility: Optional[float]) -> float:
        """
        Adjust position size based on volatility.
        Higher volatility = smaller position.
        """
        if volatility is None:
            return 1.0

        # Normalize volatility (assume 20% is baseline)
        baseline_vol = 0.20

        if volatility <= baseline_vol:
            return 1.0
        else:
            # Reduce size proportionally to excess volatility
            adjustment = baseline_vol / volatility
            return max(adjustment, 0.5)  # At least 50% of base size

    def _correlation_adjustment(self, ticker: str, portfolio: Dict[str, PortfolioPosition]) -> float:
        """
        Adjust position size based on portfolio correlation.
        High correlation = smaller position (for diversification).
        """
        if not portfolio:
            return 1.0

        # Simplified: assume sector-based correlation
        # In practice, calculate actual correlation from price history

        # For now, reduce size if we already have positions
        num_positions = len(portfolio)

        if num_positions == 0:
            return 1.0
        elif num_positions < 5:
            return 0.9
        elif num_positions < 10:
            return 0.8
        else:
            return 0.7  # Reduce size for concentrated portfolios

    def _regime_adjustment(self, regime: Optional[MarketRegime]) -> float:
        """
        Adjust position size based on market regime.
        High volatility regime = smaller positions.
        """
        if regime is None:
            return 1.0

        regime.get("regime", "neutral")
        vix_level = regime.get("vix_level", 20.0)

        # Adjust based on VIX
        if vix_level < 15:
            # Low volatility: normal sizing
            return 1.0
        elif vix_level < 25:
            # Moderate volatility: slight reduction
            return 0.9
        elif vix_level < 35:
            # High volatility: significant reduction
            return 0.7
        else:
            # Extreme volatility: minimal sizing
            return 0.5
