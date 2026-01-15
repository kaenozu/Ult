"""
Meta Registry for Strategy-Regime Mapping.
Defines which strategies are best suited for specific market conditions.
"""

from src.strategies import (
    BollingerBandsStrategy,
    CombinedStrategy,
    DeepLearningStrategy,
    EnsembleStrategy,
    LightGBMStrategy,
    MultiTimeframeStrategy,
    RLStrategy,
    RSIStrategy,
    SentimentStrategy,
    SMACrossoverStrategy,
    TransformerStrategy,
)

# Universal strategies that should run in all conditions
UNIVERSAL_STRATEGIES = [
    EnsembleStrategy,  # The Meta-Model
    SentimentStrategy,  # News impact is independent of price action
    DeepLearningStrategy,  # Robust ML
    LightGBMStrategy,  # Robust ML
]

# Regime-Specific Strategy Mapping
# Keys match src.regime_detector.RegimeDetector._classify_regime output
REGIME_STRATEGY_MAP = {
    "trending_up": [
        SMACrossoverStrategy,
        MultiTimeframeStrategy,
        TransformerStrategy,  # Good at catching trends
    ],
    "trending_down": [
        SMACrossoverStrategy,
        MultiTimeframeStrategy,
        # Shorting strategies would go here
    ],
    "ranging": [
        RSIStrategy,
        BollingerBandsStrategy,
    ],
    "low_volatility": [
        RSIStrategy,  # scalping in quiet markets
        CombinedStrategy,
    ],
    "high_volatility": [
        BollingerBandsStrategy,  # Mean reversion at extremes
        RLStrategy,  # Adaptive agent for complex conditions
    ],
    "uncertain": [
        CombinedStrategy,  # Conservative multi-factor
    ],
}


def get_strategies_for_regime(regime: str) -> list:
    """
    Returns a list of Strategy Classes for the given regime.
    Always includes UNIVERSAL_STRATEGIES.
    """
    # 1. Start with Universal
    strategy_classes = list(UNIVERSAL_STRATEGIES)

    # 2. Add Regime Specific
    # Map 'high_volatility' -> use list
    specific = REGIME_STRATEGY_MAP.get(regime, REGIME_STRATEGY_MAP.get("ranging"))
    if specific:
        for s in specific:
            if s not in strategy_classes:
                strategy_classes.append(s)

    return strategy_classes
