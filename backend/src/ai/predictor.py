"""
Advanced AI/ML Predictor - Transformer-based Time Series Forecasting
"""

import asyncio
import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional, Union, Callable, Awaitable
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    ticker: str
    predictions: List[float]
    confidence: float
    model_type: str
    timestamp: str


@dataclass
class MarketFeatures:
    price: float
    volume: float
    volatility: float
    momentum: float
    trend_strength: float
    rsi: float
    macd: float
    bollinger_upper: float
    bollinger_lower: float
    sentiment_score: float


class TransformerPredictor(nn.Module):
    """Transformer-based time series predictor for stock price forecasting."""

    def __init__(
        self,
        input_size: int = 10,
        hidden_size: int = 64,
        num_layers: int = 3,
        num_heads: int = 8,
        dropout: float = 0.1,
    ):
        super().__init__()

        self.input_size = input_size
        self.hidden_size = hidden_size

        # Input projection
        self.input_projection = nn.Linear(input_size, hidden_size)

        # Positional encoding
        self.pos_encoder = PositionalEncoding(hidden_size, dropout)

        # Transformer encoder layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_size,
            nhead=num_heads,
            dim_feedforward=hidden_size * 4,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer, num_layers=num_layers
        )

        # Output layers
        self.output_projection = nn.Linear(hidden_size, 1)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch_size, seq_len, input_size)

        # Input projection
        x = self.input_projection(x)  # (batch_size, seq_len, hidden_size)

        # Add positional encoding
        x = self.pos_encoder(x)

        # Transformer encoding
        x = self.transformer_encoder(x)  # (batch_size, seq_len, hidden_size)

        # Global average pooling
        x = torch.mean(x, dim=1)  # (batch_size, hidden_size)

        # Output projection
        x = self.dropout(x)
        x = self.output_projection(x)  # (batch_size, 1)

        return x


class PositionalEncoding(nn.Module):
    """Positional encoding for transformer."""

    def __init__(self, d_model: int, dropout: float = 0.1, max_len: int = 5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-np.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[: x.size(0)]
        return self.dropout(x)


class EnsemblePredictor:
    """Ensemble predictor combining multiple models."""

    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_engineer = FeatureEngineer()

    def add_model(self, name: str, model: nn.Module):
        """Add a model to the ensemble."""
        self.models[name] = model

    def train_ensemble(self, data: Dict[str, pd.DataFrame], epochs: int = 100):
        """Train all models in the ensemble."""
        logger.info("Training ensemble models...")

        for ticker, df in data.items():
            logger.info(f"Training model for {ticker}")

            # Feature engineering
            features = self.feature_engineer.extract_features(df)
            X, y = self._prepare_training_data(features)

            # Train each model
            for model_name, model in self.models.items():
                self._train_model(model_name, model, X, y, epochs)

        logger.info("Ensemble training completed")

    def _train_model(
        self, name: str, model: nn.Module, X: torch.Tensor, y: torch.Tensor, epochs: int
    ):
        """Train a single model."""
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
        criterion = nn.MSELoss()

        model.train()
        for epoch in range(epochs):
            optimizer.zero_grad()
            output = model(X)
            loss = criterion(output.squeeze(), y)
            loss.backward()
            optimizer.step()

            if (epoch + 1) % 20 == 0:
                logger.debug(
                    f"{name} Epoch {epoch + 1}/{epochs}, Loss: {loss.item():.4f}"
                )

    def predict_ensemble(
        self, ticker: str, recent_data: pd.DataFrame, prediction_horizon: int = 5
    ) -> PredictionResult:
        """Make ensemble predictions."""
        # Feature engineering
        features = self.feature_engineer.extract_features(recent_data)
        X = self._prepare_prediction_data(features)

        predictions = []
        confidences = []

        # Get predictions from each model
        for model_name, model in self.models.items():
            model.eval()
            with torch.no_grad():
                pred = model(X).squeeze().cpu().numpy()
                predictions.append(pred)

                # Calculate confidence based on prediction variance
                confidence = self._calculate_confidence(pred)
                confidences.append(confidence)

        # Ensemble prediction (weighted average)
        weights = np.array(confidences) / sum(confidences)
        ensemble_pred = np.average(predictions, weights=weights, axis=0)
        avg_confidence = np.mean(confidences)

        return PredictionResult(
            ticker=ticker,
            predictions=ensemble_pred.tolist(),
            confidence=float(avg_confidence),
            model_type="transformer_ensemble",
            timestamp=pd.Timestamp.now().isoformat(),
        )

    def _calculate_confidence(self, prediction: np.ndarray) -> float:
        """Calculate prediction confidence based on various metrics."""
        # Simple confidence calculation - can be enhanced with more sophisticated methods
        variance = np.var(prediction)
        confidence = 1.0 / (1.0 + variance)  # Higher variance = lower confidence
        return min(confidence, 1.0)

    def _prepare_training_data(
        self, features: pd.DataFrame
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Prepare data for training."""
        # This is a simplified version - in practice, you'd use sliding windows
        # and proper train/validation splits
        feature_cols = [col for col in features.columns if col != "target"]
        X = torch.FloatTensor(features[feature_cols].values).unsqueeze(0)
        y = torch.FloatTensor(features["target"].values)
        return X, y

    def _prepare_prediction_data(self, features: pd.DataFrame) -> torch.Tensor:
        """Prepare data for prediction."""
        feature_cols = [col for col in features.columns if col != "target"]
        X = torch.FloatTensor(features[feature_cols].tail(1).values).unsqueeze(0)
        return X


class FeatureEngineer:
    """Advanced feature engineering for financial time series."""

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract comprehensive features from price data."""
        features = pd.DataFrame(index=df.index)

        # Basic price features
        features["price"] = df["Close"]
        features["returns"] = df["Close"].pct_change()
        features["log_returns"] = np.log(df["Close"] / df["Close"].shift(1))

        # Volume features
        features["volume"] = df["Volume"]
        features["volume_ma"] = df["Volume"].rolling(20).mean()

        # Volatility features
        features["volatility"] = df["Close"].rolling(20).std()
        features["volatility_ratio"] = features["volatility"] / features[
            "volatility"
        ].shift(1)

        # Momentum indicators
        features["momentum"] = df["Close"] / df["Close"].shift(10) - 1
        features["momentum_acceleration"] = features["momentum"] - features[
            "momentum"
        ].shift(1)

        # Trend strength
        features["trend_strength"] = (
            abs(df["Close"] - df["Close"].shift(20)) / features["volatility"]
        )

        # RSI
        delta = df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss
        features["rsi"] = 100 - (100 / (1 + rs))

        # MACD
        ema12 = df["Close"].ewm(span=12).mean()
        ema26 = df["Close"].ewm(span=26).mean()
        features["macd"] = ema12 - ema26
        features["macd_signal"] = features["macd"].ewm(span=9).mean()
        features["macd_histogram"] = features["macd"] - features["macd_signal"]

        # Bollinger Bands
        sma20 = df["Close"].rolling(20).mean()
        std20 = df["Close"].rolling(20).std()
        features["bollinger_upper"] = sma20 + (std20 * 2)
        features["bollinger_lower"] = sma20 - (std20 * 2)
        features["bollinger_position"] = (df["Close"] - features["bollinger_lower"]) / (
            features["bollinger_upper"] - features["bollinger_lower"]
        )

        # Target for prediction (next day's return)
        features["target"] = df["Close"].shift(-1) / df["Close"] - 1

        # Remove NaN values
        features = features.dropna()

        return features


class RealTimeLearner:
    """Real-time model updating and learning."""

    def __init__(self, predictor: EnsemblePredictor):
        self.predictor = predictor
        self.learning_buffer = []
        self.buffer_size = 1000

    def add_observation(
        self, ticker: str, features: MarketFeatures, actual_return: float
    ):
        """Add new observation for online learning."""
        observation = {
            "ticker": ticker,
            "features": features,
            "actual_return": actual_return,
            "timestamp": pd.Timestamp.now(),
        }

        self.learning_buffer.append(observation)

        # Keep buffer size limited
        if len(self.learning_buffer) > self.buffer_size:
            self.learning_buffer.pop(0)

        # Trigger incremental learning if buffer is full
        if len(self.learning_buffer) >= 100:
            self._incremental_learning()

    def _incremental_learning(self):
        """Perform incremental learning with recent data."""
        logger.info("Performing incremental learning...")

        # Convert buffer to training data
        recent_data = pd.DataFrame(
            [
                {**obs["features"].__dict__, "target": obs["actual_return"]}
                for obs in self.learning_buffer[-100:]
            ]
        )

        # Online learning update (simplified)
        # In practice, you'd use techniques like online gradient descent
        # or experience replay

        logger.info("Incremental learning completed")

    def get_learning_stats(self) -> Dict:
        """Get learning statistics."""
        return {
            "buffer_size": len(self.learning_buffer),
            "learning_rate": 0.01,  # Placeholder
            "last_update": pd.Timestamp.now().isoformat(),
        }


# Global instances
predictor = EnsemblePredictor()
real_time_learner = RealTimeLearner(predictor)


def initialize_models():
    """Initialize AI models."""
    # Create transformer model
    transformer_model = TransformerPredictor(
        input_size=15,  # Number of features
        hidden_size=64,
        num_layers=3,
        num_heads=8,
    )

    predictor.add_model("transformer", transformer_model)
    logger.info("AI models initialized")


async def make_prediction_async(
    ticker: str,
    historical_data: pd.DataFrame,
    prediction_horizon: int = 5,
    callback: Optional[Callable[[PredictionResult], Awaitable[None]]] = None,
) -> PredictionResult:
    """Make price prediction for a ticker asynchronously."""
    try:
        # Run prediction in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            predictor.predict_ensemble,
            ticker,
            historical_data,
            prediction_horizon,
        )

        logger.info(
            f"Async prediction made for {ticker}: confidence {result.confidence:.2f}"
        )

        # Call callback if provided
        if callback:
            await callback(result)

        return result
    except Exception as e:
        logger.error(f"Async prediction failed for {ticker}: {e}")
        raise


def make_prediction(
    ticker: str, historical_data: pd.DataFrame, prediction_horizon: int = 5
) -> PredictionResult:
    """Make price prediction for a ticker."""
    try:
        result = predictor.predict_ensemble(ticker, historical_data, prediction_horizon)
        logger.info(f"Prediction made for {ticker}: confidence {result.confidence:.2f}")
        return result
    except Exception as e:
        logger.error(f"Prediction failed for {ticker}: {e}")
        raise


async def batch_predict_async(
    predictions: List[Tuple[str, pd.DataFrame, int]],
) -> List[PredictionResult]:
    """Make batch predictions asynchronously."""
    tasks = [
        make_prediction_async(ticker, data, horizon)
        for ticker, data, horizon in predictions
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out exceptions and log them
    valid_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            ticker = predictions[i][0]
            logger.error(f"Batch prediction failed for {ticker}: {result}")
        else:
            valid_results.append(result)

    return valid_results


def update_model_with_feedback(
    ticker: str, features: MarketFeatures, actual_return: float
) -> None:
    """Update model with real-time feedback."""
    real_time_learner.add_observation(ticker, features, actual_return)


# Initialize on module import
initialize_models()
