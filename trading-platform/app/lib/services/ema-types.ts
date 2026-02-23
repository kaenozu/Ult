export interface EMASignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  probability: number;
  confidence: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  reason: string;
  ema9: number;
  ema21: number;
  adx: number;
  sma50: number;
  currentPrice: number;
}

export interface EMAStrategyConfig {
  shortPeriod: number;
  longPeriod: number;
  smaPeriod: number;
  adxPeriod: number;
  adxThreshold: number;
}

export const DEFAULT_CONFIG: EMAStrategyConfig = {
  shortPeriod: 9,
  longPeriod: 21,
  smaPeriod: 50,
  adxPeriod: 14,
  adxThreshold: 25,
};
