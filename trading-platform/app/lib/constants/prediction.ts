/**
 * ML Prediction and Model Configuration Constants
 */

/**
 * ML Model availability and training status
 */
export const ML_MODEL_CONFIG = {
  // Model availability flags
  MODELS_TRAINED: false, // Set to true once models are trained
  REQUIRE_MODELS: false, // Set to true to enforce model availability
  
  // Minimum accuracy requirements
  MIN_DIRECTIONAL_ACCURACY: 0.55, // 55% minimum for direction prediction
  MIN_PROFIT_FACTOR: 1.5, // Minimum profit factor
  MAX_DRAWDOWN: 0.20, // Maximum 20% drawdown
  
  // Model file paths (relative to project root)
  MODEL_DIR: '/models',
  LSTM_MODEL_PATH: '/models/lstm_model.h5',
  TRANSFORMER_MODEL_PATH: '/models/transformer_model.json',
  GB_MODEL_PATH: '/models/gradient_boosting_model.json',
} as const;

/**
 * Ensemble model weights for combining predictions
 */
export const ENSEMBLE_WEIGHTS = {
  RF: 0.35,
  XGB: 0.35,
  LSTM: 0.30,
} as const;

/**
 * ML Model scoring thresholds and parameters
 */
export const ML_SCORING = {
  // Random Forest scoring
  RF_RSI_EXTREME_SCORE: 3,
  RF_MOMENTUM_STRONG_THRESHOLD: 2.0,
  RF_MOMENTUM_SCORE: 2,
  RF_SMA_BULL_SCORE: 2,
  RF_SMA_BEAR_SCORE: 1,
  RF_SCALING: 0.8,

  // XGBoost scoring
  XGB_RSI_EXTREME_SCORE: 3,
  XGB_MOMENTUM_DIVISOR: 3,
  XGB_MOMENTUM_MAX_SCORE: 3,
  XGB_SMA_DIVISOR: 10,
  XGB_SMA5_WEIGHT: 0.5,
  XGB_SMA20_WEIGHT: 0.3,
  XGB_SCALING: 0.9,

  // LSTM scoring
  LSTM_SCALING: 0.6,

  // Confidence calculation
  CONFIDENCE_BASE: 50,
  CONFIDENCE_RSI_EXTREME_BONUS: 10,
  CONFIDENCE_MOMENTUM_BONUS: 8,
  CONFIDENCE_PREDICTION_BONUS: 5,
  CONFIDENCE_MOMENTUM_THRESHOLD: 2.0,
  CONFIDENCE_MIN: 50,
  CONFIDENCE_MAX: 95,

  // TensorFlow model confidence
  TF_BASE_CONFIDENCE: 50,
  TF_AGREEMENT_WEIGHT: 25,
  TF_ACCURACY_WEIGHT: 25,
} as const;

/**
 * Forecast cone configuration
 */
export const FORECAST_CONE = {
  STEPS: 5,
  LOOKBACK_DAYS: 60,
  ATR_MULTIPLIER: 2.0,
} as const;

/**
 * Prediction error calculation weights
 */
export const PREDICTION_ERROR_WEIGHTS = {
  SMA_WEIGHT: 0.4,
  EMA_WEIGHT: 0.6,
  ERROR_MULTIPLIER: 0.9, // Strictness factor for error calculation
  ERROR_THRESHOLD: 0.1, // Hit threshold as percentage of predicted change (tightened from 0.4 to 0.1 for 10% accuracy)
} as const;

/**
 * Price calculation parameters
 */
export const PRICE_CALCULATION = {
  DEFAULT_ERROR_MULTIPLIER: 100,
  DEFAULT_ATR_RATIO: 0.02,
  MIN_CONFIDENCE: 50,
  MAX_CONFIDENCE: 100,
} as const;

/**
 * Ghost forecast visualization
 */
export const GHOST_FORECAST = {
  DEFAULT_ATR_RATIO: 0.02,
  TARGET_ALPHA: 0.3,
  STOP_ALPHA: 0.1,
  TARGET_FILL_ALPHA: 0.08,
  DASH_PATTERN: [3, 3] as const,
} as const;
