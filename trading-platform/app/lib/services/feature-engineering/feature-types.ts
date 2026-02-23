/**
 * Feature Engineering Types
 */

import { OHLCV } from '@/app/types';

export interface TechnicalFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma10: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: number;
  bbWidth: number;
  atr: number;
  atrPercent: number;
  atrRatio: number;
  adx: number;
  momentum10: number;
  momentum20: number;
  rateOfChange12: number;
  rateOfChange25: number;
  stochasticK: number;
  stochasticD: number;
  williamsR: number;
  cci: number;
  aroonUp: number;
  aroonDown: number;
  volumeRatio: number;
  volumeMA5: number;
  volumeMA20: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'NEUTRAL';
  pricePosition: number;
  priceVelocity: number;
  priceAcceleration: number;
}

export interface MacroEconomicFeatures {
  interestRate: number;
  interestRateTrend: 'RISING' | 'FALLING' | 'STABLE';
  gdpGrowth: number;
  gdpTrend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
  cpi: number;
  cpiTrend: 'RISING' | 'FALLING' | 'STABLE';
  inflationRate: number;
  usdjpy?: number;
  usdjpyTrend?: 'APPRECIATING' | 'DEPRECIATING' | 'STABLE';
  macroScore: number;
}

export interface SentimentFeatures {
  newsSentiment: number;
  newsVolume: number;
  newsTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  socialSentiment: number;
  socialVolume: number;
  socialBuzz: number;
  analystRating: number;
  ratingChange: number;
  sentimentScore: number;
}

export interface TimeSeriesFeatures {
  lag1: number;
  lag5: number;
  lag10: number;
  lag20: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma50: number;
  dayOfWeek: number;
  dayOfWeekReturn: number;
  monthOfYear: number;
  monthEffect: number;
  trendStrength: number;
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  cyclicality: number;
  rollingMean5?: number;
  rollingMean20?: number;
  rollingStd5?: number;
  rollingStd20?: number;
  exponentialMA?: number;
  momentumChange?: number;
  priceAcceleration?: number;
  volumeAcceleration?: number;
  autocorrelation?: number;
  fourierDominantFreq?: number;
  fourierAmplitude?: number;
}

export interface AllFeatures {
  technical: TechnicalFeatures;
  macro: MacroEconomicFeatures | null;
  sentiment: SentimentFeatures | null;
  timeSeries: TimeSeriesFeatures;
  featureCount: number;
  lastUpdate: string;
  dataQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface MacroIndicators {
  vix?: number;
  interestRate?: number;
  dollarIndex?: number;
  bondYield?: number;
  sectorPerformance?: { [sector: string]: number };
}

export interface NewsSentimentData {
  positive: number;
  negative: number;
  neutral: number;
  overall: number;
  confidence: number;
}

export interface ExtendedTechnicalFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
  momentum: number;
  rateOfChange: number;
  stochasticRSI: number;
  williamsR: number;
  cci: number;
  atrRatio: number;
  volumeProfile: number;
  pricePosition: number;
  momentumTrend: 'STRONG_UP' | 'UP' | 'NEUTRAL' | 'DOWN' | 'STRONG_DOWN';
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH';
  macroIndicators?: MacroIndicators;
  sentiment?: NewsSentimentData;
  timeSeriesFeatures?: Partial<TimeSeriesFeatures>;
}

export interface FeatureImportance {
  name: string;
  score: number;
  rank: number;
  category: 'trend' | 'momentum' | 'volatility' | 'volume';
}
