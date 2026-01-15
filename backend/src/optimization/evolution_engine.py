import json
import logging
import os
from datetime import datetime
from typing import Dict

import pandas as pd
from src.data_loader import fetch_stock_data
from src.features import add_advanced_features
from src.optimization.optuna_tuner import OptunaTuner
from src.oracle.oracle_2026 import Oracle2026

logger = logging.getLogger(__name__)


class SovereignEvolutionEngine:
    """
    Sovereign Evolution Engine

    The subconscious of the system. It wakes up, checks the Oracle's worldview,
    and evolves the genetic code (hyperparameters) of the AI models to survive
    in the predicted future.
    """

    def __init__(self):
        self.oracle = Oracle2026()
        self.tuner = OptunaTuner(n_trials=30)  # Deeper search
        self.tickers = ["7203.T", "9984.T", "6758.T", "8306.T", "^N225"]  # Proxy for market

    def evolve(self):
        """
        Execute the evolution cycle.
        1. Consult Oracle for Regime.
        2. Fetch recent training data.
        3. Optimize Hyperparameters for that Regime.
        4. Save genomic data (params).
        """
        logger.info("🧬 Sovereign Evolution: Initiating Adaptation Cycle...")

        # 1. Oracle Consultation
        guidance = self.oracle.get_risk_guidance()
        risk_buffer = guidance.get("var_buffer", 0.0)

        regime = "normal"
        if guidance.get("safety_mode", False):
            regime = "high_risk"  # Critical defense
        elif risk_buffer >= 0.02:
            regime = "high_risk"
        elif risk_buffer == 0.0:
            regime = "growth"  # Low risk, assume growth

        logger.info(f"   🔮 Oracle Insight: Regime = {regime.upper()} (Buffer: {risk_buffer})")

        # 2. Data Gathering (Training Simulation)
        logger.info("   🧠 Gathering memory fragments (Market Data)...")
        data_map = fetch_stock_data(self.tickers, period="2y")

        # Combine data for a generalized model (simplification)
        # In reality, we might tune per ticker, but a general 'Market Model' is robust
        full_X = []
        full_y = []

        feature_cols = ["RSI", "MACD", "MACD_Signal", "Dist_SMA_20", "Dist_SMA_50", "Volatility_20"]

        for ticker, df in data_map.items():
            if df is None or df.empty:
                continue

            try:
                df = add_advanced_features(df)
                df["Target"] = (df["Close"].shift(-1) > df["Close"]).astype(int)
                df = df.dropna()

                # Check if all columns exist
                available_cols = [c for c in feature_cols if c in df.columns]
                if len(available_cols) < len(feature_cols):
                    continue

                full_X.append(df[available_cols])
                full_y.append(df["Target"])
            except Exception as e:
                logger.warning(f"Failed to process {ticker}: {e}")

        if not full_X:
            logger.error("❌ Evolution Failed: No data available.")
            return

        X = pd.concat(full_X)
        y = pd.concat(full_y)

        logger.info(f"   🧬 Adapting to environment (Training on {len(X)} samples)...")

        # 3. Evolution (Optimization)
        best_params = self.tuner.optimize_lightgbm(X, y, regime=regime)

        # 4. Save Artifacts
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        artifact = {
            "regime": regime,
            "timestamp": timestamp,
            "oracle_msg": guidance.get("oracle_message", ""),
            "params": best_params,
        }

        os.makedirs("models/config", exist_ok=True)
        save_path = f"models/config/lightgbm_params_{regime}.json"

        # Also save as 'current'
        current_path = "models/config/lightgbm_params_current.json"

        with open(save_path, "w") as f:
            json.dump(artifact, f, indent=4)

        with open(current_path, "w") as f:
            json.dump(artifact, f, indent=4)

        logger.info(f"✨ Evolution Complete. New genetic code saved to {current_path}.")
        return artifact


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = SovereignEvolutionEngine()
    engine.evolve()
