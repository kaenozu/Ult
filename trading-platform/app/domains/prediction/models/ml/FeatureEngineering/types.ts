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
  momentum10: number;
  momentum20: number;
  rateOfChange12: number;
  rateOfChange25: number;
  stochasticK: number;
  stochasticD: number;
  williamsR: number;
  cci: number;
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

export type VolumeTrend = 'INCREASING' | 'DECREASING' | 'NEUTRAL';
export type TrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type DataQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type InterestRateTrend = 'RISING' | 'FALLING' | 'STABLE';
export type GdpTrend = 'EXPANDING' | 'CONTRACTING' | 'STABLE';
export type CpiTrend = 'RISING' | 'FALLING' | 'STABLE';
export type UsdjpyTrend = 'APPRECIATING' | 'DEPRECIATING' | 'STABLE';
export type NewsTrend = 'IMPROVING' | 'DECLINING' | 'STABLE';
