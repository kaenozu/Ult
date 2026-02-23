import { OHLCV } from '@/app/types';

export function detectDoji(candle: OHLCV): number {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  return range > 0 && body / range < 0.1 ? 1 : 0;
}

export function detectHammer(candle: OHLCV): number {
  const body = Math.abs(candle.close - candle.open);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const range = candle.high - candle.low;
  
  if (range === 0) return 0;
  
  return lowerShadow >= body * 2 && upperShadow <= body * 0.5 ? 1 : 0;
}

export function detectShootingStar(candle: OHLCV): number {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow = candle.high - Math.max(candle.open, candle.close);
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const range = candle.high - candle.low;
  
  if (range === 0) return 0;
  
  return upperShadow >= body * 2 && lowerShadow <= body * 0.5 ? 1 : 0;
}

export function detectEngulfing(current: OHLCV, previous: OHLCV): number {
  const currentBullish = current.close > current.open;
  const previousBullish = previous.close > previous.open;
  
  if (!previousBullish && currentBullish) {
    if (current.open <= previous.close && current.close >= previous.open) {
      return 1;
    }
  }
  
  if (previousBullish && !currentBullish) {
    if (current.open >= previous.close && current.close <= previous.open) {
      return -1;
    }
  }
  
  return 0;
}

export function detectPiercing(current: OHLCV, previous: OHLCV): number {
  const previousBearish = previous.close < previous.open;
  const currentBullish = current.close > current.open;
  
  if (previousBearish && currentBullish) {
    const midPoint = (previous.open + previous.close) / 2;
    if (current.open < previous.close && current.close > midPoint) {
      return 1;
    }
  }
  
  return 0;
}

export function detectDarkCloud(current: OHLCV, previous: OHLCV): number {
  const previousBullish = previous.close > previous.open;
  const currentBearish = current.close < current.open;
  
  if (previousBullish && currentBearish) {
    const midPoint = (previous.open + previous.close) / 2;
    if (current.open > previous.close && current.close < midPoint) {
      return 1;
    }
  }
  
  return 0;
}

export function detectMorningStar(current: OHLCV, previous: OHLCV, previous2: OHLCV): number {
  const firstBearish = previous2.close < previous2.open;
  const secondSmall = Math.abs(previous.close - previous.open) < Math.abs(previous2.close - previous2.open) * 0.3;
  const thirdBullish = current.close > current.open;
  
  if (firstBearish && secondSmall && thirdBullish) {
    const midPoint = (previous2.open + previous2.close) / 2;
    if (current.close > midPoint) {
      return 1;
    }
  }
  
  return 0;
}

export function detectEveningStar(current: OHLCV, previous: OHLCV, previous2: OHLCV): number {
  const firstBullish = previous2.close > previous2.open;
  const secondSmall = Math.abs(previous.close - previous.open) < Math.abs(previous2.close - previous2.open) * 0.3;
  const thirdBearish = current.close < current.open;
  
  if (firstBullish && secondSmall && thirdBearish) {
    const midPoint = (previous2.open + previous2.close) / 2;
    if (current.close < midPoint) {
      return 1;
    }
  }
  
  return 0;
}
