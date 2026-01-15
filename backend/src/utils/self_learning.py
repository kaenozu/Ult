import logging
import os
import json
import datetime
import pandas as pd
from typing import Dict, Any, List

from src.optimization import MultiModelOptimizer
from src.data_loader import fetch_stock_data

logger = logging.getLogger(__name__)


class SelfLearningPipeline:
    """
    Automated Self-Learning Pipeline (Phase 73)
    Orchestrates hyperparameter optimization and model re-training.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.optimizer = MultiModelOptimizer(cv_folds=3)
        self.params_path = "model_params.json"
        self.last_run_file = "last_learning_run.txt"

    def should_run(self) -> bool:
        """
        Check if the pipeline should run (e.g., on weekends).
        """
        now = datetime.datetime.now()
        # 5 = Saturday, 6 = Sunday
        is_weekend = now.weekday() >= 5

        if not is_weekend:
            return False

        # Check if already run this weekend
        if os.path.exists(self.last_run_file):
            with open(self.last_run_file, "r") as f:
                last_run_str = f.read().strip()
                try:
                    last_run = datetime.datetime.fromisoformat(last_run_str)
                    if (now - last_run).days < 5:
                        return False
                except ValueError:
                    pass

        return True

    def run_optimization(self, tickers: List[str] = ["7203.T", "^GSPC"], days: int = 365):
        """
        Run the full optimization process.
        """
        logger.info(f"🚀 Starting Self-Learning Optimization for {len(tickers)} tickers...")

        # Use fetch_stock_data
        period = f"{days}d"
        data_dict = fetch_stock_data(tickers, period=period)

        all_data = []
        for ticker, df in data_dict.items():
            if df is not None and not df.empty:
                # Basic feature engineering (simulated for training data preparation)
                from src.features import add_advanced_features

                df = add_advanced_features(df)
                df.dropna(inplace=True)
                all_data.append(df)

        if not all_data:
            logger.warning("No data available for optimization.")
            return

        combined_df = pd.concat(all_data)

        # Prepare X, y (Simplified for this integration)
        # Using columns typically used by our predictors
        features = [
            c
            for c in combined_df.columns
            if c not in ["Close", "High", "Low", "Open", "Volume", "Return_1d", "Return_5d"]
        ]
        X = combined_df[features].values
        # Target: Next day return
        y = combined_df["Return_1d"].values.reshape(-1, 1)

        # 1. Optimize
        logger.info("Running Optuna optimization...")
        best_params = self.optimizer.optimize_all_models(X, y, model_types=["lstm", "lgbm"], n_trials_per_model=20)

        # 2. Save Params
        self.save_params(best_params)

        # 3. Mark last run
        with open(self.last_run_file, "w") as f:
            f.write(datetime.datetime.now().isoformat())

        logger.info(f"✅ Self-Learning Complete. Best params saved to {self.params_path}")
        return best_params

    def save_params(self, params: Dict[str, Any]):
        """Save best parameters to JSON."""
        with open(self.params_path, "w", encoding="utf-8") as f:
            json.dump(params, f, indent=4, ensure_ascii=False)

    def load_params(self) -> Dict[str, Any]:
        """Load optimized parameters."""
        if os.path.exists(self.params_path):
            with open(self.params_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}
