/**
 * 純粋な計算ユーティリティ関数
 * 
 * テクニカル指標に基づくスコア計算ロジックを一元管理。
 * すべての関数は副作用なしの純粋関数として実装。
 */

/**
 * RSI計算の定数
 */
export const RSI_CONSTANTS = {
  EXTREME_OVERSOLD: 20,
  EXTREME_OVERBOUGHT: 80,
  VERY_EXTREME_OVERSOLD: 15,
  VERY_EXTREME_OVERBOUGHT: 85,
  EXTREME_SCORE: 3,
} as const;

/**
 * モメンタム計算の定数
 */
export const MOMENTUM_CONSTANTS = {
  STRONG_THRESHOLD: 2.0,
  SCORE: 2,
  DIVISOR: 3,
  MAX_SCORE: 3,
} as const;

/**
 * SMA計算の定数
 */
export const SMA_CONSTANTS = {
  BULL_SCORE: 2,
  BEAR_SCORE: 1,
  DIVISOR: 10,
  SMA5_WEIGHT: 0.5,
  SMA20_WEIGHT: 0.3,
} as const;

/**
 * 信頼度計算の定数
 */
export const CONFIDENCE_CONSTANTS = {
  BASE: 50,
  MIN: 50,
  MAX: 95,
  RSI_EXTREME_BONUS: 10,
  MOMENTUM_BONUS: 8,
  PREDICTION_BONUS: 5,
} as const;

/**
 * RSIの影響スコアを計算
 * 
 * @param rsi - RSI値 (0-100)
 * @returns スコア（買いの場合は正、売りの場合は負）
 */
export function calculateRsiImpact(rsi: number): number {
  if (rsi < RSI_CONSTANTS.EXTREME_OVERSOLD) {
    return RSI_CONSTANTS.EXTREME_SCORE;
  }
  if (rsi > RSI_CONSTANTS.EXTREME_OVERBOUGHT) {
    return -RSI_CONSTANTS.EXTREME_SCORE;
  }
  return 0;
}

/**
 * モメンタムスコアを計算（閾値ベース）
 * 
 * @param momentum - 価格モメンタム
 * @param threshold - 閾値（デフォルト: 2.0）
 * @returns スコア（買いの場合は正、売りの場合は負）
 */
export function calculateMomentumScore(
  momentum: number,
  threshold: number = MOMENTUM_CONSTANTS.STRONG_THRESHOLD
): number {
  if (momentum > threshold) {
    return MOMENTUM_CONSTANTS.SCORE;
  }
  if (momentum < -threshold) {
    return -MOMENTUM_CONSTANTS.SCORE;
  }
  return 0;
}

/**
 * モメンタムスコアを計算（連続値版 - XGBoost用）
 * 
 * @param momentum - 価格モメンタム
 * @returns スコア（最大値で制限）
 */
export function calculateContinuousMomentumScore(momentum: number): number {
  const score = momentum / MOMENTUM_CONSTANTS.DIVISOR;
  // Cap at MAX_SCORE for both positive and negative
  if (score > MOMENTUM_CONSTANTS.MAX_SCORE) return MOMENTUM_CONSTANTS.MAX_SCORE;
  if (score < -MOMENTUM_CONSTANTS.MAX_SCORE) return -MOMENTUM_CONSTANTS.MAX_SCORE;
  return score;
}

/**
 * SMAスコアを計算（シンプル版 - Random Forest用）
 * 
 * @param sma5 - 5期間SMA値
 * @param sma20 - 20期間SMA値
 * @returns スコア（買いの場合は正）
 */
export function calculateSmaScore(sma5: number, sma20: number): number {
  let score = 0;
  if (sma5 > 0) score += SMA_CONSTANTS.BULL_SCORE;
  if (sma20 > 0) score += SMA_CONSTANTS.BEAR_SCORE;
  return score;
}

/**
 * SMAスコアを計算（加重版 - XGBoost用）
 * 
 * @param sma5 - 5期間SMA値
 * @param sma20 - 20期間SMA値
 * @returns スコア（加重計算）
 */
export function calculateWeightedSmaScore(sma5: number, sma20: number): number {
  return (
    (sma5 * SMA_CONSTANTS.SMA5_WEIGHT + sma20 * SMA_CONSTANTS.SMA20_WEIGHT) /
    SMA_CONSTANTS.DIVISOR
  );
}

/**
 * RSIの信頼度ボーナスを計算
 * 
 * @param rsi - RSI値 (0-100)
 * @returns ボーナス値
 */
export function calculateRsiConfidenceBonus(rsi: number): number {
  if (rsi < RSI_CONSTANTS.VERY_EXTREME_OVERSOLD || rsi > RSI_CONSTANTS.VERY_EXTREME_OVERBOUGHT) {
    return CONFIDENCE_CONSTANTS.RSI_EXTREME_BONUS;
  }
  return 0;
}

/**
 * モメンタムの信頼度ボーナスを計算
 * 
 * @param momentum - 価格モメンタム
 * @param threshold - 閾値（デフォルト: 2.0）
 * @returns ボーナス値
 */
export function calculateMomentumConfidenceBonus(
  momentum: number,
  threshold: number = MOMENTUM_CONSTANTS.STRONG_THRESHOLD
): number {
  if (Math.abs(momentum) > threshold) {
    return CONFIDENCE_CONSTANTS.MOMENTUM_BONUS;
  }
  return 0;
}

/**
 * 予測値の信頼度ボーナスを計算
 * 
 * @param prediction - 予測値
 * @param threshold - 閾値（デフォルト: 2.0）
 * @returns ボーナス値
 */
export function calculatePredictionConfidenceBonus(
  prediction: number,
  threshold: number = MOMENTUM_CONSTANTS.STRONG_THRESHOLD
): number {
  if (Math.abs(prediction) > threshold) {
    return CONFIDENCE_CONSTANTS.PREDICTION_BONUS;
  }
  return 0;
}

/**
 * 信頼度を計算（統合版）
 * 
 * @param rsi - RSI値
 * @param momentum - 価格モメンタム
 * @param prediction - 予測値
 * @returns 信頼度 (50-95)
 */
export function calculateConfidence(
  rsi: number,
  momentum: number,
  prediction: number
): number {
  let confidence = CONFIDENCE_CONSTANTS.BASE;
  
  confidence += calculateRsiConfidenceBonus(rsi);
  confidence += calculateMomentumConfidenceBonus(momentum);
  confidence += calculatePredictionConfidenceBonus(prediction);
  
  return Math.min(Math.max(confidence, CONFIDENCE_CONSTANTS.MIN), CONFIDENCE_CONSTANTS.MAX);
}

/**
 * 信頼度を範囲内に制限
 * 
 * @param confidence - 信頼度値
 * @param min - 最小値（デフォルト: 50）
 * @param max - 最大値（デフォルト: 95）
 * @returns 範囲内に制限された信頼度
 */
export function clampConfidence(
  confidence: number,
  min: number = CONFIDENCE_CONSTANTS.MIN,
  max: number = CONFIDENCE_CONSTANTS.MAX
): number {
  return Math.min(Math.max(confidence, min), max);
}
