import {
  CandlestickPatternFeatures,
  PriceTrajectoryFeatures,
  VolumeProfileFeatures,
  VolatilityRegimeFeatures
} from '../types';

export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom > 0 ? numerator / denom : 0;
}

export function calculateAutocorrelation(values: number[], lag: number): number {
  if (values.length < lag + 2) return 0;

  const y1 = values.slice(0, -lag);
  const y2 = values.slice(lag);

  return calculateCorrelation(y1, y2);
}

export function getEmptyCandlestickPatterns(): CandlestickPatternFeatures {
  return {
    isDoji: 0,
    isHammer: 0,
    isShootingStar: 0,
    isEngulfing: 0,
    isPiercing: 0,
    isDarkCloud: 0,
    isMorningStar: 0,
    isEveningStar: 0,
    bodyRatio: 0,
    upperShadowRatio: 0,
    lowerShadowRatio: 0,
    candleStrength: 0
  };
}

export function getEmptyPriceTrajectory(): PriceTrajectoryFeatures {
  return {
    zigzagTrend: 0,
    zigzagStrength: 0,
    zigzagReversalProb: 0.5,
    trendConsistency: 0,
    trendAcceleration: 0,
    supportResistanceLevel: 0,
    distanceToSupport: 0,
    distanceToResistance: 0,
    isConsolidation: 0,
    breakoutPotential: 0
  };
}

export function getEmptyVolumeProfile(): VolumeProfileFeatures {
  return {
    morningVolumeRatio: 0.33,
    afternoonVolumeRatio: 0.33,
    closingVolumeRatio: 0.34,
    volumeTrend: 0,
    volumeAcceleration: 0,
    volumeSurge: 0,
    priceVolumeCorrelation: 0,
    volumeAtHighPrice: 0,
    volumeAtLowPrice: 0
  };
}

export function getEmptyVolatilityRegime(): VolatilityRegimeFeatures {
  return {
    volatilityRegime: 'NORMAL',
    regimeChangeProb: 0.5,
    historicalVolatility: 0,
    realizedVolatility: 0,
    volatilitySkew: 0,
    volatilityKurtosis: 0,
    garchVolatility: 0,
    volatilityMomentum: 0,
    volatilityClustering: 0
  };
}
