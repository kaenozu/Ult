"""
Multi-Model Hyperparameter Optimization
Orchestrates tuning for various prediction models (LSTM, LightGBM, Transformer).
"""

import logging
from typing import Any, Dict, List

# These functions should be moved or imported properly
# For now, we'll keep the logic here for the transition
from ..hyperparameter_tuning import HyperparameterTuner

logger = logging.getLogger(__name__)


class MultiModelOptimizer:
    """Class to optimize multiple model types using HyperparameterTuner."""

    def __init__(self, cv_folds: int = 3):
        self.cv_folds = cv_folds
        self.best_params = {}

    def optimize_all_models(
        self,
        X: Any,
        y: Any,
        model_types: List[str] = ["lgbm", "lstm"],
        n_trials_per_model: int = 20,
    ) -> Dict[str, Dict[str, Any]]:
        """Run optimization for all specified model types."""
        logger.info(f"🚀 Starting multi-model optimization: {model_types}")

        # Convert to DataFrame if necessary for HyperparameterTuner
        import pandas as pd

        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)
        if not isinstance(y, pd.Series):
            y = pd.Series(y.flatten() if hasattr(y, "flatten") else y)

        for model_type in model_types:
            logger.info(f"Optimizing {model_type} model...")
            try:
                # Map 'lgbm' to 'lightgbm' if needed by the tuner
                internal_type = "lightgbm" if model_type == "lgbm" else model_type

                tuner = HyperparameterTuner(internal_type, n_splits=self.cv_folds)
                self.best_params[model_type] = tuner.optimize(X, y, n_trials=n_trials_per_model)

                logger.info(f"✅ Completed optimization for {model_type}")
            except Exception as e:
                logger.error(f"❌ Optimization failed for {model_type}: {e}")

        return self.best_params
