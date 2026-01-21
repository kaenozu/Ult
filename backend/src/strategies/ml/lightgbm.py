import logging
import os
import json
from typing import Dict, Any, Optional

import numpy as np
import pandas as pd
import joblib

from ..base import Strategy
from ...features import add_advanced_features, add_macro_features
from src.data_temp.data_loader import fetch_macro_data
from ...optimization.optuna_tuner import OptunaTuner
from ...oracle.oracle_2026 import Oracle2026

logger = logging.getLogger(__name__)


class LightGBMStrategy(Strategy):
    MODEL_DIR = "models/checkpoints"

    def __init__(self, lookback_days=120, threshold=0.005, auto_tune=False, use_weekly=False, name="LightGBM Alpha", params=None):
        super().__init__(name)
        
        p = params or {}
        self.lookback_days = p.get("lookback_days", lookback_days)
        self.threshold = p.get("threshold", threshold)
        self.auto_tune = p.get("auto_tune", auto_tune)
        self.use_weekly = p.get("use_weekly", use_weekly)
        
        self.best_params = None
        self.model = None
        self.oracle = Oracle2026()
        self.default_positive_threshold = p.get("positive_threshold", 0.52)
        self.default_negative_threshold = p.get("negative_threshold", 0.48)
        self.feature_cols = [
            "ATR", "BB_Width", "RSI", "MACD", "MACD_Signal", "MACD_Diff",
            "Dist_SMA_20", "Dist_SMA_50", "Dist_SMA_200", "OBV", "Volume_Change",
            "USDJPY_Ret", "USDJPY_Corr", "SP500_Ret", "SP500_Corr",
            "US10Y_Ret", "US10Y_Corr", "VIX_Ret", "VIX_Corr",
            "GOLD_Ret", "GOLD_Corr", "Sentiment_Score", "Freq_Power",
        ]
        self.explainer = None
        
        # Ensure model directory exists
        if not os.path.exists(self.MODEL_DIR):
            os.makedirs(self.MODEL_DIR)
        
        self._load_saved_model()

    def _get_model_path(self):
        safe_name = self.name.lower().replace(" ", "_")
        return os.path.join(self.MODEL_DIR, f"{safe_name}_lgb.joblib")

    def _save_model(self):
        if self.model:
            joblib.dump({
                "model": self.model,
                "params": self.best_params,
                "pos_threshold": self.default_positive_threshold,
                "neg_threshold": self.default_negative_threshold
            }, self._get_model_path())
            logger.info(f"Model saved: {self._get_model_path()}")

    def _load_saved_model(self):
        path = self._get_model_path()
        if os.path.exists(path):
            try:
                checkpoint = joblib.load(path)
                self.model = checkpoint["model"]
                self.best_params = checkpoint.get("params")
                self.default_positive_threshold = checkpoint.get("pos_threshold", self.default_positive_threshold)
                self.default_negative_threshold = checkpoint.get("neg_threshold", self.default_negative_threshold)
                logger.info(f"Model loaded: {path}")
            except Exception as e:
                logger.warning(f"Failed to load model {path}: {e}")

    def train(self, df: pd.DataFrame):
        """Train the model on the provided data."""
        try:
            import lightgbm as lgb
        except ImportError:
            logger.error("LightGBM not installed.")
            return

        data = add_advanced_features(df)
        macro_data = fetch_macro_data(period="5y")
        data = add_macro_features(data, macro_data)

        if "Return_1d" not in data.columns:
            data["Return_1d"] = data["Close"].pct_change()

        train_df = data.tail(1000).copy()
        for col in self.feature_cols:
            if col not in train_df.columns:
                train_df[col] = 0.0
            train_df[col] = train_df[col].fillna(0.0)

        X_train = train_df[self.feature_cols]
        y_train = (train_df["Return_1d"] > 0).astype(int)

        params = {"objective": "binary", "metric": "binary_logloss", "verbosity": -1, "seed": 42}
        if self.best_params:
            params.update(self.best_params)

        train_data = lgb.Dataset(X_train, label=y_train)
        self.model = lgb.train(params, train_data, num_boost_round=100)
        self._save_model()

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        # 0. Oracle Sovereign Check
        guidance = self.oracle.get_risk_guidance()
        if guidance.get("safety_mode", False):
            return pd.Series(0, index=df.index)

        # Train if model doesn't exist
        if self.model is None:
            logger.info(f"No model found for {self.name}. Initial training...")
            self.train(df)
            if self.model is None:
                return pd.Series(0, index=df.index)

        # Implementation for real-time/batch prediction...
        # (Remaining logic similar to previous but using self.model directly)

    def _generate_signals_from_probs(self, probs: pd.Series, upper: float, lower: float) -> pd.Series:
        """Convert probability predictions into trading signals."""
        signals = pd.Series(0, index=probs.index)
        signals[probs > upper] = 1
        signals[probs < lower] = -1
        return signals

    def _calibrate_thresholds(
        self,
        probs: pd.Series,
        actual: pd.Series,
        base_upper: float = 0.60,
        base_lower: float = 0.40,
    ) -> tuple[float, float]:
        """
        Tune probability thresholds to maximize usable accuracy.

        The score combines accuracy on actionable signals with coverage so that
        the strategy prefers thresholds that make confident predictions without
        becoming overly conservative.
        """
        if probs.empty or actual.empty:
            return base_upper, base_lower

        aligned_actual = actual.reindex(probs.index)

        candidate_uppers = np.arange(0.48, 0.71, 0.01)  # [MODIFIED] Allow lower threshold for Aggressive Mode
        candidate_lowers = np.arange(0.29, 0.46, 0.01)

        best_score = -np.inf
        best_coverage = 0.0
        best_upper, best_lower = base_upper, base_lower

        for upper in candidate_uppers:
            for lower in candidate_lowers:
                if upper - lower < 0.12:
                    continue

                signals = self._generate_signals_from_probs(probs, upper, lower)
                actionable = signals != 0

                if actionable.sum() == 0:
                    continue

                predicted = signals[actionable].replace({-1: 0}).astype(int).to_numpy()
                truth = aligned_actual[actionable].to_numpy()

                if np.isnan(truth).all():
                    continue

                accuracy = (predicted == truth).mean()
                coverage = actionable.mean()
                score = accuracy * coverage

                if score > best_score or (np.isclose(score, best_score) and coverage > best_coverage):
                    best_score = score
                    best_coverage = coverage
                    best_upper, best_lower = upper, lower

        if best_score < 0:
            return base_upper, base_lower

        return best_upper, best_lower

    def explain_prediction(self, df: pd.DataFrame) -> Dict[str, float]:
        """Return SHAP values for the latest prediction"""
        if self.model is None:
            return {}

        try:
            import shap

            # Prepare latest data point
            data = add_advanced_features(df)
            macro_data = fetch_macro_data(period="5y")
            data = add_macro_features(data, macro_data)

            if data.empty:
                return {}

            # Ensure all feature columns exist to prevent KeyErrors
            for col in self.feature_cols:
                if col not in data.columns:
                    data[col] = 0.0

            latest_data = data[self.feature_cols].iloc[[-1]]

            # Create explainer if not cached (TreeExplainer is efficient)
            if self.explainer is None:
                self.explainer = shap.TreeExplainer(self.model)

            shap_values = self.explainer.shap_values(latest_data)

            # Handle list output for binary classification
            if isinstance(shap_values, list):
                vals = shap_values[1][0]  # Positive class
            else:
                vals = shap_values[0]

            explanation = dict(zip(self.feature_cols, vals))
            # Sort by absolute impact
            sorted_expl = dict(sorted(explanation.items(), key=lambda item: abs(item[1]), reverse=True))
            return sorted_expl

        except ImportError:
            logger.warning("SHAP not installed")
            return {}
        except Exception as e:
            logger.error(f"Error in SHAP explanation: {e}")
            return {}

    def generate_signals(self, df: pd.DataFrame) -> pd.Series:
        try:
            # Verify lightgbm is available
            import lightgbm as lgb
        except ImportError:
            logger.warning("LightGBM not installed. Returning empty signals.")
            return pd.Series(0, index=df.index)

        # 0. Oracle Sovereign Check
        guidance = self.oracle.get_risk_guidance()
        if guidance.get("safety_mode", False):
            # Absolute Defense: No signals allowed
            return pd.Series(0, index=df.index)

        # Adjust threshold based on risk
        risk_buffer = guidance.get("var_buffer", 0.0)
        # Increase threshold for BUY (positive)
        # e.g. 0.60 -> 0.62
        current_pos_threshold = self.default_positive_threshold + risk_buffer
        # Decrease threshold for SELL (negative) - Make it easier to sell?
        # Or maybe harder? Usually in high risk, we want to SELL faster if prediction is bad.
        # But here signals are -1 for SELL. logic: probs < lower.
        # So we should INCREASE lower threshold (make it closer to 0.5) or DECREASE (make it harder)?
        # Actually in high risk, we want to AVOID bad trades.
        # For SELL signals, maybe we want to be MORE sensitive (trigger exit earlier)?
        # But 'signal -1' usually means Short Entry or Exit.
        # Let's keep SELL logic neutral for now, focus on Filtering BUYs.
        current_neg_threshold = self.default_negative_threshold

        # タイムゾーンの不一致を防ぐためにインデックスをtimezone-naiveにする
        if df.index.tz is not None:
            df = df.copy()
            df.index = df.index.tz_localize(None)

        # Weekly Resampling Logic
        original_idx = df.index
        if self.use_weekly:
            # Resample to Weekly (ending Friday)
            # Ensure index is datetime
            if not isinstance(df.index, pd.DatetimeIndex):
                df.index = pd.to_datetime(df.index)

            # Logic to aggregate OHLCV
            logic = {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
            # Add logic for other features if they exist?
            # Ideally features should be generated AFTER resampling to be "Weekly Features"
            # But add_advanced_features calls rely on daily data sometimes?
            # Actually, standard indicators (RSI, SMA) work on any timeframe if logical.
            # So we resample OHLCV FIRST, then generate features.

            # Handle extra columns that might be needed or drop them
            df_weekly = df.resample("W-FRI").agg(logic)
            df_weekly = df_weekly.dropna()

            work_df = df_weekly
        else:
            work_df = df

        data = add_advanced_features(work_df)
        macro_data = fetch_macro_data(period="5y")  # Macro data is daily usually

        # If weekly, we need macro data to be aligned or resampled?
        # add_macro_features logic:
        # It aligns macro data to `data` index.
        # If `data` is weekly, it will reindex macro (daily) to weekly index?
        # add_macro_features uses `aligned_feat = macro_feat.reindex(df.index, method="ffill")`
        # This works perfect for weekly too (takes value at Friday).

        data = add_macro_features(data, macro_data)

        # Ensure Return_1d exists for labeling
        if "Return_1d" not in data.columns:
            data["Return_1d"] = data["Close"].pct_change()

        # Min required adjustment for Weekly
        # lookback_days is usually "days". For weekly, we should interpret it as "periods" or scale it?
        # User request says "lookback... separate models".
        # If I pass lookback_days=365 for weekly, that means 365 weeks (~7 years).
        # That's reasonable for "Mid/Long term".

        min_required = self.lookback_days + 50
        if len(data) < min_required:
            # If weekly, 365 weeks is A LOT of data.
            # Maybe default lookback should be adjusted by caller.
            logger.warning(f"Insufficient data for {self.name}: {len(data)} < {min_required}")
            return pd.Series(0, index=df.index)

        signals = pd.Series(0, index=work_df.index)
        retrain_period = 60  # For weekly this means 60 weeks (~1 year). Acceptable.
        start_idx = self.lookback_days
        end_idx = len(data)
        current_idx = start_idx

        while current_idx < end_idx:
            train_end = current_idx
            train_start = max(0, train_end - 1000)
            train_df = data.iloc[train_start:train_end].copy()  # Removed .dropna() here to handle NaNs gracefully

            pred_end = min(current_idx + retrain_period, end_idx)
            test_df = data.iloc[current_idx:pred_end].copy()

            if train_df.empty or test_df.empty:
                current_idx += retrain_period
                continue

            # Ensure all feature columns exist, fill missing with 0
            for col in self.feature_cols:
                if col not in train_df.columns:
                    train_df[col] = 0.0
                    test_df[col] = 0.0
                else:
                    train_df[col] = train_df[col].fillna(0.0)
                    test_df[col] = test_df[col].fillna(0.0)

            X_train = train_df[self.feature_cols]
            y_train = (train_df["Return_1d"] > 0).astype(int)

            # Default params
            params = {"objective": "binary", "metric": "binary_logloss", "verbosity": -1, "seed": 42}

            # Sovereign Evolution: Load Evolved Params
            try:
                import json
                import os

                config_path = "models/config/lightgbm_params_current.json"
                if os.path.exists(config_path):
                    with open(config_path, "r") as f:
                        saved_config = json.load(f)
                        if "params" in saved_config:
                            params.update(saved_config["params"])
                            # logger.debug("Loaded sovereign params.")
            except Exception:
                pass

            # Auto-Tune if enabled (and enough data)
            if self.auto_tune and len(train_df) > 200:
                try:
                    # Only tune occasionally to save time (e.g. at start or every year)
                    # For simplicity here: Tune if model is None (first run) or every 5 loops
                    if self.model is None or (current_idx - start_idx) % (retrain_period * 5) == 0:
                        logger.info(f"Running Optuna tuning at index {current_idx}...")
                        tuner = OptunaTuner(n_trials=10)  # 10 trials for speed
                        best_params = tuner.optimize_lightgbm(X_train, y_train)
                        params.update(best_params)
                        self.best_params = best_params  # Cache for display
                except Exception as e:
                    logger.error(f"Optuna tuning failed: {e}")

            train_data = lgb.Dataset(X_train, label=y_train)
            self.model = lgb.train(params, train_data, num_boost_round=100)

            # Calibrate thresholds using recent training performance
            calibrated_upper = current_pos_threshold  # Use oracle-adjusted as base
            calibrated_lower = self.default_negative_threshold

            calibration_size = max(50, int(len(train_df) * 0.2))
            if calibration_size < len(train_df):
                calibration_df = train_df.tail(calibration_size)
                calibration_probs = pd.Series(
                    self.model.predict(calibration_df[self.feature_cols]),
                    index=calibration_df.index,
                )
                calibration_y = (calibration_df["Return_1d"] > 0).astype(int)
                calibrated_upper, calibrated_lower = self._calibrate_thresholds(
                    calibration_probs,
                    calibration_y,
                    base_upper=self.default_positive_threshold,
                    base_lower=self.default_negative_threshold,
                )

                # Persist the latest calibrated thresholds for subsequent windows
                self.default_positive_threshold = calibrated_upper
                self.default_negative_threshold = calibrated_lower

            # Ensure all feature columns exist in test set
            for col in self.feature_cols:
                if col not in test_df.columns:
                    test_df[col] = 0.0

            X_test = test_df[self.feature_cols]
            if not X_test.empty:
                preds = pd.Series(self.model.predict(X_test), index=X_test.index)
                chunk_signals = self._generate_signals_from_probs(preds, calibrated_upper, calibrated_lower)
                signals.loc[chunk_signals.index] = chunk_signals

            current_idx += retrain_period

        if self.use_weekly:
            # Map weekly signals back to daily
            # ffill means: signal generated on Friday applies to next week?
            # Or signal generated on Friday is valid from Friday?
            # Usually we want to know "What is the signal for today?"
            # If we are in the middle of the week, we use last known weekly signal.

            # Reindex to original daily index
            daily_signals = signals.reindex(original_idx, method="ffill").fillna(0)
            return daily_signals

        return signals

    def get_signal_explanation(self, signal: int) -> str:
        guidance = self.oracle.get_risk_guidance()
        risk_buffer = guidance.get("var_buffer", 0.0)

        if signal == 1:
            msg = "LightGBMモデルが上昇トレンドを検知しました。"
            if risk_buffer > 0:
                msg += f" (Oracle警戒中: 基準閾値を+{risk_buffer:.2f}引き上げて厳選しました)"
            return msg
        elif signal == -1:
            return "LightGBMモデルがマクロ経済指標やテクニカル指標を分析し、下落リスクが高いと判断しました。"
        return "AIによる強い確信度は得られていません。"

    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze logic for API"""
        if len(df) < self.lookback_days:
            return {"signal": 0, "confidence": 0.0}

        signals = self.generate_signals(df)
        if signals.empty:
            return {"signal": 0, "confidence": 0.0}

        last_signal = int(signals.iloc[-1])
        
        # Confidence logic (simplified for now, ideally strictly from probs)
        confidence = 0.6 if last_signal != 0 else 0.0
        
        # Target Price Logic
        current_price = df["Close"].iloc[-1]
        target_price = current_price
        if last_signal == 1:
            target_price = current_price * 1.05
        elif last_signal == -1:
            target_price = current_price * 0.95
            
        return {
            "signal": last_signal,
            "confidence": confidence,
            "target_price": round(float(target_price), 1)
        }
