"""
Integration Tests for AI Model Auto-Optimization Agent
Tests all major functionality with mocked dependencies
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score

from src.skills.ai_model_auto_optimization.agent import (
    OptimizationAgent,
    ModelAnalyzer,
    HyperparameterOptimizer,
    AutoRetrainer,
    EnsembleCreator,
    OptimizationConfig,
    ModelMetrics,
    OptimizationResult,
)


class TestOptimizationAgent:
    """Test cases for OptimizationAgent"""

    @pytest.fixture
    def agent(self):
        """Create test agent with mocked dependencies"""
        with (
            patch("src.skills.ai_model_auto_optimization.agent.ModelRegistryService"),
            patch("src.skills.ai_model_auto_optimization.agent.MonitoringService"),
            patch("src.skills.ai_model_auto_optimization.agent.DeploymentService"),
            patch("src.skills.ai_model_auto_optimization.agent.DataPipelineService"),
            patch("src.skills.ai_model_auto_optimization.agent.StorageService"),
            patch("src.skills.ai_model_auto_optimization.agent.NotificationService"),
            patch("redis.Redis"),
        ):
            return OptimizationAgent()

    @pytest.fixture
    def sample_data(self):
        """Create sample training/validation data"""
        np.random.seed(42)
        X_train = np.random.randn(1000, 10)
        y_train = np.random.randint(0, 2, 1000)
        X_val = np.random.randn(200, 10)
        y_val = np.random.randint(0, 2, 200)

        return X_train, y_train, X_val, y_val

    @pytest.fixture
    def sample_metrics(self):
        """Create sample metrics"""
        return [
            {
                "accuracy": 0.85,
                "precision": 0.83,
                "recall": 0.87,
                "f1": 0.85,
                "latency_ms": 150,
                "prediction_confidence": 0.78,
                "drift_score": 0.05,
                "timestamp": datetime.utcnow().isoformat(),
            }
        ]

    @pytest.mark.asyncio
    async def test_optimize_model_success(self, agent, sample_data, sample_metrics):
        """Test successful model optimization"""
        X_train, y_train, X_val, y_val = sample_data

        # Mock dependencies
        agent.monitoring.get_metrics = AsyncMock(return_value=sample_metrics)
        agent.analyzer.analyze_performance = AsyncMock(
            return_value={
                "needs_optimization": True,
                "performance_degradation": 0.1,
                "drift_score": 0.15,
            }
        )
        agent.data_pipeline.get_training_data = AsyncMock(
            return_value=pd.DataFrame(
                {
                    **{f"feature_{i}": X_train[:, i] for i in range(X_train.shape[1])},
                    "target": y_train,
                }
            )
        )
        agent.data_pipeline.get_validation_data = AsyncMock(
            return_value=pd.DataFrame(
                {
                    **{f"feature_{i}": X_val[:, i] for i in range(X_val.shape[1])},
                    "target": y_val,
                }
            )
        )
        agent.storage.save_model = AsyncMock()
        agent.storage.save_metrics = AsyncMock()
        agent.notifications.send_alert = AsyncMock()

        # Mock Optuna to avoid actual optimization
        with patch("optuna.create_study") as mock_study:
            mock_study_instance = MagicMock()
            mock_study_instance.best_params = {
                "num_leaves": 31,
                "learning_rate": 0.05,
                "feature_fraction": 0.8,
            }
            mock_study_instance.best_value = 0.87
            mock_study_instance.trials = [MagicMock()]
            mock_study_instance.trials[-1].datetime_complete = datetime.utcnow()
            mock_study.return_value = mock_study_instance

            # Mock LightGBM model
            with patch("lightgbm.LGBMClassifier") as mock_lgb:
                mock_model = MagicMock()
                mock_model.predict = MagicMock(return_value=y_val)
                mock_model.predict_proba = MagicMock(
                    return_value=np.random.rand(len(y_val), 2)
                )
                mock_lgb.return_value = mock_model

                result = await agent.optimize_model("test_model", "full")

                assert result.status == "success"
                assert result.model_id == "test_model"
                assert result.optimization_type == "full"
                assert isinstance(result, OptimizationResult)

    @pytest.mark.asyncio
    async def test_optimize_model_no_optimization_needed(self, agent, sample_metrics):
        """Test optimization when not needed"""
        agent.monitoring.get_metrics = AsyncMock(return_value=sample_metrics)
        agent.analyzer.analyze_performance = AsyncMock(
            return_value={
                "needs_optimization": False,
                "performance_degradation": 0.01,
                "drift_score": 0.02,
            }
        )
        agent.storage.save_metrics = AsyncMock()

        result = await agent.optimize_model("test_model", "full")

        assert result.status == "skipped"
        assert result.error_message == "No optimization needed"

    @pytest.mark.asyncio
    async def test_tune_hyperparameters_optuna(self, agent, sample_data):
        """Test hyperparameter tuning with Optuna"""
        X_train, y_train, X_val, y_val = sample_data

        agent.data_pipeline.get_training_data = AsyncMock(
            return_value=pd.DataFrame(
                {
                    **{f"feature_{i}": X_train[:, i] for i in range(X_train.shape[1])},
                    "target": y_train,
                }
            )
        )
        agent.data_pipeline.get_validation_data = AsyncMock(
            return_value=pd.DataFrame(
                {
                    **{f"feature_{i}": X_val[:, i] for i in range(X_val.shape[1])},
                    "target": y_val,
                }
            )
        )

        # Mock Optuna
        with patch("optuna.create_study") as mock_study:
            mock_study_instance = MagicMock()
            mock_study_instance.best_params = {"num_leaves": 31, "learning_rate": 0.05}
            mock_study_instance.best_value = 0.87
            mock_study_instance.trials = [MagicMock()]
            mock_study_instance.trials[-1].datetime_complete = datetime.utcnow()
            mock_study.return_value = mock_study_instance

            result = await agent.tune_hyperparameters("test_model", "optuna", 50)

            assert "best_params" in result
            assert "best_score" in result
            assert "error" not in result

    @pytest.mark.asyncio
    async def test_create_ensemble(self, agent, sample_data):
        """Test ensemble creation"""
        X_train, y_train, X_val, y_val = sample_data

        # Mock base models
        mock_model1 = MagicMock()
        mock_model1.predict_proba = MagicMock(
            return_value=np.random.rand(len(y_val), 2)
        )
        mock_model2 = MagicMock()
        mock_model2.predict = MagicMock(return_value=np.random.rand(len(y_val)))

        agent.storage.load_model = AsyncMock(side_effect=[mock_model1, mock_model2])
        agent.data_pipeline.get_validation_data = AsyncMock(
            return_value=pd.DataFrame(
                {
                    **{f"feature_{i}": X_val[:, i] for i in range(X_val.shape[1])},
                    "target": y_val,
                }
            )
        )
        agent.storage.save_metrics = AsyncMock()

        result = await agent.create_ensemble(["model1", "model2"], "weighted")

        assert "ensemble_method" in result
        assert "metrics" in result
        assert "error" not in result
        assert result["base_models_count"] == 2

    @pytest.mark.asyncio
    async def test_get_optimization_status(self, agent):
        """Test getting optimization status"""
        process_id = "test_process_123"
        test_data = {
            "process_id": process_id,
            "process_type": "hyperparameter_optimization",
            "status": "completed",
            "result": {"best_score": 0.87},
            "timestamp": datetime.utcnow().isoformat(),
        }

        agent.redis_client.get = MagicMock(
            return_value=str(test_data).replace("'", '"')
        )

        with patch("json.loads", return_value=test_data):
            result = await agent.get_optimization_status(process_id)

            assert result["process_id"] == process_id
            assert result["status"] == "completed"

    def test_prepare_data(self, agent):
        """Test data preparation"""
        training_data = pd.DataFrame(
            {
                "feature_1": [1, 2, 3, 4],
                "feature_2": [5, 6, 7, 8],
                "target": [0, 1, 0, 1],
            }
        )

        validation_data = pd.DataFrame(
            {"feature_1": [9, 10], "feature_2": [11, 12], "target": [1, 0]}
        )

        X_train, X_val, y_train, y_val = agent._prepare_data(
            training_data, validation_data
        )

        assert X_train.shape == (4, 2)
        assert X_val.shape == (2, 2)
        assert len(y_train) == 4
        assert len(y_val) == 2


class TestModelAnalyzer:
    """Test cases for ModelAnalyzer"""

    @pytest.fixture
    def analyzer(self):
        monitoring_service = AsyncMock()
        return ModelAnalyzer(monitoring_service)

    @pytest.mark.asyncio
    async def test_analyze_performance_degradation_detected(self, analyzer):
        """Test performance analysis with degradation"""
        metrics = [
            {"accuracy": 0.85, "prediction_confidence": 0.8},
            {"accuracy": 0.87, "prediction_confidence": 0.82},
            {"accuracy": 0.86, "prediction_confidence": 0.81},
            {"accuracy": 0.80, "prediction_confidence": 0.75},  # Recent drop
            {"accuracy": 0.78, "prediction_confidence": 0.74},  # More drop
        ]

        analyzer.monitoring.get_metrics = AsyncMock(return_value=metrics)

        result = await analyzer.analyze_performance("test_model", 24)

        assert result["model_id"] == "test_model"
        assert result["performance_degradation"] > 0.05
        assert result["needs_optimization"] is True
        assert "current_metrics" in result
        assert "drift_score" in result

    @pytest.mark.asyncio
    async def test_analyze_performance_no_degradation(self, analyzer):
        """Test performance analysis without degradation"""
        metrics = [
            {"accuracy": 0.85, "prediction_confidence": 0.8},
            {"accuracy": 0.86, "prediction_confidence": 0.81},
            {"accuracy": 0.87, "prediction_confidence": 0.82},
            {"accuracy": 0.86, "prediction_confidence": 0.81},
            {"accuracy": 0.88, "prediction_confidence": 0.83},
        ]

        analyzer.monitoring.get_metrics = AsyncMock(return_value=metrics)

        result = await analyzer.analyze_performance("test_model", 24)

        assert result["performance_degradation"] <= 0.05
        assert result["needs_optimization"] is False


class TestHyperparameterOptimizer:
    """Test cases for HyperparameterOptimizer"""

    @pytest.fixture
    def optimizer(self):
        return HyperparameterOptimizer(OptimizationConfig(max_trials=10))

    @pytest.fixture
    def sample_data(self):
        """Create sample data"""
        X_train = np.random.randn(100, 5)
        y_train = np.random.randint(0, 2, 100)
        X_val = np.random.randn(20, 5)
        y_val = np.random.randint(0, 2, 20)
        return X_train, y_train, X_val, y_val

    @pytest.mark.asyncio
    async def test_optimize_with_optuna(self, optimizer, sample_data):
        """Test Optuna optimization"""
        X_train, y_train, X_val, y_val = sample_data

        with patch("optuna.create_study") as mock_study:
            mock_study_instance = MagicMock()
            mock_study_instance.best_params = {"num_leaves": 31, "learning_rate": 0.05}
            mock_study_instance.best_value = 0.75
            mock_study_instance.trials = [MagicMock()]
            mock_study_instance.trials[-1].datetime_complete = datetime.utcnow()
            mock_study.return_value = mock_study_instance

            with patch("lightgbm.LGBMClassifier") as mock_lgb:
                mock_model = MagicMock()
                mock_model.predict = MagicMock(return_value=y_val)
                mock_lgb.return_value = mock_model

                result = await optimizer.optimize_with_optuna(
                    "lightgbm", X_train, y_train, X_val, y_val
                )

                assert "best_params" in result
                assert "best_score" in result
                assert "error" not in result
                assert result["best_score"] == 0.75


class TestAutoRetrainer:
    """Test cases for AutoRetrainer"""

    @pytest.fixture
    def retrainer(self):
        data_pipeline = AsyncMock()
        deployment_service = AsyncMock()
        return AutoRetrainer(data_pipeline, deployment_service, OptimizationConfig())

    @pytest.mark.asyncio
    async def test_trigger_retraining_insufficient_data(self, retrainer):
        """Test retraining with insufficient data"""
        retrainer.data_pipeline.get_training_data = AsyncMock(
            return_value=pd.DataFrame({"feature_1": [1, 2], "target": [0, 1]})
        )

        result = await retrainer.trigger_retraining("test_model", "full", True)

        assert result["status"] == "skipped"
        assert "Insufficient training data" in result["reason"]
        assert result["available"] < result["min_required"]

    @pytest.mark.asyncio
    async def test_trigger_retraining_success(self, retrainer):
        """Test successful retraining"""
        # Mock sufficient data
        training_data = pd.DataFrame(
            {"feature_1": list(range(1500)), "target": [i % 2 for i in range(1500)]}
        )
        validation_data = pd.DataFrame(
            {
                "feature_1": list(range(200, 250)),
                "target": [i % 2 for i in range(200, 250)],
            }
        )

        retrainer.data_pipeline.get_training_data = AsyncMock(
            return_value=training_data
        )
        retrainer.data_pipeline.get_validation_data = AsyncMock(
            return_value=validation_data
        )
        retrainer.deployment.shadow_deploy = AsyncMock(
            return_value={"status": "success"}
        )

        with patch("lightgbm.LGBMClassifier") as mock_lgb:
            mock_model = MagicMock()
            mock_lgb.return_value = mock_model

            result = await retrainer.trigger_retraining("test_model", "full", True)

            assert result["status"] == "success"
            assert result["model_id"] == "test_model"
            assert result["training_samples"] == 1500


class TestEnsembleCreator:
    """Test cases for EnsembleCreator"""

    @pytest.fixture
    def ensemble_creator(self):
        return EnsembleCreator(OptimizationConfig())

    @pytest.fixture
    def sample_ensemble_data(self):
        """Create sample ensemble data"""
        np.random.seed(42)
        y_val = np.random.randint(0, 2, 100)
        predictions = np.random.rand(100, 3)  # 3 models
        return predictions, y_val

    @pytest.mark.asyncio
    async def test_create_ensemble_weighted(
        self, ensemble_creator, sample_ensemble_data
    ):
        """Test weighted ensemble creation"""
        predictions, y_val = sample_ensemble_data

        # Mock base models
        mock_models = [MagicMock() for _ in range(3)]
        for model in mock_models:
            model.predict_proba = MagicMock(return_value=predictions[:, [0, 1]])

        result = await ensemble_creator.create_ensemble(
            mock_models, "weighted", predictions, y_val
        )

        assert result["ensemble_method"] == "weighted"
        assert "weights" in result
        assert "metrics" in result
        assert result["base_models_count"] == 3
        assert result["diversity_score"] >= 0

    @pytest.mark.asyncio
    async def test_create_ensemble_stacking(
        self, ensemble_creator, sample_ensemble_data
    ):
        """Test stacking ensemble creation"""
        predictions, y_val = sample_ensemble_data

        # Mock base models
        mock_models = [MagicMock() for _ in range(3)]
        for model in mock_models:
            model.predict_proba = MagicMock(return_value=predictions[:, [0, 1]])

        with patch("sklearn.linear_model.LogisticRegression") as mock_lr:
            mock_lr_instance = MagicMock()
            mock_lr_instance.predict_proba = MagicMock(
                return_value=np.random.rand(len(y_val), 2)
            )
            mock_lr.return_value = mock_lr_instance

            result = await ensemble_creator.create_ensemble(
                mock_models, "stacking", predictions, y_val
            )

            assert result["ensemble_method"] == "stacking"
            assert "metrics" in result

    def test_calculate_diversity(self, ensemble_creator):
        """Test diversity calculation"""
        # High correlation (low diversity)
        pred1 = np.array([0.8, 0.2, 0.7, 0.3])
        pred2 = np.array([0.82, 0.18, 0.68, 0.32])
        pred3 = np.array([0.78, 0.22, 0.72, 0.28])

        predictions = np.column_stack([pred1, pred2, pred3])
        diversity = ensemble_creator._calculate_diversity(predictions)

        assert diversity >= 0 and diversity <= 1
        assert diversity < 0.5  # Should be low due to high correlation


# Integration tests for the full workflow
class TestFullWorkflow:
    """Integration tests for complete optimization workflows"""

    @pytest.mark.asyncio
    async def test_complete_optimization_workflow(self):
        """Test complete optimization workflow from analysis to deployment"""
        with (
            patch("src.skills.ai_model_auto_optimization.agent.ModelRegistryService"),
            patch("src.skills.ai_model_auto_optimization.agent.MonitoringService"),
            patch("src.skills.ai_model_auto_optimization.agent.DeploymentService"),
            patch("src.skills.ai_model_auto_optimization.agent.DataPipelineService"),
            patch("src.skills.ai_model_auto_optimization.agent.StorageService"),
            patch("src.skills.ai_model_auto_optimization.agent.NotificationService"),
            patch("redis.Redis"),
            patch("mlflow.start_run"),
            patch("mlflow.log_params"),
            patch("mlflow.log_metrics"),
        ):
            agent = OptimizationAgent()

            # Setup mocks
            agent.monitoring.get_metrics = AsyncMock(
                return_value=[
                    {
                        "accuracy": 0.75,
                        "precision": 0.73,
                        "recall": 0.77,
                        "f1": 0.75,
                        "latency_ms": 200,
                        "prediction_confidence": 0.70,
                        "drift_score": 0.12,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                ]
            )

            agent.analyzer.analyze_performance = AsyncMock(
                return_value={
                    "needs_optimization": True,
                    "performance_degradation": 0.1,
                    "drift_score": 0.15,
                }
            )

            # Create sample data
            X_train = np.random.randn(1000, 10)
            y_train = np.random.randint(0, 2, 1000)
            X_val = np.random.randn(200, 10)
            y_val = np.random.randint(0, 2, 200)

            agent.data_pipeline.get_training_data = AsyncMock(
                return_value=pd.DataFrame(
                    {
                        **{
                            f"feature_{i}": X_train[:, i]
                            for i in range(X_train.shape[1])
                        },
                        "target": y_train,
                    }
                )
            )
            agent.data_pipeline.get_validation_data = AsyncMock(
                return_value=pd.DataFrame(
                    {
                        **{f"feature_{i}": X_val[:, i] for i in range(X_val.shape[1])},
                        "target": y_val,
                    }
                )
            )

            agent.storage.save_model = AsyncMock()
            agent.storage.save_metrics = AsyncMock()
            agent.notifications.send_alert = AsyncMock()

            # Mock optimization process
            with patch("optuna.create_study") as mock_study:
                mock_study_instance = MagicMock()
                mock_study_instance.best_params = {
                    "num_leaves": 50,
                    "learning_rate": 0.03,
                    "feature_fraction": 0.85,
                }
                mock_study_instance.best_value = 0.82
                mock_study_instance.trials = [MagicMock()]
                mock_study_instance.trials[-1].datetime_complete = datetime.utcnow()
                mock_study.return_value = mock_study_instance

                with patch("lightgbm.LGBMClassifier") as mock_lgb:
                    mock_model = MagicMock()
                    mock_model.predict = MagicMock(return_value=y_val)
                    mock_lgb.return_value = mock_model

                    result = await agent.optimize_model("trading_model_v1", "full")

                    assert result.status == "success"
                    assert result.improvement_percentage > 0
                    assert isinstance(result, OptimizationResult)


# Performance tests
class TestPerformance:
    """Performance tests for optimization components"""

    @pytest.mark.asyncio
    async def test_optimization_performance(self):
        """Test that optimization completes within reasonable time"""
        with (
            patch("src.skills.ai_model_auto_optimization.agent.ModelRegistryService"),
            patch("src.skills.ai_model_auto_optimization.agent.MonitoringService"),
            patch("src.skills.ai_model_auto_optimization.agent.DeploymentService"),
            patch("src.skills.ai_model_auto_optimization.agent.DataPipelineService"),
            patch("src.skills.ai_model_auto_optimization.agent.StorageService"),
            patch("src.skills.ai_model_auto_optimization.agent.NotificationService"),
            patch("redis.Redis"),
        ):
            agent = OptimizationAgent()
            agent.config.max_trials = 5  # Keep it small for performance test

            # Setup minimal mocks
            agent.monitoring.get_metrics = AsyncMock(return_value=[])
            agent.analyzer.analyze_performance = AsyncMock(
                return_value={"needs_optimization": False}
            )
            agent.storage.save_metrics = AsyncMock()

            start_time = datetime.utcnow()
            result = await agent.optimize_model("test_model", "full")
            end_time = datetime.utcnow()

            # Should complete quickly when no optimization is needed
            execution_time = (end_time - start_time).total_seconds()
            assert execution_time < 5.0  # Should complete within 5 seconds
            assert result.status == "skipped"
