import { OHLCV } from '@/app/types';
import {
  CandlestickPatternFeatures,
  PriceTrajectoryFeatures,
  VolumeProfileFeatures,
  VolatilityRegimeFeatures
} from './types';
import {
  detectDoji,
  detectHammer,
  detectShootingStar,
  detectEngulfing,
  detectPiercing,
  detectDarkCloud,
  detectMorningStar,
  detectEveningStar,
  calculateZigZag,
  calculateTrendConsistency,
  calculateTrendAcceleration,
  calculateSupportResistance,
  detectConsolidation,
  calculateBreakoutPotential,
  calculateVolumeTrend,
  calculateVolumeAcceleration,
  detectVolumeSurge,
  calculateVolumeAtPriceExtremes,
  calculatePriceVolumeCorrelation,
  calculateReturns,
  calculateHistoricalVolatility,
  calculateRealizedVolatility,
  calculateSkewness,
  calculateKurtosis,
  classifyVolatilityRegime,
  calculateRegimeChangeProb,
  estimateGarchVolatility,
  calculateVolatilityMomentum,
  calculateVolatilityClustering,
  getEmptyCandlestickPatterns,
  getEmptyPriceTrajectory,
  getEmptyVolumeProfile,
  getEmptyVolatilityRegime
} from './calculations';

export class EnhancedFeatureService {
  calculateCandlestickPatterns(data: OHLCV[]): CandlestickPatternFeatures {
    if (data.length === 0) {
      return getEmptyCandlestickPatterns();
    }

    const current = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : current;
    const previous2 = data.length > 2 ? data[data.length - 3] : previous;

    const range = current.high - current.low;
    const body = Math.abs(current.close - current.open);
    const upperShadow = current.high - Math.max(current.open, current.close);
    const lowerShadow = Math.min(current.open, current.close) - current.low;

    const bodyRatio = range > 0 ? body / range : 0;
    const upperShadowRatio = range > 0 ? upperShadow / range : 0;
    const lowerShadowRatio = range > 0 ? lowerShadow / range : 0;

    const isDoji = detectDoji(current);
    const isHammer = detectHammer(current);
    const isShootingStar = detectShootingStar(current);
    const isEngulfing = detectEngulfing(current, previous);
    const isPiercing = detectPiercing(current, previous);
    const isDarkCloud = detectDarkCloud(current, previous);
    const isMorningStar = detectMorningStar(current, previous, previous2);
    const isEveningStar = detectEveningStar(current, previous, previous2);

    const candleStrength = current.close >= current.open ? bodyRatio : -bodyRatio;

    return {
      isDoji,
      isHammer,
      isShootingStar,
      isEngulfing,
      isPiercing,
      isDarkCloud,
      isMorningStar,
      isEveningStar,
      bodyRatio,
      upperShadowRatio,
      lowerShadowRatio,
      candleStrength
    };
  }

  calculatePriceTrajectory(data: OHLCV[]): PriceTrajectoryFeatures {
    if (data.length < 10) {
      return getEmptyPriceTrajectory();
    }

    const prices = data.map(d => d.close);
    const currentPrice = prices[prices.length - 1];

    const zigzag = calculateZigZag(prices, 0.05);
    const zigzagTrend = zigzag.trend;
    const zigzagStrength = zigzag.strength;
    const zigzagReversalProb = zigzag.reversalProb;

    const trendConsistency = calculateTrendConsistency(prices);
    const trendAcceleration = calculateTrendAcceleration(prices);

    const supportResistance = calculateSupportResistance(data);
    const supportResistanceLevel = supportResistance.level;
    const distanceToSupport = ((currentPrice - supportResistance.support) / currentPrice) * 100;
    const distanceToResistance = ((supportResistance.resistance - currentPrice) / currentPrice) * 100;

    const isConsolidation = detectConsolidation(prices);
    const breakoutPotential = calculateBreakoutPotential(data);

    return {
      zigzagTrend,
      zigzagStrength,
      zigzagReversalProb,
      trendConsistency,
      trendAcceleration,
      supportResistanceLevel,
      distanceToSupport,
      distanceToResistance,
      isConsolidation,
      breakoutPotential
    };
  }

  calculateVolumeProfile(data: OHLCV[]): VolumeProfileFeatures {
    if (data.length < 5) {
      return getEmptyVolumeProfile();
    }

    const volumes = data.map(d => d.volume);
    const prices = data.map(d => d.close);

    const segmentSize = Math.floor(data.length / 3);
    const morningData = data.slice(0, segmentSize);
    const afternoonData = data.slice(segmentSize, segmentSize * 2);
    const closingData = data.slice(segmentSize * 2);

    const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
    const morningVolume = morningData.reduce((sum, d) => sum + d.volume, 0);
    const afternoonVolume = afternoonData.reduce((sum, d) => sum + d.volume, 0);
    const closingVolume = closingData.reduce((sum, d) => sum + d.volume, 0);

    const morningVolumeRatio = totalVolume > 0 ? morningVolume / totalVolume : 0;
    const afternoonVolumeRatio = totalVolume > 0 ? afternoonVolume / totalVolume : 0;
    const closingVolumeRatio = totalVolume > 0 ? closingVolume / totalVolume : 0;

    const volumeTrend = calculateVolumeTrend(volumes);
    const volumeAcceleration = calculateVolumeAcceleration(volumes);
    const volumeSurge = detectVolumeSurge(volumes);

    const priceVolumeCorrelation = calculatePriceVolumeCorrelation(prices, volumes);
    const { volumeAtHighPrice, volumeAtLowPrice } = calculateVolumeAtPriceExtremes(data);

    return {
      morningVolumeRatio,
      afternoonVolumeRatio,
      closingVolumeRatio,
      volumeTrend,
      volumeAcceleration,
      volumeSurge,
      priceVolumeCorrelation,
      volumeAtHighPrice,
      volumeAtLowPrice
    };
  }

  calculateVolatilityRegime(data: OHLCV[]): VolatilityRegimeFeatures {
    if (data.length < 20) {
      return getEmptyVolatilityRegime();
    }

    const prices = data.map(d => d.close);
    const returns = calculateReturns(prices);

    const historicalVolatility = calculateHistoricalVolatility(returns);
    const realizedVolatility = calculateRealizedVolatility(data);
    const volatilitySkew = calculateSkewness(returns);
    const volatilityKurtosis = calculateKurtosis(returns);

    const volatilityRegime = classifyVolatilityRegime(historicalVolatility);
    const regimeChangeProb = calculateRegimeChangeProb(returns);

    const garchVolatility = estimateGarchVolatility(returns);
    const volatilityMomentum = calculateVolatilityMomentum(returns);
    const volatilityClustering = calculateVolatilityClustering(returns);

    return {
      volatilityRegime,
      regimeChangeProb,
      historicalVolatility,
      realizedVolatility,
      volatilitySkew,
      volatilityKurtosis,
      garchVolatility,
      volatilityMomentum,
      volatilityClustering
    };
  }
}

export const enhancedFeatureService = new EnhancedFeatureService();
