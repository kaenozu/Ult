"""
AI Model Auto-Optimization Agent - Advanced ML Model Optimization System
Integrated with trading platform's ML/Ops infrastructure
"""

import asyncio
import json
import logging
import pickle
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from pathlib import Path

# Optional ML/Data Science imports with graceful fallbacks
try:
    import numpy as np

    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False

try:
    import pandas as pd

    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False

try:
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.preprocessing import StandardScaler

    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# Optional optimization libraries
try:
    import optuna

    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False

try:
    from bayes_opt import BayesianOptimization

    BAYES_OPT_AVAILABLE = True
except ImportError:
    BAYES_OPT_AVAILABLE = False

# Optional ML frameworks
try:
    import lightgbm as lgb

    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

try:
    import xgboost as xgb

    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

# Optional infrastructure libraries
try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    import mlflow
    import mlflow.sklearn

    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

# Local imports with graceful fallbacks
try:
    from src.mlops.model_registry import ModelRegistryService
except ImportError:
    ModelRegistryService = None

try:
    from src.mlops.monitoring import MonitoringService
except ImportError:
    MonitoringService = None

try:
    from src.mlops.deployment import DeploymentService
except ImportError:
    DeploymentService = None

try:
    from src.core.data_pipeline import DataPipelineService
except ImportError:
    DataPipelineService = None

try:
    from src.core.storage import StorageService
except ImportError:
    StorageService = None

try:
    from src.core.notifications import NotificationService
except ImportError:
    NotificationService = None


@dataclass
class OptimizationConfig:
    """Configuration for optimization processes"""

    max_trials: int = 100
    timeout_seconds: int = 3600
    early_stopping_rounds: int = 50
    cv_folds: int = 5
    test_size: float = 0.2
    random_state: int = 42
    accuracy_drop_threshold: float = 0.05
    performance_window_hours: int = 24
    min_samples_for_retrain: int = 1000
    ensemble_diversity_threshold: float = 0.7


@dataclass
class ModelMetrics:
    """Model performance metrics"""

    accuracy: float
    precision: float
    recall: float
    f1: float
    latency_ms: float
    prediction_confidence: float
    drift_score: float
    timestamp: datetime


@dataclass
class OptimizationResult:
    """Result of optimization process"""

    model_id: str
    optimization_type: str
    old_metrics: ModelMetrics
    new_metrics: ModelMetrics
    improvement_percentage: float
    parameters: Dict[str, Any]
    execution_time_seconds: float
    status: str
    error_message: Optional[str] = None


class ModelAnalyzer:
    """Analyzes model performance and detects drift"""

    def __init__(self, monitoring_service: MonitoringService):
        self.monitoring = monitoring_service
        self.logger = logging.getLogger(__name__)

    async def analyze_performance(
        self, model_id: str, time_range_hours: int = 24
    ) -> Dict[str, Any]:
        """Analyze current model performance"""
        try:
            metrics = await self.monitoring.get_metrics(model_id, time_range_hours)

            # Calculate performance degradation
            recent_metrics = metrics[-10:] if len(metrics) > 10 else metrics
            older_metrics = metrics[:-10] if len(metrics) > 20 else metrics[:10]

            if len(older_metrics) > 0 and len(recent_metrics) > 0:
                recent_avg = np.mean([m["accuracy"] for m in recent_metrics])
                older_avg = np.mean([m["accuracy"] for m in older_metrics])
                degradation = older_avg - recent_avg
            else:
                degradation = 0

            # Detect data drift
            drift_score = await self._calculate_drift_score(model_id, metrics)

            return {
                "model_id": model_id,
                "current_metrics": recent_metrics[-1] if recent_metrics else {},
                "performance_degradation": degradation,
                "drift_score": drift_score,
                "needs_optimization": degradation > 0.05 or drift_score > 0.1,
                "analysis_time": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Error analyzing model {model_id}: {str(e)}")
            return {"error": str(e), "model_id": model_id}

    async def _calculate_drift_score(self, model_id: str, metrics: List[Dict]) -> float:
        """Calculate data drift score"""
        try:
            # Simple drift calculation based on prediction confidence variance
            if not metrics:
                return 0.0

            confidences = [m.get("prediction_confidence", 0.5) for m in metrics]
            if len(confidences) < 2:
                return 0.0

            drift_score = (
                np.std(confidences) / np.mean(confidences)
                if np.mean(confidences) > 0
                else 0
            )
            return min(drift_score, 1.0)

        except Exception as e:
            self.logger.error(f"Error calculating drift score: {str(e)}")
            return 0.0


class HyperparameterOptimizer:
    """Advanced hyperparameter optimization using multiple strategies"""

    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)

    async def optimize_with_optuna(
        self,
        model_type: str,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict[str, Any]:
        """Optimize hyperparameters using Optuna"""
        try:

            def objective(trial):
                if model_type == "lightgbm":
                    params = {
                        "objective": "binary",
                        "metric": "binary_logloss",
                        "verbosity": -1,
                        "boosting_type": "gbdt",
                        "num_leaves": trial.suggest_int("num_leaves", 10, 300),
                        "learning_rate": trial.suggest_float(
                            "learning_rate", 0.01, 0.3, log=True
                        ),
                        "feature_fraction": trial.suggest_float(
                            "feature_fraction", 0.4, 1.0
                        ),
                        "bagging_fraction": trial.suggest_float(
                            "bagging_fraction", 0.4, 1.0
                        ),
                        "bagging_freq": trial.suggest_int("bagging_freq", 1, 7),
                        "min_child_samples": trial.suggest_int(
                            "min_child_samples", 5, 100
                        ),
                        "lambda_l1": trial.suggest_float(
                            "lambda_l1", 1e-8, 10.0, log=True
                        ),
                        "lambda_l2": trial.suggest_float(
                            "lambda_l2", 1e-8, 10.0, log=True
                        ),
                        "random_state": self.config.random_state,
                    }

                    model = lgb.LGBMClassifier(**params)
                    model.fit(
                        X_train,
                        y_train,
                        eval_set=[(X_val, y_val)],
                        callbacks=[
                            lgb.early_stopping(self.config.early_stopping_rounds)
                        ],
                    )

                    y_pred = model.predict(X_val)
                    return accuracy_score(y_val, y_pred)

                elif model_type == "xgboost":
                    params = {
                        "objective": "binary:logistic",
                        "eval_metric": "logloss",
                        "max_depth": trial.suggest_int("max_depth", 3, 10),
                        "learning_rate": trial.suggest_float(
                            "learning_rate", 0.01, 0.3, log=True
                        ),
                        "n_estimators": trial.suggest_int("n_estimators", 50, 500),
                        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
                        "colsample_bytree": trial.suggest_float(
                            "colsample_bytree", 0.5, 1.0
                        ),
                        "gamma": trial.suggest_float("gamma", 0, 5),
                        "random_state": self.config.random_state,
                    }

                    model = xgb.XGBClassifier(**params)
                    model.fit(
                        X_train,
                        y_train,
                        eval_set=[(X_val, y_val)],
                        early_stopping_rounds=self.config.early_stopping_rounds,
                        verbose=False,
                    )

                    y_pred = model.predict(X_val)
                    return accuracy_score(y_val, y_pred)

            study = optuna.create_study(direction="maximize")
            study.optimize(
                objective,
                n_trials=self.config.max_trials,
                timeout=self.config.timeout_seconds,
            )

            return {
                "best_params": study.best_params,
                "best_score": study.best_value,
                "n_trials": len(study.trials),
                "optimization_time": study.trials[-1].datetime_complete.isoformat()
                if study.trials
                else None,
            }

        except Exception as e:
            self.logger.error(f"Optuna optimization failed: {str(e)}")
            return {"error": str(e)}

    async def optimize_with_bayesian(
        self,
        model_type: str,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> Dict[str, Any]:
        """Optimize using Bayesian optimization"""
        try:

            def objective(**params):
                if model_type == "lightgbm":
                    model_params = {
                        "objective": "binary",
                        "metric": "binary_logloss",
                        "verbosity": -1,
                        "boosting_type": "gbdt",
                        "random_state": self.config.random_state,
                        **{
                            k: int(v)
                            if k in ["num_leaves", "bagging_freq", "min_child_samples"]
                            else v
                            for k, v in params.items()
                        },
                    }

                    model = lgb.LGBMClassifier(**model_params)
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_val)
                    return accuracy_score(y_val, y_pred)

                return 0.0

            # Define parameter bounds
            pbounds = {
                "num_leaves": (10, 300),
                "learning_rate": (0.01, 0.3),
                "feature_fraction": (0.4, 1.0),
                "bagging_fraction": (0.4, 1.0),
                "min_child_samples": (5, 100),
            }

            optimizer = BayesianOptimization(
                f=objective, pbounds=pbounds, random_state=self.config.random_state
            )

            optimizer.maximize(init_points=5, n_iter=self.config.max_trials - 5)

            return {
                "best_params": optimizer.max["params"],
                "best_score": optimizer.max["target"],
                "optimization_time": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Bayesian optimization failed: {str(e)}")
            return {"error": str(e)}


class AutoRetrainer:
    """Automated retraining pipeline with quality gates"""

    def __init__(
        self,
        data_pipeline: DataPipelineService,
        deployment_service: DeploymentService,
        config: OptimizationConfig,
    ):
        self.data_pipeline = data_pipeline
        self.deployment = deployment_service
        self.config = config
        self.logger = logging.getLogger(__name__)

    async def trigger_retraining(
        self, model_id: str, retrain_type: str = "full", quality_gates: bool = True
    ) -> Dict[str, Any]:
        """Trigger automated retraining pipeline"""
        try:
            # Get training data
            training_data = await self.data_pipeline.get_training_data(model_id)
            validation_data = await self.data_pipeline.get_validation_data(model_id)

            if len(training_data) < self.config.min_samples_for_retrain:
                return {
                    "status": "skipped",
                    "reason": "Insufficient training data",
                    "min_required": self.config.min_samples_for_retrain,
                    "available": len(training_data),
                }

            # Prepare data
            X_train = (
                training_data.drop("target", axis=1)
                if "target" in training_data.columns
                else training_data
            )
            y_train = (
                training_data["target"] if "target" in training_data.columns else None
            )

            X_val = (
                validation_data.drop("target", axis=1)
                if "target" in validation_data.columns
                else validation_data
            )
            y_val = (
                validation_data["target"]
                if "target" in validation_data.columns
                else None
            )

            # Train new model (simplified for demo)
            model = lgb.LGBMClassifier(random_state=self.config.random_state)
            model.fit(
                X_train,
                y_train,
                eval_set=[(X_val, y_val)],
                callbacks=[lgb.early_stopping(self.config.early_stopping_rounds)],
            )

            # Quality gates validation
            if quality_gates:
                validation_result = await self._validate_model(model, X_val, y_val)
                if not validation_result["passed"]:
                    return {
                        "status": "failed",
                        "reason": "Quality gates not passed",
                        "validation_details": validation_result,
                    }

            # Deploy new version
            deployment_result = await self.deployment.shadow_deploy(model_id, model)

            return {
                "status": "success",
                "model_id": model_id,
                "retrain_type": retrain_type,
                "deployment_result": deployment_result,
                "training_samples": len(training_data),
                "validation_samples": len(validation_data),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Retraining failed for model {model_id}: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _validate_model(
        self, model: Any, X_val: np.ndarray, y_val: np.ndarray
    ) -> Dict[str, Any]:
        """Validate model against quality gates"""
        try:
            y_pred = model.predict(X_val)
            y_pred_proba = (
                model.predict_proba(X_val)[:, 1]
                if hasattr(model, "predict_proba")
                else None
            )

            metrics = {
                "accuracy": accuracy_score(y_val, y_pred),
                "precision": precision_score(y_val, y_pred, average="binary"),
                "recall": recall_score(y_val, y_pred, average="binary"),
                "f1": f1_score(y_val, y_pred, average="binary"),
            }

            # Quality gate thresholds
            passed = all(
                [metrics["accuracy"] >= 0.7, metrics["f1"] >= 0.6, len(y_val) >= 100]
            )

            return {
                "passed": passed,
                "metrics": metrics,
                "validation_time": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Model validation failed: {str(e)}")
            return {"passed": False, "error": str(e)}


class EnsembleCreator:
    """Dynamic ensemble creation and optimization"""

    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)

    async def create_ensemble(
        self,
        base_models: List[Any],
        X_val: np.ndarray,
        y_val: np.ndarray,
        ensemble_method: str = "weighted",
    ) -> Dict[str, Any]:
        """Create optimized ensemble from base models"""
        try:
            # Get predictions from all base models
            predictions = []
            for model in base_models:
                if hasattr(model, "predict_proba"):
                    pred = model.predict_proba(X_val)[:, 1]
                else:
                    pred = model.predict(X_val)
                predictions.append(pred)

            predictions = np.array(predictions).T

            if ensemble_method == "weighted":
                weights = await self._optimize_weights(predictions, y_val)
                ensemble_pred = np.average(predictions, axis=1, weights=weights)
            elif ensemble_method == "stacking":
                ensemble_pred = await self._create_stacking_ensemble(predictions, y_val)
            else:
                ensemble_pred = np.mean(predictions, axis=1)

            # Evaluate ensemble
            ensemble_metrics = self._calculate_ensemble_metrics(ensemble_pred, y_val)

            # Calculate diversity metrics
            diversity_score = self._calculate_diversity(predictions)

            return {
                "ensemble_method": ensemble_method,
                "weights": weights.tolist() if ensemble_method == "weighted" else None,
                "metrics": ensemble_metrics,
                "diversity_score": diversity_score,
                "base_models_count": len(base_models),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            self.logger.error(f"Ensemble creation failed: {str(e)}")
            return {"error": str(e)}

    async def _optimize_weights(
        self, predictions: np.ndarray, y_true: np.ndarray
    ) -> np.ndarray:
        """Optimize ensemble weights using simple grid search"""
        try:
            n_models = predictions.shape[1]
            best_weights = np.ones(n_models) / n_models
            best_score = 0

            # Simple grid search for weights
            weight_values = np.linspace(0.1, 1.0, 10)

            for i in range(len(weight_values)):
                for j in range(len(weight_values)):
                    if n_models >= 2:
                        weights = np.array([weight_values[i], weight_values[j]])
                        if n_models > 2:
                            weights = np.concatenate(
                                [weights, np.ones(n_models - 2) * 0.5]
                            )
                        weights = weights / np.sum(weights)

                        ensemble_pred = np.average(predictions, axis=1, weights=weights)
                        score = accuracy_score(
                            y_true, (ensemble_pred > 0.5).astype(int)
                        )

                        if score > best_score:
                            best_score = score
                            best_weights = weights

            return best_weights

        except Exception as e:
            self.logger.error(f"Weight optimization failed: {str(e)}")
            return np.ones(predictions.shape[1]) / predictions.shape[1]

    async def _create_stacking_ensemble(
        self, predictions: np.ndarray, y_true: np.ndarray
    ) -> np.ndarray:
        """Create stacking ensemble"""
        try:
            from sklearn.linear_model import LogisticRegression

            # Split validation data for stacking
            X_stack, y_stack = predictions, y_true

            # Train meta-learner
            meta_learner = LogisticRegression(random_state=self.config.random_state)
            meta_learner.fit(X_stack, y_stack)

            return meta_learner.predict_proba(X_stack)[:, 1]

        except Exception as e:
            self.logger.error(f"Stacking ensemble failed: {str(e)}")
            return np.mean(predictions, axis=1)

    def _calculate_ensemble_metrics(
        self, predictions: np.ndarray, y_true: np.ndarray
    ) -> Dict[str, float]:
        """Calculate ensemble performance metrics"""
        pred_binary = (predictions > 0.5).astype(int)

        return {
            "accuracy": accuracy_score(y_true, pred_binary),
            "precision": precision_score(
                y_true, pred_binary, average="binary", zero_division=0
            ),
            "recall": recall_score(
                y_true, pred_binary, average="binary", zero_division=0
            ),
            "f1": f1_score(y_true, pred_binary, average="binary", zero_division=0),
        }

    def _calculate_diversity(self, predictions: np.ndarray) -> float:
        """Calculate diversity among base models"""
        try:
            correlations = []
            n_models = predictions.shape[1]

            for i in range(n_models):
                for j in range(i + 1, n_models):
                    corr = np.corrcoef(predictions[:, i], predictions[:, j])[0, 1]
                    correlations.append(abs(corr))

            # Diversity = 1 - average correlation
            avg_correlation = np.mean(correlations) if correlations else 0
            diversity = 1 - avg_correlation

            return diversity

        except Exception as e:
            self.logger.error(f"Diversity calculation failed: {str(e)}")
            return 0.0


class OptimizationAgent:
    """Main AI Model Auto-Optimization Agent"""

    def __init__(self):
        self.config = OptimizationConfig()
        self.model_registry = ModelRegistryService()
        self.monitoring = MonitoringService()
        self.deployment = DeploymentService()
        self.data_pipeline = DataPipelineService()
        self.storage = StorageService()
        self.notifications = NotificationService()

        # Initialize components
        self.analyzer = ModelAnalyzer(self.monitoring)
        self.optimizer = HyperparameterOptimizer(self.config)
        self.retrainer = AutoRetrainer(self.data_pipeline, self.deployment, self.config)
        self.ensemble_creator = EnsembleCreator(self.config)

        # Redis for process tracking
        self.redis_client = redis.Redis(host="localhost", port=6379, db=0)

        self.logger = logging.getLogger(__name__)

        # Configure MLflow
        mlflow.set_experiment("model_optimization")

    async def optimize_model(
        self, model_id: str, optimization_type: str = "full"
    ) -> OptimizationResult:
        """Main optimization orchestration method"""
        start_time = datetime.utcnow()

        try:
            # Get current model metrics
            current_metrics = await self.monitoring.get_metrics(model_id, 24)
            old_metrics = self._parse_metrics(
                current_metrics[-1] if current_metrics else {}
            )

            if optimization_type == "full":
                # Run analysis
                analysis = await self.analyzer.analyze_performance(model_id)

                if analysis.get("needs_optimization", False):
                    # Get training data
                    training_data = await self.data_pipeline.get_training_data(model_id)
                    validation_data = await self.data_pipeline.get_validation_data(
                        model_id
                    )

                    X_train, X_val, y_train, y_val = self._prepare_data(
                        training_data, validation_data
                    )

                    # Hyperparameter optimization
                    opt_result = await self.optimizer.optimize_with_optuna(
                        "lightgbm", X_train, y_train, X_val, y_val
                    )

                    if "error" not in opt_result:
                        # Train optimized model
                        best_params = opt_result["best_params"]
                        new_model = lgb.LGBMClassifier(**best_params)
                        new_model.fit(X_train, y_train)

                        # Evaluate new model
                        y_pred = new_model.predict(X_val)
                        new_metrics_dict = {
                            "accuracy": accuracy_score(y_val, y_pred),
                            "precision": precision_score(
                                y_val, y_pred, average="binary"
                            ),
                            "recall": recall_score(y_val, y_pred, average="binary"),
                            "f1": f1_score(y_val, y_pred, average="binary"),
                            "latency_ms": 0,
                            "prediction_confidence": 0.8,
                            "drift_score": 0,
                            "timestamp": datetime.utcnow(),
                        }
                        new_metrics = self._create_metrics(new_metrics_dict)

                        # Calculate improvement
                        improvement = (
                            (
                                (new_metrics.accuracy - old_metrics.accuracy)
                                / old_metrics.accuracy
                                * 100
                            )
                            if old_metrics.accuracy > 0
                            else 0
                        )

                        # Save optimized model
                        await self.storage.save_model(
                            f"{model_id}_optimized", new_model
                        )

                        # Log to MLflow
                        with mlflow.start_run(run_name=f"optimize_{model_id}"):
                            mlflow.log_params(best_params)
                            mlflow.log_metrics(
                                {
                                    "old_accuracy": old_metrics.accuracy,
                                    "new_accuracy": new_metrics.accuracy,
                                    "improvement": improvement,
                                }
                            )

                        result = OptimizationResult(
                            model_id=model_id,
                            optimization_type=optimization_type,
                            old_metrics=old_metrics,
                            new_metrics=new_metrics,
                            improvement_percentage=improvement,
                            parameters=best_params,
                            execution_time_seconds=(
                                datetime.utcnow() - start_time
                            ).total_seconds(),
                            status="success",
                        )
                    else:
                        result = OptimizationResult(
                            model_id=model_id,
                            optimization_type=optimization_type,
                            old_metrics=old_metrics,
                            new_metrics=old_metrics,
                            improvement_percentage=0,
                            parameters={},
                            execution_time_seconds=(
                                datetime.utcnow() - start_time
                            ).total_seconds(),
                            status="failed",
                            error_message=opt_result["error"],
                        )
                else:
                    result = OptimizationResult(
                        model_id=model_id,
                        optimization_type=optimization_type,
                        old_metrics=old_metrics,
                        new_metrics=old_metrics,
                        improvement_percentage=0,
                        parameters={},
                        execution_time_seconds=(
                            datetime.utcnow() - start_time
                        ).total_seconds(),
                        status="skipped",
                        error_message="No optimization needed",
                    )
            else:
                result = OptimizationResult(
                    model_id=model_id,
                    optimization_type=optimization_type,
                    old_metrics=old_metrics,
                    new_metrics=old_metrics,
                    improvement_percentage=0,
                    parameters={},
                    execution_time_seconds=(
                        datetime.utcnow() - start_time
                    ).total_seconds(),
                    status="pending",
                )

            # Store result
            await self.storage.save_metrics(
                f"optimization_result_{model_id}", asdict(result)
            )

            # Send notification if significant improvement
            if result.improvement_percentage > 5:
                await self.notifications.send_alert(
                    f"Model {model_id} optimized with {result.improvement_percentage:.2f}% improvement"
                )

            return result

        except Exception as e:
            self.logger.error(f"Optimization failed for model {model_id}: {str(e)}")
            return OptimizationResult(
                model_id=model_id,
                optimization_type=optimization_type,
                old_metrics=ModelMetrics(0, 0, 0, 0, 0, 0, 0, datetime.utcnow()),
                new_metrics=ModelMetrics(0, 0, 0, 0, 0, 0, 0, datetime.utcnow()),
                improvement_percentage=0,
                parameters={},
                execution_time_seconds=(datetime.utcnow() - start_time).total_seconds(),
                status="error",
                error_message=str(e),
            )

    async def tune_hyperparameters(
        self, model_id: str, method: str = "optuna", trials: int = 100
    ) -> Dict[str, Any]:
        """dedicated hyperparameter tuning"""
        try:
            # Get training data
            training_data = await self.data_pipeline.get_training_data(model_id)
            validation_data = await self.data_pipeline.get_validation_data(model_id)

            X_train, X_val, y_train, y_val = self._prepare_data(
                training_data, validation_data
            )

            # Update config
            self.config.max_trials = trials

            # Run optimization
            if method == "optuna":
                result = await self.optimizer.optimize_with_optuna(
                    "lightgbm", X_train, y_train, X_val, y_val
                )
            elif method == "bayesian":
                result = await self.optimizer.optimize_with_bayesian(
                    "lightgbm", X_train, y_train, X_val, y_val
                )
            else:
                result = {"error": f"Unknown optimization method: {method}"}

            # Track process
            process_id = f"hyperopt_{model_id}_{datetime.utcnow().timestamp()}"
            await self._track_process(process_id, "hyperparameter_optimization", result)

            return result

        except Exception as e:
            self.logger.error(f"Hyperparameter tuning failed: {str(e)}")
            return {"error": str(e)}

    async def create_ensemble(
        self, base_models: List[str], ensemble_method: str = "weighted"
    ) -> Dict[str, Any]:
        """Create optimized ensemble from existing models"""
        try:
            # Load base models
            models = []
            for model_id in base_models:
                model = await self.storage.load_model(model_id)
                if model is not None:
                    models.append(model)

            if len(models) < 2:
                return {"error": "At least 2 valid models required for ensemble"}

            # Get validation data
            validation_data = await self.data_pipeline.get_validation_data(
                base_models[0]
            )
            X_val, y_val = self._prepare_data(validation_data, None)

            # Create ensemble
            result = await self.ensemble_creator.create_ensemble(
                models, ensemble_method, X_val, y_val
            )

            # Save ensemble if successful
            if "error" not in result:
                ensemble_models = {
                    "base_models": base_models,
                    "method": ensemble_method,
                    "weights": result.get("weights"),
                    "metrics": result["metrics"],
                }
                await self.storage.save_metrics(
                    f"ensemble_{datetime.utcnow().timestamp()}", ensemble_models
                )

            return result

        except Exception as e:
            self.logger.error(f"Ensemble creation failed: {str(e)}")
            return {"error": str(e)}

    async def get_optimization_status(self, process_id: str) -> Dict[str, Any]:
        """Get status of optimization process"""
        try:
            status_data = self.redis_client.get(f"opt_process_{process_id}")
            if status_data:
                return json.loads(status_data)
            else:
                return {"error": "Process not found"}
        except Exception as e:
            return {"error": str(e)}

    def _prepare_data(
        self, training_data: pd.DataFrame, validation_data: Optional[pd.DataFrame]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare data for training"""
        if validation_data is None:
            # Split training data
            X = (
                training_data.drop("target", axis=1)
                if "target" in training_data.columns
                else training_data
            )
            y = (
                training_data["target"]
                if "target" in training_data.columns
                else np.zeros(len(training_data))
            )

            X_train, X_val, y_train, y_val = train_test_split(
                X,
                y,
                test_size=self.config.test_size,
                random_state=self.config.random_state,
            )
        else:
            X_train = (
                training_data.drop("target", axis=1)
                if "target" in training_data.columns
                else training_data
            )
            y_train = (
                training_data["target"]
                if "target" in training_data.columns
                else np.zeros(len(training_data))
            )

            X_val = (
                validation_data.drop("target", axis=1)
                if "target" in validation_data.columns
                else validation_data
            )
            y_val = (
                validation_data["target"]
                if "target" in validation_data.columns
                else np.zeros(len(validation_data))
            )

        return X_train.values, X_val.values, y_train.values, y_val.values

    def _parse_metrics(self, metrics: Dict) -> ModelMetrics:
        """Parse metrics dictionary to ModelMetrics object"""
        return ModelMetrics(
            accuracy=metrics.get("accuracy", 0.0),
            precision=metrics.get("precision", 0.0),
            recall=metrics.get("recall", 0.0),
            f1=metrics.get("f1", 0.0),
            latency_ms=metrics.get("latency_ms", 0.0),
            prediction_confidence=metrics.get("prediction_confidence", 0.0),
            drift_score=metrics.get("drift_score", 0.0),
            timestamp=datetime.fromisoformat(
                metrics.get("timestamp", datetime.utcnow().isoformat())
            ),
        )

    def _create_metrics(self, metrics: Dict) -> ModelMetrics:
        """Create ModelMetrics from dictionary"""
        return ModelMetrics(
            accuracy=metrics["accuracy"],
            precision=metrics["precision"],
            recall=metrics["recall"],
            f1=metrics["f1"],
            latency_ms=metrics["latency_ms"],
            prediction_confidence=metrics["prediction_confidence"],
            drift_score=metrics["drift_score"],
            timestamp=metrics["timestamp"],
        )

    async def _track_process(
        self, process_id: str, process_type: str, result: Dict[str, Any]
    ):
        """Track optimization process in Redis"""
        tracking_data = {
            "process_id": process_id,
            "process_type": process_type,
            "status": "completed" if "error" not in result else "failed",
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
        }

        self.redis_client.setex(
            f"opt_process_{process_id}", timedelta(hours=24), json.dumps(tracking_data)
        )


# API integration functions
async def create_optimization_agent():
    """Create and return optimization agent instance"""
    return OptimizationAgent()


# Health check
async def health_check():
    """Check if optimization agent dependencies are available"""
    try:
        agent = await create_optimization_agent()
        # Test basic connectivity
        await agent.monitoring.health_check()
        return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


if __name__ == "__main__":
    # Example usage
    async def main():
        agent = await create_optimization_agent()

        # Optimize a model
        result = await agent.optimize_model("trading_model_v1")
        print(f"Optimization result: {result}")

        # Check status
        status = await health_check()
        print(f"Health status: {status}")

    asyncio.run(main())
