"""
Feature Selector using SHAP values
Selects the most important features to prevent overfitting.
"""

import logging
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor

logger = logging.getLogger(__name__)


class SHAPFeatureSelector:
    """
    Selects features using SHAP (SHapley Additive exPlanations) values.
    SHAP provides a unified measure of feature importance.
    """

    def __init__(self, n_features: int = 20):
        """
        Args:
            n_features: Number of top features to select
        """
        self.n_features = n_features
        self.selected_features = []
        self.feature_importance = {}

    def fit(self, X: pd.DataFrame, y: pd.Series, model=None) -> "SHAPFeatureSelector":
        """
        Fit the selector and identify important features.

        Args:
            X: Training features
            y: Training targets
            model: Optional pre-trained model (uses RandomForest if None)

        Returns:
            Self
        """
        logger.info(f"Selecting top {self.n_features} features using SHAP...")

        # Train model if not provided
        if model is None:
            logger.info("Training RandomForest for SHAP analysis...")
            model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            model.fit(X, y)

        # Calculate SHAP values
        logger.info("Calculating SHAP values...")
        explainer = shap.TreeExplainer(model)

        # Use a sample for speed (SHAP can be slow on large datasets)
        sample_size = min(1000, len(X))
        X_sample = X.sample(n=sample_size, random_state=42)

        shap_values = explainer.shap_values(X_sample)

        # Calculate mean absolute SHAP value for each feature
        mean_shap = np.abs(shap_values).mean(axis=0)

        # Create feature importance dictionary
        self.feature_importance = dict(zip(X.columns, mean_shap))

        # Select top N features
        sorted_features = sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)

        self.selected_features = [feat for feat, _ in sorted_features[: self.n_features]]

        logger.info(f"Selected {len(self.selected_features)} features")
        logger.info(f"Top 5 features: {self.selected_features[:5]}")

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Transform dataset to include only selected features.

        Args:
            X: Features

        Returns:
            Filtered features
        """
        if not self.selected_features:
            raise ValueError("Selector not fitted. Call fit() first.")

        return X[self.selected_features]

    def fit_transform(self, X: pd.DataFrame, y: pd.Series) -> pd.DataFrame:
        """Fit and transform in one step."""
        self.fit(X, y)
        return self.transform(X)

    def get_feature_importance(self) -> pd.DataFrame:
        """Get feature importance as DataFrame."""
        return pd.DataFrame(
            {
                "feature": list(self.feature_importance.keys()),
                "importance": list(self.feature_importance.values()),
            }
        ).sort_values("importance", ascending=False)


class BorutaFeatureSelector:
    """
    Boruta feature selection algorithm.
    Identifies all relevant features, not just top N.
    """

    def __init__(self, max_iter: int = 100, random_state: int = 42):
        """
        Args:
            max_iter: Maximum iterations
            random_state: Random seed
        """
        self.max_iter = max_iter
        self.random_state = random_state
        self.selected_features = []

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "BorutaFeatureSelector":
        """
        Fit Boruta selector.

        Args:
            X: Training features
            y: Training targets

        Returns:
            Self
        """
        try:
            from boruta import BorutaPy

            logger.info("Running Boruta feature selection...")

            # Train RandomForest
            rf = RandomForestRegressor(n_estimators=100, random_state=self.random_state, n_jobs=-1)

            # Boruta
            boruta = BorutaPy(
                rf,
                n_estimators="auto",
                max_iter=self.max_iter,
                random_state=self.random_state,
            )

            boruta.fit(X.values, y.values)

            # Get selected features
            selected_mask = boruta.support_
            self.selected_features = X.columns[selected_mask].tolist()

            logger.info(f"Boruta selected {len(self.selected_features)} features")

        except ImportError:
            logger.warning("Boruta not installed. Using SHAP-based selection instead.")
            # Fallback to SHAP
            shap_selector = SHAPFeatureSelector(n_features=20)
            shap_selector.fit(X, y)
            self.selected_features = shap_selector.selected_features

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """Transform to selected features."""
        if not self.selected_features:
            raise ValueError("Selector not fitted. Call fit() first.")

        return X[self.selected_features]

    def fit_transform(self, X: pd.DataFrame, y: pd.Series) -> pd.DataFrame:
        """Fit and transform."""
        self.fit(X, y)
        return self.transform(X)


class RecursiveFeatureElimination:
    """
    Recursive Feature Elimination (RFE).
    Recursively removes least important features.
    """

    def __init__(self, n_features: int = 20):
        """
        Args:
            n_features: Target number of features
        """
        self.n_features = n_features
        self.selected_features = []

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "RecursiveFeatureElimination":
        """
        Fit RFE selector.

        Args:
            X: Training features
            y: Training targets

        Returns:
            Self
        """
        from sklearn.feature_selection import RFE
        from sklearn.ensemble import RandomForestRegressor

        logger.info(f"Running RFE to select {self.n_features} features...")

        rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        rfe = RFE(estimator=rf, n_features_to_select=self.n_features)

        rfe.fit(X, y)

        # Get selected features
        selected_mask = rfe.support_
        self.selected_features = X.columns[selected_mask].tolist()

        logger.info(f"RFE selected: {self.selected_features}")

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        """Transform to selected features."""
        if not self.selected_features:
            raise ValueError("Selector not fitted. Call fit() first.")

        return X[self.selected_features]

    def fit_transform(self, X: pd.DataFrame, y: pd.Series) -> pd.DataFrame:
        """Fit and transform."""
        self.fit(X, y)
        return self.transform(X)
