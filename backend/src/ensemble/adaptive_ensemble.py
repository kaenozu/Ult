"""
Adaptive Ensemble
Dynamically weights models based on recent performance and market regime.
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class AdaptiveEnsemble:
    """
    Adaptive ensemble that adjusts model weights based on:
        pass
    1. Recent performance
    2. Market regime
    3. Model confidence
    """

    def __init__(self, models: List[Any], lookback_period: int = 30):
        """
        Args:
            models: List of models with fit() and predict() methods
            lookback_period: Days to look back for performance calculation
        """
        self.models = models
        self.lookback_period = lookback_period
        self.model_names = [m.__class__.__name__ for m in models]

        # Performance tracking
        self.performance_history = {name: [] for name in self.model_names}
        self.current_weights = {name: 1.0 / len(models) for name in self.model_names}

        # Regime-specific weights
        self.regime_weights = {
            "trending_up": {},
            "trending_down": {},
            "ranging": {},
            "high_volatility": {},
            "low_volatility": {},
        }

        self._initialize_regime_weights()

    def _initialize_regime_weights(self):
        """Initialize default regime-specific weights."""
        # Trending markets: favor momentum models
        self.regime_weights["trending_up"] = {
            "TransformerPredictor": 0.4,
            "LGBMPredictor": 0.3,
            "ProphetPredictor": 0.3,
        }

        # Ranging markets: favor mean reversion
        self.regime_weights["ranging"] = {
            "LGBMPredictor": 0.5,
            "ProphetPredictor": 0.3,
            "TransformerPredictor": 0.2,
        }

        # High volatility: favor robust models
        self.regime_weights["high_volatility"] = {
            "LGBMPredictor": 0.6,
            "TransformerPredictor": 0.2,
            "ProphetPredictor": 0.2,
        }

    def update_performance(self, model_name: str, actual: float, predicted: float):
        """
        Update performance history for a model.

        Args:
            model_name: Name of the model
            actual: Actual value
            predicted: Predicted value
        """
        error = abs(actual - predicted)
        self.performance_history[model_name].append(error)

        # Keep only recent history
        if len(self.performance_history[model_name]) > self.lookback_period:
            self.performance_history[model_name] = self.performance_history[model_name][-self.lookback_period :]

    def calculate_weights(self, regime: Optional[str] = None) -> Dict[str, float]:
        """
        Calculate model weights based on recent performance.

        Args:
            regime: Current market regime (optional)

        Returns:
            Dictionary of model weights
        """
        # If regime specified, use regime-specific weights as base
        if regime and regime in self.regime_weights:
            base_weights = self.regime_weights[regime]
        else:
            base_weights = {name: 1.0 / len(self.models) for name in self.model_names}

        # Adjust weights based on recent performance
        performance_weights = {}

        for name in self.model_names:
            if len(self.performance_history[name]) > 0:
                # Lower error = higher weight
                avg_error = np.mean(self.performance_history[name])
                # Inverse error weighting
                performance_weights[name] = 1.0 / (avg_error + 1e-6)
            else:
                performance_weights[name] = 1.0

        # Normalize performance weights
        total_perf = sum(performance_weights.values())
        performance_weights = {k: v / total_perf for k, v in performance_weights.items()}

        # Combine base weights and performance weights (70% base, 30% performance)
        final_weights = {}
        for name in self.model_names:
            base_w = base_weights.get(name, 1.0 / len(self.models))
            perf_w = performance_weights.get(name, 1.0 / len(self.models))
            final_weights[name] = 0.7 * base_w + 0.3 * perf_w

        # Normalize
        total = sum(final_weights.values())
        final_weights = {k: v / total for k, v in final_weights.items()}

        self.current_weights = final_weights
        return final_weights

    def predict(
        self,
        X: pd.DataFrame,
        regime: Optional[str] = None,
        return_individual: bool = False,
    ) -> np.ndarray:
        """
        Make ensemble prediction with adaptive weighting.

        Args:
            X: Features
            regime: Current market regime
            return_individual: If True, return individual predictions

        Returns:
            Weighted ensemble prediction
        """
        # Calculate current weights
        weights = self.calculate_weights(regime)

        # Get predictions from all models
        predictions = {}
        for model, name in zip(self.models, self.model_names):
            try:
                pred = model.predict(X)
                predictions[name] = pred
            except Exception as e:
                logger.error(f"Prediction failed for {name}: {e}")
                predictions[name] = np.zeros(len(X))

        if return_individual:
            return predictions

        # Weighted average
        ensemble_pred = np.zeros(len(X))
        for name, pred in predictions.items():
            weight = weights.get(name, 0.0)
            ensemble_pred += weight * pred

        logger.debug(f"Ensemble weights: {weights}")

        return ensemble_pred

    def get_model_performance_summary(self) -> Dict[str, Dict[str, float]]:
        """Get performance summary for all models."""
        summary = {}

        for name in self.model_names:
            if len(self.performance_history[name]) > 0:
                errors = self.performance_history[name]
                summary[name] = {
                    "avg_error": np.mean(errors),
                    "std_error": np.std(errors),
                    "current_weight": self.current_weights.get(name, 0.0),
                    "num_predictions": len(errors),
                }
            else:
                summary[name] = {
                    "avg_error": 0.0,
                    "std_error": 0.0,
                    "current_weight": self.current_weights.get(name, 0.0),
                    "num_predictions": 0,
                }

        return summary
