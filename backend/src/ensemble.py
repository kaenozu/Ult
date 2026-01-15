from typing import Any, Dict, List

import pandas as pd


class EnsembleVoter:
    """
    Combines signals from multiple strategies to produce a final decision.
    """

    def __init__(self, strategies: List[Any], weights: Dict[str, float] = None):
        """
        Args:
            strategies: List of strategy instances.
            weights: Dictionary of strategy name -> weight (0.0 to 1.0).
        """
        self.strategies = strategies
        self.weights = weights if weights else {s.name: 1.0 for s in strategies}

    def vote(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyzes the dataframe with all strategies and returns the aggregated signal.

        Returns:
            Dict containing:
                pass
            - 'signal': Final signal (-1, 0, 1)
            - 'confidence': Aggregated confidence score
            - 'details': Dictionary of individual strategy signals
        """
        total_weight = 0.0
        weighted_signal_sum = 0.0
        details = {}

        for strategy in self.strategies:
            # Analyze
            result = strategy.analyze(df)
            signal = result["signal"]

            # Get weight
            weight = self.weights.get(strategy.name, 1.0)

            # Store details
            details[strategy.name] = {"signal": signal, "weight": weight}

            # Weighted Sum
            weighted_signal_sum += signal * weight
            total_weight += weight

        # Normalize
        if total_weight == 0:
            final_score = 0
        else:
            final_score = weighted_signal_sum / total_weight

        # Thresholding for final decision
        # > 0.3 -> BUY, < -0.3 -> SELL, else HOLD
        if final_score > 0.3:
            final_signal = 1
        elif final_score < -0.3:
            final_signal = -1
        else:
            final_signal = 0

        return {
            "signal": final_signal,
            "confidence": abs(final_score),
            "details": details,
        }
