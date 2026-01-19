"""
Unit tests for AI predictor module
"""

import pytest
import pandas as pd
import numpy as np
import torch
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from src.ai.predictor import (
    EnsemblePredictor,
    FeatureEngineer,
    TransformerPredictor,
    PredictionResult,
    RealTimeLearner,
    make_prediction,
    update_model_with_feedback,
    MarketFeatures,
)


class TestFeatureEngineer:
    """Test feature engineering functionality"""

    @pytest.fixture
    def feature_engineer(self):
        return FeatureEngineer()

    @pytest.fixture
    def sample_price_data(self):
        """Create sample OHLCV data"""
        dates = pd.date_range("2024-01-01", periods=50, freq="D")
        np.random.seed(42)
        close_prices = 100 + np.cumsum(np.random.randn(50) * 2)

        data = {
            "Open": close_prices * (1 + np.random.randn(50) * 0.01),
            "High": close_prices * (1 + np.random.rand(50) * 0.02),
            "Low": close_prices * (1 - np.random.rand(50) * 0.02),
            "Close": close_prices,
            "Volume": np.random.randint(10000, 100000, 50),
        }
        return pd.DataFrame(data, index=dates)

    def test_extract_features_basic(self, feature_engineer, sample_price_data):
        """Test basic feature extraction"""
        features = feature_engineer.extract_features(sample_price_data)

        # Check that features are created
        expected_features = [
            "price",
            "returns",
            "log_returns",
            "volume",
            "volume_ma",
            "volatility",
            "volatility_ratio",
            "momentum",
            "momentum_acceleration",
            "trend_strength",
            "rsi",
            "macd",
            "macd_signal",
            "macd_histogram",
            "bollinger_upper",
            "bollinger_lower",
            "bollinger_position",
            "target",
        ]

        for feature in expected_features:
            assert feature in features.columns, f"Missing feature: {feature}"

        # Check that NaN values are removed
        assert not features.isnull().any().any()

    def test_extract_features_insufficient_data(self, feature_engineer):
        """Test feature extraction with insufficient data"""
        # Very small dataset
        small_data = pd.DataFrame(
            {
                "Open": [100, 101],
                "High": [102, 103],
                "Low": [99, 100],
                "Close": [101, 102],
                "Volume": [10000, 11000],
            }
        )

        features = feature_engineer.extract_features(small_data)

        # Should handle gracefully, but features might be mostly NaN
        assert isinstance(features, pd.DataFrame)


class TestTransformerPredictor:
    """Test Transformer predictor model"""

    @pytest.fixture
    def transformer_model(self):
        return TransformerPredictor(
            input_size=10, hidden_size=32, num_layers=2, num_heads=4
        )

    def test_model_initialization(self, transformer_model):
        """Test model initialization"""
        assert transformer_model.input_size == 10
        assert transformer_model.hidden_size == 32

    def test_forward_pass(self, transformer_model):
        """Test forward pass through the model"""
        batch_size, seq_len, input_size = 2, 20, 10
        x = torch.randn(batch_size, seq_len, input_size)

        output = transformer_model(x)

        # Output should be (batch_size, 1)
        assert output.shape == (batch_size, 1)
        assert not torch.isnan(output).any()


class TestEnsemblePredictor:
    """Test ensemble predictor functionality"""

    @pytest.fixture
    def ensemble_predictor(self):
        predictor = EnsemblePredictor()
        # Add a simple mock model
        mock_model = Mock()
        mock_model.eval.return_value = None
        mock_model.return_value = torch.tensor([[1.0], [2.0]])
        predictor.add_model("test_model", mock_model)
        return predictor

    def test_add_model(self, ensemble_predictor):
        """Test adding models to ensemble"""
        assert "test_model" in ensemble_predictor.models

    @patch("src.ai.predictor.FeatureEngineer.extract_features")
    def test_predict_ensemble(self, mock_extract, ensemble_predictor):
        """Test ensemble prediction"""
        # Mock feature extraction
        mock_features = pd.DataFrame(
            {
                "feature1": [1.0, 2.0, 3.0],
                "feature2": [0.5, 1.0, 1.5],
                "target": [0.01, 0.02, 0.03],
            }
        )
        mock_extract.return_value = mock_features

        # Mock model prediction
        ensemble_predictor.models[
            "test_model"
        ].return_value.squeeze.return_value.cpu.return_value.numpy.return_value = (
            np.array([1.1, 1.2])
        )

        result = ensemble_predictor.predict_ensemble("TEST", pd.DataFrame())

        assert isinstance(result, PredictionResult)
        assert result.ticker == "TEST"
        assert isinstance(result.predictions, list)
        assert isinstance(result.confidence, float)
        assert result.model_type == "transformer_ensemble"

    def test_calculate_confidence(self, ensemble_predictor):
        """Test confidence calculation"""
        prediction = np.array([1.0, 1.01, 1.02])
        confidence = ensemble_predictor._calculate_confidence(prediction)

        assert 0 <= confidence <= 1


class TestRealTimeLearner:
    """Test real-time learning functionality"""

    @pytest.fixture
    def real_time_learner(self):
        mock_predictor = Mock()
        return RealTimeLearner(mock_predictor)

    def test_add_observation(self, real_time_learner):
        """Test adding observations"""
        features = MarketFeatures(
            price=100.0,
            volume=10000,
            volatility=0.02,
            momentum=0.01,
            trend_strength=0.8,
            rsi=65.0,
            macd=0.5,
            bollinger_upper=105.0,
            bollinger_lower=95.0,
            sentiment_score=0.7,
        )

        real_time_learner.add_observation("TEST", features, 0.015)

        assert len(real_time_learner.learning_buffer) == 1
        assert real_time_learner.learning_buffer[0]["ticker"] == "TEST"
        assert real_time_learner.learning_buffer[0]["actual_return"] == 0.015

    def test_buffer_size_limit(self, real_time_learner):
        """Test buffer size limiting"""
        features = MarketFeatures(
            price=100.0,
            volume=10000,
            volatility=0.02,
            momentum=0.01,
            trend_strength=0.8,
            rsi=65.0,
            macd=0.5,
            bollinger_upper=105.0,
            bollinger_lower=95.0,
            sentiment_score=0.7,
        )

        # Add more than buffer size
        for i in range(1100):
            real_time_learner.add_observation(f"TEST{i}", features, 0.01)

        assert len(real_time_learner.learning_buffer) == real_time_learner.buffer_size

    def test_get_learning_stats(self, real_time_learner):
        """Test getting learning statistics"""
        stats = real_time_learner.get_learning_stats()

        assert "buffer_size" in stats
        assert "learning_rate" in stats
        assert "last_update" in stats


class TestPredictionFunctions:
    """Test prediction utility functions"""

    @patch("src.ai.predictor.predictor")
    def test_make_prediction(self, mock_predictor):
        """Test make_prediction function"""
        mock_result = PredictionResult(
            ticker="TEST",
            predictions=[101.0, 102.0],
            confidence=0.8,
            model_type="test",
            timestamp="2024-01-01T00:00:00",
        )
        mock_predictor.predict_ensemble.return_value = mock_result

        result = make_prediction("TEST", pd.DataFrame())

        assert result.ticker == "TEST"
        assert result.confidence == 0.8
        mock_predictor.predict_ensemble.assert_called_once()

    @patch("src.ai.predictor.real_time_learner")
    def test_update_model_with_feedback(self, mock_learner):
        """Test model update with feedback"""
        features = MarketFeatures(
            price=100.0,
            volume=10000,
            volatility=0.02,
            momentum=0.01,
            trend_strength=0.8,
            rsi=65.0,
            macd=0.5,
            bollinger_upper=105.0,
            bollinger_lower=95.0,
            sentiment_score=0.7,
        )

        update_model_with_feedback("TEST", features, 0.015)

        mock_learner.add_observation.assert_called_once_with("TEST", features, 0.015)


@pytest.mark.asyncio
class TestAsyncPrediction:
    """Test async prediction functionality"""

    @patch("src.ai.predictor.predictor")
    async def test_make_prediction_async(self, mock_predictor):
        """Test async prediction"""
        mock_result = PredictionResult(
            ticker="TEST",
            predictions=[101.0],
            confidence=0.8,
            model_type="test",
            timestamp="2024-01-01T00:00:00",
        )
        mock_predictor.predict_ensemble.return_value = mock_result

        result = await make_prediction_async("TEST", pd.DataFrame())

        assert result.ticker == "TEST"
        assert result.confidence == 0.8

    @patch("src.ai.predictor.make_prediction_async")
    async def test_batch_predict_async(self, mock_async_predict):
        """Test batch async prediction"""
        from src.ai.predictor import batch_predict_async

        mock_result = PredictionResult(
            ticker="TEST",
            predictions=[101.0],
            confidence=0.8,
            model_type="test",
            timestamp="2024-01-01T00:00:00",
        )
        mock_async_predict.return_value = mock_result

        predictions = [("TEST", pd.DataFrame(), 5)]
        results = await batch_predict_async(predictions)

        assert len(results) == 1
        assert results[0].ticker == "TEST"
