"""
Prediction Monitor
Tracks prediction quality in real-time and detects concept drift.
"""

import logging
from typing import Dict, Optional
from datetime import datetime
from collections import deque
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class PredictionMonitor:
    """
    Monitors prediction quality and detects when models need retraining.
    """

    def __init__(
        self,
        window_size: int = 30,
        accuracy_threshold: float = 0.55,
        drift_threshold: float = 0.15,
    ):
        """
        Args:
            window_size: Rolling window for metrics calculation
            accuracy_threshold: Minimum acceptable directional accuracy
            drift_threshold: Maximum acceptable performance degradation
        """
        self.window_size = window_size
        self.accuracy_threshold = accuracy_threshold
        self.drift_threshold = drift_threshold

        # Prediction history
        self.predictions = deque(maxlen=window_size * 2)
        self.actuals = deque(maxlen=window_size * 2)
        self.timestamps = deque(maxlen=window_size * 2)

        # Performance metrics
        self.rolling_accuracy = []
        self.rolling_mape = []

        # Alerts
        self.alerts = []

    def log_prediction(
        self,
        predicted: float,
        actual: Optional[float] = None,
        timestamp: Optional[datetime] = None,
    ):
        """
        Log a prediction and its actual outcome.

        Args:
            predicted: Predicted value
            actual: Actual value (None if not yet known)
            timestamp: Prediction timestamp
        """
        if timestamp is None:
            timestamp = datetime.now()

        self.predictions.append(predicted)
        self.actuals.append(actual)
        self.timestamps.append(timestamp)

    def update_actual(self, index: int, actual: float):
        """
        Update actual value for a previous prediction.

        Args:
            index: Index in the deque (negative for recent)
            actual: Actual value
        """
        if -len(self.actuals) <= index < len(self.actuals):
            self.actuals[index] = actual

    def calculate_metrics(self) -> Dict[str, float]:
        """Calculate current performance metrics."""
        # Filter out predictions without actuals
        valid_pairs = [(p, a) for p, a in zip(self.predictions, self.actuals) if a is not None]

        if len(valid_pairs) < 10:
            return {
                "directional_accuracy": 0.0,
                "mape": 0.0,
                "mae": 0.0,
                "sample_size": len(valid_pairs),
            }

        predictions = np.array([p for p, _ in valid_pairs])
        actuals = np.array([a for _, a in valid_pairs])

        # Directional accuracy
        directional_correct = sum((p > 0 and a > 0) or (p < 0 and a < 0) for p, a in zip(predictions, actuals))
        directional_accuracy = directional_correct / len(valid_pairs)

        # MAPE
        mape = np.mean(np.abs((actuals - predictions) / (actuals + 1e-10)))

        # MAE
        mae = np.mean(np.abs(actuals - predictions))

        metrics = {
            "directional_accuracy": directional_accuracy,
            "mape": mape,
            "mae": mae,
            "sample_size": len(valid_pairs),
        }

        # Store rolling metrics
        self.rolling_accuracy.append(directional_accuracy)
        self.rolling_mape.append(mape)

        # Keep only recent history
        if len(self.rolling_accuracy) > self.window_size:
            self.rolling_accuracy = self.rolling_accuracy[-self.window_size :]
            self.rolling_mape = self.rolling_mape[-self.window_size :]

        return metrics

    def detect_concept_drift(self) -> bool:
        """
        Detect if model performance has degraded significantly.

        Returns:
            True if drift detected
        """
        if len(self.rolling_accuracy) < self.window_size // 2:
            return False

        # Compare recent performance to historical
        recent_accuracy = np.mean(self.rolling_accuracy[-7:])  # Last week
        historical_accuracy = np.mean(self.rolling_accuracy[:-7])  # Before last week

        # Check for significant degradation
        if historical_accuracy - recent_accuracy > self.drift_threshold:
            alert = {
                "type": "CONCEPT_DRIFT",
                "timestamp": datetime.now(),
                "message": f"Performance degradation detected: {historical_accuracy:.2%} -> {recent_accuracy:.2%}",
                "severity": "HIGH",
            }
            self.alerts.append(alert)
            logger.warning(alert["message"])
            return True

        return False

    def check_accuracy_threshold(self) -> bool:
        """
        Check if accuracy is below acceptable threshold.

        Returns:
            True if below threshold
        """
        if len(self.rolling_accuracy) < 10:
            return False

        recent_accuracy = np.mean(self.rolling_accuracy[-10:])

        if recent_accuracy < self.accuracy_threshold:
            alert = {
                "type": "LOW_ACCURACY",
                "timestamp": datetime.now(),
                "message": f"Accuracy below threshold: {recent_accuracy:.2%} < {self.accuracy_threshold:.2%}",
                "severity": "MEDIUM",
            }
            self.alerts.append(alert)
            logger.warning(alert["message"])
            return True

        return False

    def should_retrain(self) -> bool:
        """
        Determine if model should be retrained.

        Returns:
            True if retraining recommended
        """
        drift_detected = self.detect_concept_drift()
        low_accuracy = self.check_accuracy_threshold()

        return drift_detected or low_accuracy

    def get_performance_report(self) -> Dict:
        """Generate comprehensive performance report."""
        metrics = self.calculate_metrics()

        report = {
            "current_metrics": metrics,
            "rolling_accuracy_7d": np.mean(self.rolling_accuracy[-7:]) if len(self.rolling_accuracy) >= 7 else 0.0,
            "rolling_accuracy_30d": np.mean(self.rolling_accuracy) if self.rolling_accuracy else 0.0,
            "recent_alerts": self.alerts[-5:],  # Last 5 alerts
            "total_predictions": len(self.predictions),
            "predictions_with_actuals": sum(1 for a in self.actuals if a is not None),
            "retrain_recommended": self.should_retrain(),
        }

        return report

    def clear_alerts(self):
        """Clear all alerts."""
        self.alerts = []

    def export_history(self) -> pd.DataFrame:
        """Export prediction history as DataFrame."""
        df = pd.DataFrame(
            {
                "timestamp": list(self.timestamps),
                "predicted": list(self.predictions),
                "actual": list(self.actuals),
            }
        )

        return df
