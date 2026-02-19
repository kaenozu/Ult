/**
 * ML Prediction and Model Configuration Constants
 * 
 * ML予測とモデル設定に関する定数
 * Issue #522 - 定数一元化
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
 * Consolidated ML Prediction Configuration
 * 
 * 全てのML予測設定を一元化
 */
export const PREDICTION_CONFIG = {
  // Model weights
  MODEL_WEIGHTS: {
    RF: 0.35,
    XGB: 0.35,
    LSTM: 0.30,
  },

  // Scoring thresholds
  THRESHOLDS: {
    // RSI
    RSI_EXTREME: 3,
    RSI_EXTREME_LOW: 15,
    RSI_EXTREME_HIGH: 85,
    RSI_OVERSOLD: 20,
    RSI_OVERBOUGHT: 80,

    // Momentum
    MOMENTUM_STRONG: 2.0,
    MOMENTUM_SCORE: 2,
    MOMENTUM_DIVISOR: 3,
    MOMENTUM_MAX_SCORE: 3,

    // SMA
    SMA_BULL_SCORE: 2,
    SMA_BEAR_SCORE: 1,
    SMA_DIVISOR: 10,
    SMA5_WEIGHT: 0.5,
    SMA20_WEIGHT: 0.3,

    // Confidence
    CONFIDENCE_MIN: 50,
    CONFIDENCE_MAX: 95,
  },

  // Model scaling factors
  SCALING: {
    RF: 0.8,
    XGB: 0.9,
    LSTM: 0.6,
  },

  // Confidence calculation
  CONFIDENCE: {
    BASE: 50,
    RSI_EXTREME_BONUS: 10,
    MOMENTUM_BONUS: 8,
    PREDICTION_BONUS: 5,
  },

  // TensorFlow model confidence
  TF: {
    BASE_CONFIDENCE: 50,
    AGREEMENT_WEIGHT: 25,
    ACCURACY_WEIGHT: 25,
  },
} as const;

// Legacy compatibility (deprecated)
export const ML_SCORING = {
  // Random Forest scoring
  RF_RSI_EXTREME_SCORE: PREDICTION_CONFIG.THRESHOLDS.RSI_EXTREME,
  RF_MOMENTUM_STRONG_THRESHOLD: PREDICTION_CONFIG.THRESHOLDS.MOMENTUM_STRONG,
  RF_MOMENTUM_SCORE: PREDICTION_CONFIG.THRESHOLDS.MOMENTUM_SCORE,
  RF_SMA_BULL_SCORE: PREDICTION_CONFIG.THRESHOLDS.SMA_BULL_SCORE,
  RF_SMA_BEAR_SCORE: PREDICTION_CONFIG.THRESHOLDS.SMA_BEAR_SCORE,
  RF_SCALING: PREDICTION_CONFIG.SCALING.RF,

  // XGBoost scoring
  XGB_RSI_EXTREME_SCORE: PREDICTION_CONFIG.THRESHOLDS.RSI_EXTREME,
  XGB_MOMENTUM_DIVISOR: PREDICTION_CONFIG.THRESHOLDS.MOMENTUM_DIVISOR,
  XGB_MOMENTUM_MAX_SCORE: PREDICTION_CONFIG.THRESHOLDS.MOMENTUM_MAX_SCORE,
  XGB_SMA_DIVISOR: PREDICTION_CONFIG.THRESHOLDS.SMA_DIVISOR,
  XGB_SMA5_WEIGHT: PREDICTION_CONFIG.THRESHOLDS.SMA5_WEIGHT,
  XGB_SMA20_WEIGHT: PREDICTION_CONFIG.THRESHOLDS.SMA20_WEIGHT,
  XGB_SCALING: PREDICTION_CONFIG.SCALING.XGB,

  // LSTM scoring
  LSTM_SCALING: PREDICTION_CONFIG.SCALING.LSTM,

  // Confidence calculation
  CONFIDENCE_BASE: PREDICTION_CONFIG.CONFIDENCE.BASE,
  CONFIDENCE_RSI_EXTREME_BONUS: PREDICTION_CONFIG.CONFIDENCE.RSI_EXTREME_BONUS,
  CONFIDENCE_MOMENTUM_BONUS: PREDICTION_CONFIG.CONFIDENCE.MOMENTUM_BONUS,
  CONFIDENCE_PREDICTION_BONUS: PREDICTION_CONFIG.CONFIDENCE.PREDICTION_BONUS,
  CONFIDENCE_MOMENTUM_THRESHOLD: PREDICTION_CONFIG.THRESHOLDS.MOMENTUM_STRONG,
  CONFIDENCE_MIN: PREDICTION_CONFIG.THRESHOLDS.CONFIDENCE_MIN,
  CONFIDENCE_MAX: PREDICTION_CONFIG.THRESHOLDS.CONFIDENCE_MAX,

  // TensorFlow model confidence
  TF_BASE_CONFIDENCE: PREDICTION_CONFIG.TF.BASE_CONFIDENCE,
  TF_AGREEMENT_WEIGHT: PREDICTION_CONFIG.TF.AGREEMENT_WEIGHT,
  TF_ACCURACY_WEIGHT: PREDICTION_CONFIG.TF.ACCURACY_WEIGHT,
} as const;

/**
 * Forecast cone configuration
 */
export const FORECAST_CONE = {
  STEPS: 60, // Steps for forecast cone visualization
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
 * 
 * @deprecated Use PREDICTION_CONFIG for confidence values.
 */
export const PRICE_CALCULATION = {
  DEFAULT_ERROR_MULTIPLIER: 100,
  DEFAULT_ATR_RATIO: 0.02,
  MIN_CONFIDENCE: 50, // Use PREDICTION_CONFIG.THRESHOLDS.CONFIDENCE_MIN
  MAX_CONFIDENCE: 100, // Use PREDICTION_CONFIG.THRESHOLDS.CONFIDENCE_MAX
} as const;

/**
 * Ghost forecast visualization
 * 
 * @deprecated DEFAULT_ATR_RATIO is duplicated in PREDICTION_CONFIG (add if needed).
 */
export const GHOST_FORECAST = {
  DEFAULT_ATR_RATIO: 0.02,
  TARGET_ALPHA: 0.3,
  STOP_ALPHA: 0.1,
  TARGET_FILL_ALPHA: 0.08,
  DASH_PATTERN: [3, 3] as const,
} as const;

/**
 * Consensus Signal calculation constants
 * Phase 1: AI Prediction Improvement
 */
export const CONSENSUS_SIGNAL_CONFIG = {
  // Trend following boost parameters
  TREND_FOLLOWING: {
    BOOST_AMOUNT: 0.4,           // Strong boost for trend following
    PENALTY_AMOUNT: 0.4,         // Strong penalty for counter-trend
    RSI_LOWER_BOUND: 40,         // Lower bound for neutral RSI range
    RSI_UPPER_BOUND: 60,         // Upper bound for neutral RSI range
    MIN_CONFIDENCE_BOOST: 70,    // Minimum confidence when trend boost applied
  },
  
  // Signal thresholds
  THRESHOLDS: {
    SIGNAL_MIN: 0.15,            // Minimum threshold for BUY/SELL signal
    PROBABILITY_WEAK: 0.4,       // Probability threshold for WEAK strength
    PROBABILITY_MODERATE: 0.7,   // Probability threshold for MODERATE strength
    CONFIDENCE_SCALING: 135,     // Scaling factor for confidence calculation
    CONFIDENCE_MAX: 95,          // Maximum confidence cap
    HOLD_CONFIDENCE_MIN: 30,     // Minimum confidence for HOLD signal
    TRADE_CONFIDENCE_MIN: 50,    // Minimum confidence for BUY/SELL signal
  },
  
  // Ensemble bonus parameters
  ENSEMBLE: {
    REVERSAL_COMBO_BONUS: 0.15,  // Bonus for RSI bottom + MACD convergence
    BB_RSI_ALIGNMENT_BONUS: 0.10, // Bonus for BB lower + RSI rising
  },
} as const;

// Legacy export compatibility
export const PREDICTION = PREDICTION_CONFIG;
