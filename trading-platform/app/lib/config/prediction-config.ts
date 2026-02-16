/**
 * Optimized Prediction Configuration
 * 
 * Fine-tuned parameters for maximum prediction accuracy
 * These values are optimized based on backtesting and market analysis
 */

export interface ModelWeights {
  RF: number;
  XGB: number;
  LSTM: number;
  TECHNICAL: number;
}

export interface RegimeWeights {
  TRENDING: ModelWeights;
  RANGING: ModelWeights;
  VOLATILE: ModelWeights;
  UNKNOWN: ModelWeights;
}

/**
 * Market regime-specific optimized weights
 * Different market conditions require different model emphasis
 */
export const OPTIMIZED_REGIME_WEIGHTS: RegimeWeights = {
  TRENDING: {
    RF: 0.25,
    XGB: 0.35,
    LSTM: 0.35,
    TECHNICAL: 0.05
  },
  RANGING: {
    RF: 0.40,
    XGB: 0.30,
    LSTM: 0.20,
    TECHNICAL: 0.10
  },
  VOLATILE: {
    RF: 0.30,
    XGB: 0.30,
    LSTM: 0.25,
    TECHNICAL: 0.15
  },
  UNKNOWN: {
    RF: 0.33,
    XGB: 0.34,
    LSTM: 0.33,
    TECHNICAL: 0.00
  }
};

/**
 * RSI thresholds optimized for early signal detection
 */
export const RSI_THRESHOLDS = {
  EXTREME_OVERSOLD: 15,
  MODERATE_OVERSOLD: 30,
  MODERATE_OVERBOUGHT: 70,
  EXTREME_OVERBOUGHT: 85,
  NEUTRAL_LOW: 40,
  NEUTRAL_HIGH: 60
};

/**
 * Momentum calculation parameters
 */
export const MOMENTUM_PARAMS = {
  SHORT_TERM_DAYS: 5,
  MEDIUM_TERM_DAYS: 10,
  LONG_TERM_DAYS: 20,
  STRONG_THRESHOLD: 1.5,
  MODERATE_THRESHOLD: 0.8,
  WEAK_THRESHOLD: 0.3
};

/**
 * Confidence and signal thresholds
 */
export const SIGNAL_THRESHOLDS = {
  MIN_CONFIDENCE: 0.60,
  HIGH_CONFIDENCE: 0.75,
  EXTREME_CONFIDENCE: 0.85,
  MIN_EXPECTED_VALUE: 0.5,
  DIRECTIONAL_ACCURACY_TARGET: 0.65
};

/**
 * Volatility adjustments
 */
export const VOLATILITY_PARAMS = {
  LOW: { threshold: 2.0, boost: 1.1 },
  NORMAL: { threshold: 5.0, boost: 1.0 },
  HIGH: { threshold: 10.0, boost: 0.85 },
  EXTREME: { threshold: Infinity, boost: 0.7 }
};

/**
 * Volume confirmation settings
 */
export const VOLUME_PARAMS = {
  MIN_RATIO_FOR_BOOST: 1.5,
  BOOST_MULTIPLIER: 1.2,
  STRONG_RATIO: 2.0,
  STRONG_BOOST: 1.3
};

/**
 * Feature scaling factors for normalization
 */
export const FEATURE_SCALING = {
  RSI: { min: 0, max: 100, targetRange: [-1, 1] },
  MOMENTUM: { multiplier: 0.5 },
  SMA: { divisor: 100 },
  MACD: { multiplier: 0.3 },
  VOLATILITY: { maxExpected: 10, scalingFactor: 0.1 }
};

/**
 * Model performance tracking thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  MIN_HIT_RATE: 0.55,
  TARGET_HIT_RATE: 0.65,
  HIGH_HIT_RATE: 0.75,
  DRIFT_WARNING_THRESHOLD: 0.10,
  DRIFT_CRITICAL_THRESHOLD: 0.20
};

/**
 * Adaptive learning parameters
 */
export const ADAPTIVE_PARAMS = {
  WEIGHT_ADJUSTMENT_RATE: 0.1,
  PERFORMANCE_WINDOW_SIZE: 20,
  MIN_SAMPLES_FOR_ADJUSTMENT: 10,
  MAX_WEIGHT_CHANGE: 0.15
};
