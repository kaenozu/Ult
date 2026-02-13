/**
 * Prediction Cloud Calculator
 * 
 * ATR（平均真波幅）に基づく株価予測雲の計算ロジック
 */

import { OHLCV } from '../../types';
import { calculateATR } from '../utils/technical-analysis';
import {
  PredictionCloudPoint,
  PredictionCloudResult,
  PredictionCloudConfig,
  DEFAULT_PREDICTION_CLOUD_CONFIG,
} from './types';

/**
 * ATRトレンドの方向
 */
export type ATRTrend = 'INCREASING' | 'DECREASING' | 'STABLE';

/**
 * 予測雲を計算するメイン関数
 */
export function calculatePredictionClouds(
  data: OHLCV[],
  symbol: string,
  config: Partial<PredictionCloudConfig> = {}
): PredictionCloudResult {
  // 入力検証
  if (!data || data.length === 0) {
    throw new Error('Data array cannot be empty');
  }

  const mergedConfig = { ...DEFAULT_PREDICTION_CLOUD_CONFIG, ...config };
  
  // 最低限必要なデータ数をチェック（ATR期間 + 予測期間）
  const minDataPoints = mergedConfig.atrPeriod + 5;
  if (data.length < minDataPoints) {
    throw new Error(`Insufficient data. Need at least ${minDataPoints} data points, got ${data.length}`);
  }

  const currentPrice = data[data.length - 1].close;
  
  // ATRを計算
  const atrValues = calculateATR(data, mergedConfig.atrPeriod);
  const currentATR = atrValues[atrValues.length - 1] || currentPrice * 0.02;

  // 過去の雲を計算
  const historicalClouds = calculateHistoricalClouds(
    data,
    atrValues,
    mergedConfig
  );

  // 未来の雲（予測）を計算
  const forecastClouds = calculateForecastClouds(
    data,
    currentPrice,
    currentATR,
    mergedConfig
  );

  // 全雲を結合
  const clouds = [...historicalClouds, ...forecastClouds];

  // サマリーを計算
  const summary = calculateSummary(
    clouds,
    forecastClouds,
    atrValues,
    data
  );

  return {
    symbol,
    currentPrice,
    currentATR,
    clouds,
    historicalClouds,
    forecastClouds,
    summary,
  };
}

/**
 * 過去の予測雲を計算
 */
function calculateHistoricalClouds(
  data: OHLCV[],
  atrValues: number[],
  config: PredictionCloudConfig
): PredictionCloudPoint[] {
  const clouds: PredictionCloudPoint[] = [];

  for (let i = config.atrPeriod; i < data.length; i++) {
    const point = data[i];
    const atr = atrValues[i] || atrValues[atrValues.length - 1];
    
    const center = point.close;
    const range = atr * config.standardMultiplier;
    
    // 最小・最大範囲の制限を適用
    const minRange = center * (config.minRangePercent / 100);
    const maxRange = center * (config.maxRangePercent / 100);
    const clampedRange = Math.max(minRange, Math.min(maxRange, range));
    
    const upper = center + clampedRange / 2;
    const lower = center - clampedRange / 2;

    clouds.push({
      date: point.date,
      timestamp: new Date(point.date).getTime(),
      center,
      upper,
      lower,
      range: clampedRange,
      confidence: calculateConfidence(config.standardMultiplier),
      atr,
      atrMultiplier: config.standardMultiplier,
    });
  }

  return clouds;
}

/**
 * 未来の予測雲を計算
 */
function calculateForecastClouds(
  data: OHLCV[],
  currentPrice: number,
  currentATR: number,
  config: PredictionCloudConfig
): PredictionCloudPoint[] {
  const clouds: PredictionCloudPoint[] = [];
  const lastDate = new Date(data[data.length - 1].date);

  for (let i = 1; i <= config.forecastDays; i++) {
    // 未来日付を計算（営業日のみ）
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    // 土日をスキップ
    while (forecastDate.getDay() === 0 || forecastDate.getDay() === 6) {
      forecastDate.setDate(forecastDate.getDate() + 1);
    }

    const dateStr = forecastDate.toISOString().split('T')[0];
    
    // 予測期間が長いほど範囲を広げる（不確実性の増加）
    const dayMultiplier = Math.sqrt(i); // 平方根で増加
    const adjustedMultiplier = config.standardMultiplier * dayMultiplier;
    
    const center = currentPrice;
    const range = currentATR * adjustedMultiplier;
    
    // 最小・最大範囲の制限を適用
    const minRange = center * (config.minRangePercent / 100);
    const maxRange = center * (config.maxRangePercent / 100);
    const clampedRange = Math.max(minRange, Math.min(maxRange, range));
    
    const upper = center + clampedRange / 2;
    const lower = center - clampedRange / 2;

    clouds.push({
      date: dateStr,
      timestamp: forecastDate.getTime(),
      center,
      upper,
      lower,
      range: clampedRange,
      confidence: calculateConfidence(adjustedMultiplier),
      atr: currentATR,
      atrMultiplier: adjustedMultiplier,
    });
  }

  return clouds;
}

/**
 * ATR倍率から信頼度を計算
 * 統計的な近似: 1.0 = 68%, 1.5 = 87%, 2.0 = 95%
 */
function calculateConfidence(atrMultiplier: number): number {
  // 正規分布の累積分布関数を近似
  // 1.0 -> 68%, 1.5 -> 87%, 2.0 -> 95%
  const confidence = (1 - Math.exp(-0.5 * atrMultiplier * atrMultiplier)) * 100;
  return Math.min(99, Math.max(50, confidence));
}

/**
 * ATRトレンドを計算
 */
export function calculateATRTrend(atrValues: number[]): ATRTrend {
  if (atrValues.length < 3) {
    return 'STABLE';
  }

  // 直近のATR値を使用
  const recent = atrValues.slice(-5);
  const first = recent[0];
  const last = recent[recent.length - 1];
  
  const change = ((last - first) / first) * 100;
  
  if (change > 10) {
    return 'INCREASING';
  } else if (change < -10) {
    return 'DECREASING';
  }
  
  return 'STABLE';
}

/**
 * ボラティリティ評価を取得
 */
export function getVolatilityAssessment(atrPercent: number): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
  if (atrPercent < 1.5) {
    return 'LOW';
  } else if (atrPercent < 3.0) {
    return 'MODERATE';
  } else if (atrPercent < 5.0) {
    return 'HIGH';
  }
  return 'EXTREME';
}

/**
 * トレンド方向を取得
 */
export function getTrendDirection(prices: number[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
  if (prices.length < 2) {
    return 'SIDEWAYS';
  }

  const recent = prices.slice(-10);
  const first = recent[0];
  const last = recent[recent.length - 1];
  
  const change = ((last - first) / first) * 100;
  
  if (change > 2) {
    return 'UP';
  } else if (change < -2) {
    return 'DOWN';
  }
  
  return 'SIDEWAYS';
}

/**
 * リスクスコアを計算（0-100）
 */
export function calculateRiskScore(
  atrPercent: number,
  atrTrend: ATRTrend,
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS'
): number {
  let score = 0;
  
  // ATR%に基づくスコア（0-60点）
  score += Math.min(60, atrPercent * 10);
  
  // ATRトレンドに基づくスコア（0-20点）
  if (atrTrend === 'INCREASING') {
    score += 20;
  } else if (atrTrend === 'STABLE') {
    score += 10;
  }
  
  // トレンド方向に基づくスコア（0-20点）
  if (trendDirection === 'DOWN') {
    score += 20;
  } else if (trendDirection === 'SIDEWAYS') {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * サマリーを計算
 */
function calculateSummary(
  clouds: PredictionCloudPoint[],
  forecastClouds: PredictionCloudPoint[],
  atrValues: number[],
  data: OHLCV[]
): PredictionCloudResult['summary'] {
  // 予測範囲の平均を計算
  const avgRange = forecastClouds.reduce((sum, cloud) => sum + cloud.range, 0) / forecastClouds.length;
  const currentPrice = data[data.length - 1].close;
  const expectedRangePercent = (avgRange / currentPrice) * 100;
  
  // ATRトレンド
  const atrTrend = calculateATRTrend(atrValues);
  
  // 価格トレンド
  const prices = data.map(d => d.close);
  const trendDirection = getTrendDirection(prices);
  
  // ボラティリティ評価
  const currentATR = atrValues[atrValues.length - 1] || currentPrice * 0.02;
  const atrPercent = (currentATR / currentPrice) * 100;
  const volatilityAssessment = getVolatilityAssessment(atrPercent);
  
  // リスクスコア
  const riskScore = calculateRiskScore(atrPercent, atrTrend, trendDirection);
  
  return {
    expectedRangePercent,
    trendDirection,
    volatilityAssessment,
    riskScore,
  };
}
