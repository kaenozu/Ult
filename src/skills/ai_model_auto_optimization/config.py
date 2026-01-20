"""
Configuration settings for AI Model Auto-Optimization Agent
"""

from pydantic_settings import BaseSettings
from typing import Dict, Any, List
import os


class OptimizationSettings(BaseSettings):
    """Configuration for optimization processes"""

    # Core optimization settings
    max_trials: int = 100
    timeout_seconds: int = 3600
    early_stopping_rounds: int = 50
    cv_folds: int = 5
    test_size: float = 0.2
    random_state: int = 42

    # Performance thresholds
    accuracy_drop_threshold: float = 0.05
    performance_window_hours: int = 24
    min_samples_for_retrain: int = 1000
    ensemble_diversity_threshold: float = 0.7

    # Resource limits
    max_concurrent_optimizations: int = 3
    memory_limit_gb: float = 8.0
    cpu_limit_cores: int = 4

    # Monitoring settings
    metrics_interval_seconds: int = 300
    alert_cooldown_minutes: int = 60
    drift_threshold: float = 0.1
    confidence_threshold: float = 0.8

    # MLflow settings
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "model_optimization"

    # Redis settings
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = None

    # Notification settings
    enable_notifications: bool = True
    notification_channels: List[str] = ["slack", "email"]
    slack_webhook_url: str = ""
    email_recipients: List[str] = []

    # Quality gates
    quality_gate_accuracy_min: float = 0.7
    quality_gate_f1_min: float = 0.6
    quality_gate_min_validation_samples: int = 100
    quality_gate_enable_bias_check: bool = True

    class Config:
        env_prefix = "OPT_AGENT_"
        env_file = ".env"


class ModelTypeConfig:
    """Configuration for different model types"""

    LIGHTGBM_PARAMS = {
        "objective": "binary",
        "metric": "binary_logloss",
        "verbosity": -1,
        "boosting_type": "gbdt",
        "random_state": 42,
    }

    XGBOOST_PARAMS = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "random_state": 42,
    }

    HYPERPARAMETER_RANGES = {
        "lightgbm": {
            "num_leaves": (10, 300),
            "learning_rate": (0.01, 0.3),
            "feature_fraction": (0.4, 1.0),
            "bagging_fraction": (0.4, 1.0),
            "bagging_freq": (1, 7),
            "min_child_samples": (5, 100),
            "lambda_l1": (1e-8, 10.0),
            "lambda_l2": (1e-8, 10.0),
        },
        "xgboost": {
            "max_depth": (3, 10),
            "learning_rate": (0.01, 0.3),
            "n_estimators": (50, 500),
            "subsample": (0.5, 1.0),
            "colsample_bytree": (0.5, 1.0),
            "gamma": (0, 5),
        },
    }


class OptimizationStrategies:
    """Different optimization strategies and their configurations"""

    CONSERVATIVE = {
        "max_trials": 50,
        "early_stopping_rounds": 30,
        "timeout_seconds": 1800,
        "risk_tolerance": "low",
    }

    BALANCED = {
        "max_trials": 100,
        "early_stopping_rounds": 50,
        "timeout_seconds": 3600,
        "risk_tolerance": "medium",
    }

    AGGRESSIVE = {
        "max_trials": 200,
        "early_stopping_rounds": 75,
        "timeout_seconds": 7200,
        "risk_tolerance": "high",
    }


# Default configuration instances
DEFAULT_SETTINGS = OptimizationSettings()


# Environment-specific configurations
def get_config_for_environment(env: str = "development") -> OptimizationSettings:
    """Get configuration based on environment"""
    if env == "production":
        return OptimizationSettings(
            max_trials=150,
            timeout_seconds=7200,
            max_concurrent_optimizations=2,
            memory_limit_gb=16.0,
            cpu_limit_cores=8,
            metrics_interval_seconds=180,
            enable_notifications=True,
        )
    elif env == "staging":
        return OptimizationSettings(
            max_trials=75,
            timeout_seconds=3600,
            max_concurrent_optimizations=3,
            memory_limit_gb=8.0,
            cpu_limit_cores=4,
            metrics_interval_seconds=300,
            enable_notifications=True,
        )
    else:  # development
        return OptimizationSettings(
            max_trials=25,
            timeout_seconds=1800,
            max_concurrent_optimizations=5,
            memory_limit_gb=4.0,
            cpu_limit_cores=2,
            metrics_interval_seconds=600,
            enable_notifications=False,
        )


# Feature engineering configuration
FEATURE_ENGINEERING_CONFIG = {
    "max_polynomial_degree": 3,
    "min_correlation_threshold": 0.1,
    "max_correlation_threshold": 0.95,
    "feature_selection_methods": ["variance_threshold", "correlation", "mutual_info"],
    "auto_feature_generation": True,
    "interaction_features": True,
    "polynomial_features": True,
    "feature_importance_threshold": 0.01,
}


# Ensemble configuration
ENSEMBLE_CONFIG = {
    "max_base_models": 10,
    "min_base_models": 2,
    "diversity_threshold": 0.3,
    "weight_optimization_method": "grid_search",
    "stacking_folds": 5,
    "stacking_meta_learner": "logistic_regression",
    "dynamic_selection_enabled": True,
    "performance_window_for_ensemble": 168,  # hours
}


# Monitoring and alerting configuration
MONITORING_CONFIG = {
    "metrics_to_track": [
        "accuracy",
        "precision",
        "recall",
        "f1",
        "latency_ms",
        "prediction_confidence",
        "drift_score",
        "data_quality_score",
    ],
    "alert_thresholds": {
        "accuracy_drop": 0.05,
        "latency_increase": 100,  # ms
        "drift_score": 0.1,
        "prediction_confidence_drop": 0.1,
    },
    "dashboard_metrics": [
        "optimization_success_rate",
        "average_improvement",
        "optimization_duration",
        "ensemble_performance",
    ],
}
