"""
Optuna Tuner for LightGBM
"""

import logging

import lightgbm as lgb
import optuna
from sklearn.model_selection import KFold, cross_val_score

logger = logging.getLogger(__name__)


class OptunaTuner:
    """Auto-tuner for LightGBM using Optuna"""

    def __init__(self, n_trials=20):
        self.n_trials = n_trials
        self.best_params = None

    def optimize_lightgbm(self, X, y, regime="normal"):
        """Run optimization with regime-aware objectives."""
        logger.info(f"Starting Optuna optimization (Regime: {regime})...")

        # Define metric based on regime
        metric = "accuracy"
        if regime == "high_risk":
            metric = "precision"  # Minimize False Positives
        elif regime == "growth":
            metric = "recall"  # Capture all opportunities

        study = optuna.create_study(direction="maximize")
        study.optimize(lambda trial: self._objective(trial, X, y, metric), n_trials=self.n_trials)

        self.best_params = study.best_params
        logger.info(f"Optimization finished. Best params: {self.best_params}")
        logger.info(f"Best score ({metric}): {study.best_value}")

        return self.best_params

    def _objective(self, trial, X, y, metric="accuracy"):
        """Objective function for LightGBM"""
        param = {
            "objective": "binary",
            "metric": "binary_logloss",
            "verbosity": -1,
            "boosting_type": "gbdt",
            "lambda_l1": trial.suggest_float("lambda_l1", 1e-8, 10.0, log=True),
            "lambda_l2": trial.suggest_float("lambda_l2", 1e-8, 10.0, log=True),
            "num_leaves": trial.suggest_int("num_leaves", 2, 256),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.4, 1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.4, 1.0),
            "bagging_freq": trial.suggest_int("bagging_freq", 1, 7),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
            "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
            "n_estimators": trial.suggest_int("n_estimators", 50, 500),
        }

        # 3-Fold Cross Validation
        cv = KFold(n_splits=3, shuffle=True, random_state=42)

        # Use LightGBM scikit-learn API for easier CV integration
        model = lgb.LGBMClassifier(**param)
        scores = cross_val_score(model, X, y, cv=cv, scoring=metric)

        return scores.mean()
