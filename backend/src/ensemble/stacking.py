"""
Stacking Ensemble with Meta-Learner
Combines multiple base models with a meta-model for superior predictions.
"""

import logging
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.linear_model import Ridge

logger = logging.getLogger(__name__)


class StackingEnsemble:
    """
    Stacking ensemble that trains multiple base models and combines
    their predictions using a meta-learner.

    Architecture:
        pass
    Level 1: Base models (LGBM, XGBoost, RandomForest, etc.)
    Level 2: Meta-model (Ridge Regression)
    """

    def __init__(self, base_models: List[Any], meta_model: Optional[Any] = None, n_folds: int = 5):
        """
        Args:
            base_models: List of base models with fit/predict methods
            meta_model: Meta-learner (default: Ridge Regression)
            n_folds: Number of folds for out-of-fold predictions
        """
        self.base_models = base_models
        self.meta_model = meta_model or Ridge(alpha=1.0)
        self.n_folds = n_folds
        self.is_fitted = False

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "StackingEnsemble":
        """
        Train the stacking ensemble.

        Args:
            X: Training features
            y: Training targets

        Returns:
            Self
        """
        logger.info(f"Training stacking ensemble with {len(self.base_models)} base models")

        # Generate out-of-fold predictions for meta-model training
        meta_features = self._generate_meta_features(X, y)

        # Train all base models on full dataset
        for i, model in enumerate(self.base_models):
            logger.info(f"Training base model {i + 1}/{len(self.base_models)}: {model.__class__.__name__}")
            model.fit(X, y)

        # Train meta-model on out-of-fold predictions
        logger.info("Training meta-model")
        self.meta_model.fit(meta_features, y)

        self.is_fitted = True
        logger.info("Stacking ensemble training complete")

        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Make predictions using the stacking ensemble.

        Args:
            X: Features

        Returns:
            Predictions
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call fit() first.")

        # Get predictions from all base models
        base_predictions = np.column_stack([model.predict(X) for model in self.base_models])

        # Meta-model makes final prediction
        final_predictions = self.meta_model.predict(base_predictions)

        return final_predictions

    def _generate_meta_features(self, X: pd.DataFrame, y: pd.Series) -> np.ndarray:
        """
        Generate out-of-fold predictions for meta-model training.

        This prevents overfitting by ensuring the meta-model sees
        predictions on data the base models haven't seen.
        """
        n_samples = len(X)
        n_models = len(self.base_models)

        # Initialize array for out-of-fold predictions
        meta_features = np.zeros((n_samples, n_models))

        # K-Fold cross-validation
        kfold = KFold(n_splits=self.n_folds, shuffle=True, random_state=42)

        for i, model in enumerate(self.base_models):
            logger.debug(f"Generating OOF predictions for model {i + 1}")

            for fold, (train_idx, val_idx) in enumerate(kfold.split(X)):
                # Split data
                X_train = X.iloc[train_idx]
                y_train = y.iloc[train_idx]
                X_val = X.iloc[val_idx]

                # Train on fold
                model_copy = self._clone_model(model)
                model_copy.fit(X_train, y_train)

                # Predict on validation fold
                predictions = model_copy.predict(X_val)
                meta_features[val_idx, i] = predictions

        return meta_features

    def _clone_model(self, model: Any) -> Any:
        """Clone a model for cross-validation."""
        from sklearn.base import clone

        try:
            return clone(model)
        except BaseException:
            # If sklearn clone fails, create new instance
            return model.__class__()

    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance from base models.

        Returns:
            Dictionary of feature importances
        """
        importances = {}

        for i, model in enumerate(self.base_models):
            model_name = model.__class__.__name__

            if hasattr(model, "feature_importances_"):
                importances[model_name] = model.feature_importances_
            elif hasattr(model, "coef_"):
                importances[model_name] = np.abs(model.coef_)

        return importances

    def get_model_weights(self) -> np.ndarray:
        """
        Get meta-model weights (how much each base model contributes).

        Returns:
            Array of weights
        """
        if hasattr(self.meta_model, "coef_"):
            return self.meta_model.coef_
        else:
            return np.ones(len(self.base_models)) / len(self.base_models)


def create_default_stacking_ensemble() -> StackingEnsemble:
    """
    Create a default stacking ensemble with common models.

    Returns:
        Configured StackingEnsemble
    """
    from lightgbm import LGBMRegressor
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

    base_models = [
        LGBMRegressor(n_estimators=100, learning_rate=0.05, random_state=42),
        RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
        GradientBoostingRegressor(n_estimators=100, learning_rate=0.05, random_state=42),
    ]

    return StackingEnsemble(base_models=base_models)
