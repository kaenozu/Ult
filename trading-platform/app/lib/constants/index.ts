/**
 * Centralized Configuration Constants
 * 
 * 全ての定数を一元管理するインデックスファイル
 * Issue #522 - 定数一元化
 */

export * from './api';
export * from './backtest';
export * from './chart';
export * from './common';
export * from './intervals';
export * from './prediction';
export * from './risk-management';
export * from './technical-indicators';
export * from './trading';
export * from './ui';

/**
 * ML予測モデル関連の定数
 * (Note: Should eventually move to prediction.ts)
 */
export const PREDICTION_CONFIG = {
  MODEL_WEIGHTS: { 
    RF: 0.35, 
    XGB: 0.35, 
    LSTM: 0.30 
  },
  THRESHOLDS: { 
    RSI_EXTREME: 3, 
    MOMENTUM_STRONG: 2.0,
    MOMENTUM_SCORE: 2,
    SMA_BULL_SCORE: 2,
    SMA_BEAR_SCORE: 1,
    CONFIDENCE_MIN: 50,
    CONFIDENCE_MAX: 95,
    RSI_EXTREME_LOW: 15,
    RSI_EXTREME_HIGH: 85,
    RSI_OVERSOLD: 20,
    RSI_OVERBOUGHT: 80,
  },
  SCALING: {
    RF: 0.8,
    XGB: 0.9,
    LSTM: 0.6,
  },
  XGB_PARAMS: {
    MOMENTUM_DIVISOR: 3,
    MOMENTUM_MAX_SCORE: 3,
    SMA_DIVISOR: 10,
    SMA5_WEIGHT: 0.5,
    SMA20_WEIGHT: 0.3,
  },
  CONFIDENCE: {
    RSI_EXTREME_BONUS: 10,
    MOMENTUM_BONUS: 8,
    PREDICTION_BONUS: 5,
    BASE: 50,
  },
} as const;

// Legacy export compatibility
export const PREDICTION = PREDICTION_CONFIG;

/**
 * ボラティリティ関連の定数
 */
export const VOLATILITY = {
  DEFAULT_ATR_PERIOD: 14,
  CALCULATION_PERIOD: 20,
} as const;
