# Ensemble ML Model Specification

## Prediction Weights
The final signal is a weighted average of three models:
- **Random Forest (RF)**: 35% (Focuses on technical indicator combinations)
- **XGBoost (XGB)**: 35% (Optimizes for gradient boosting on features)
- **LSTM (Deep Learning)**: 30% (Captures sequential price patterns)

## Feature Engineering
- **RSI (14)**: Current level and change rate.
- **SMA (5, 20, 50)**: Percentage distance from current price.
- **Price Momentum**: 10-day rate of change.
- **Volatility**: 20-day annualized standard deviation.
- **MACD**: Signal line crossover strength.
- **Bollinger Bands**: Relative position within bands (0-100%).
- **ATR (14)**: Used for stop-loss and target price calculation.

## Signal Generation Logic
- **BUY**: `ensemblePrediction > 2` AND `confidence > 60`.
- **SELL**: `ensemblePrediction < -2` AND `confidence > 60`.
- **HOLD**: Otherwise.

## Risk Management (ATR-based)
- **Target Price**: `Close + (ATR * 2.5)`
- **Stop Loss**: `Close - (ATR * 1.5)`
