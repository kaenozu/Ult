import { OHLCV } from '@/app/types';
import { PatternFeatures } from '../candlestick-pattern-service';
import { PredictionFeatures } from '../feature-engineering-service';
import { RSI_THRESHOLDS } from '@/app/lib/config/prediction-config';
import { MarketRegime, SIGNAL_THRESHOLDS } from './types';

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

export function generateDataHash(data: OHLCV[]): string {
  const recentData = data.slice(-10);
  const hashInput = recentData.map(d => 
    `${d.close.toFixed(2)}${d.volume.toFixed(0)}`
  ).join('');
  
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < hashInput.length; i++) {
    hash ^= hashInput.charCodeAt(i);
    hash *= FNV_PRIME;
  }
  return hash.toString(16);
}

export function detectMarketRegime(data: OHLCV[]): MarketRegime {
  if (data.length < 20) return 'UNKNOWN';

  const closes = data.map(d => d.close);
  const returns: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const period = Math.min(20, closes.length);
  const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const currentPrice = closes[closes.length - 1];
  const trendStrength = Math.abs((currentPrice - sma) / sma) * 100;

  if (volatility > 40) return 'VOLATILE';
  if (trendStrength > 3) return 'TRENDING';
  return 'RANGING';
}

export function calculateEnhancedConfidence(
  features: PredictionFeatures,
  patternFeatures: PatternFeatures,
  ensemble: number,
  rf: number,
  xgb: number,
  lstm: number
): number {
  let confidence = 0.5;

  if (features.rsi < RSI_THRESHOLDS.EXTREME_OVERSOLD || 
      features.rsi > RSI_THRESHOLDS.EXTREME_OVERBOUGHT) {
    confidence += 0.15;
  } else if (features.rsi < RSI_THRESHOLDS.MODERATE_OVERSOLD || 
             features.rsi > RSI_THRESHOLDS.MODERATE_OVERBOUGHT) {
    confidence += 0.08;
  }

  if (Math.abs(features.sma5) > 2) confidence += 0.1;
  if (Math.abs(features.sma20) > 1) confidence += 0.05;
  if (Math.abs(features.sma50) > 0.5) confidence += 0.03;

  if (features.volumeRatio > 1.5) confidence += 0.05;
  if (features.volumeRatio > 2.0) confidence += 0.03;

  if (patternFeatures.candleStrength > 0.7) confidence += 0.08;
  if (patternFeatures.isBullishEngulfing > 0.8 || patternFeatures.isBearishEngulfing > 0.8) {
    confidence += 0.05;
  }

  const predictions = [rf, xgb, lstm];
  const signs = predictions.map(p => Math.sign(p));
  if (signs.every(s => s === signs[0]) && signs[0] !== 0) {
    confidence += 0.1;
  }

  if (features.volatility > 5) confidence *= 0.9;
  if (features.volatility > 10) confidence *= 0.85;

  return Math.min(SIGNAL_THRESHOLDS.EXTREME_CONFIDENCE, Math.max(0, confidence));
}
