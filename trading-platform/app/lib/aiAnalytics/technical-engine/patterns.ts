import { OHLCV } from '../../../types/shared';

export function detectRSIDivergence(
  data: OHLCV[],
  rsi: number[]
): { detected: boolean; type: 'bullish' | 'bearish' | 'none'; strength: number } {
  if (data.length < 20) {
    return { detected: false, type: 'none', strength: 0 };
  }

  const lookback = 14;
  const recentPrices = data.slice(-lookback).map(d => d.close);
  const recentRSI = rsi.slice(-lookback);

  const priceHigh = Math.max(...recentPrices);
  const priceLow = Math.min(...recentPrices);
  const priceHighIdx = recentPrices.lastIndexOf(priceHigh);
  const priceLowIdx = recentPrices.lastIndexOf(priceLow);

  const rsiHigh = Math.max(...recentRSI);
  const rsiLow = Math.min(...recentRSI);
  const rsiHighIdx = recentRSI.lastIndexOf(rsiHigh);
  const rsiLowIdx = recentRSI.lastIndexOf(rsiLow);

  if (priceLowIdx > lookback / 2 && rsiHighIdx > lookback / 2) {
    const priceTrend = (recentPrices[priceLowIdx] - recentPrices[0]) / recentPrices[0];
    const rsiTrend = (recentRSI[rsiHighIdx] - recentRSI[0]) / 100;
    
    if (priceTrend < -0.02 && rsiTrend > 0.05) {
      const strength = Math.min(Math.abs(priceTrend) + rsiTrend, 1);
      return { detected: true, type: 'bullish', strength };
    }
  }

  if (priceHighIdx > lookback / 2 && rsiLowIdx > lookback / 2) {
    const priceTrend = (recentPrices[priceHighIdx] - recentPrices[0]) / recentPrices[0];
    const rsiTrend = (recentRSI[rsiLowIdx] - recentRSI[0]) / 100;
    
    if (priceTrend > 0.02 && rsiTrend < -0.05) {
      const strength = Math.min(Math.abs(priceTrend) + Math.abs(rsiTrend), 1);
      return { detected: true, type: 'bearish', strength };
    }
  }

  return { detected: false, type: 'none', strength: 0 };
}

export function detectCrossover(
  fast: number[],
  slow: number[]
): { detected: boolean; type: 'golden' | 'dead' | 'none'; strength: number } {
  if (fast.length < 3 || slow.length < 3) {
    return { detected: false, type: 'none', strength: 0 };
  }

  const currentFast = fast[fast.length - 1];
  const prevFast = fast[fast.length - 2];
  const currentSlow = slow[slow.length - 1];
  const prevSlow = slow[slow.length - 2];

  if (prevFast < prevSlow && currentFast > currentSlow) {
    const strength = Math.min(
      Math.abs(currentFast - currentSlow) / currentSlow,
      1
    );
    return { detected: true, type: 'golden', strength };
  }

  if (prevFast > prevSlow && currentFast < currentSlow) {
    const strength = Math.min(
      Math.abs(currentFast - currentSlow) / currentSlow,
      1
    );
    return { detected: true, type: 'dead', strength };
  }

  return { detected: false, type: 'none', strength: 0 };
}

export function detectMACDCross(
  macdLine: number[],
  signalLine: number[]
): { detected: boolean; type: 'bullish' | 'bearish' | 'none'; strength: number } {
  if (macdLine.length < 2 || signalLine.length < 2) {
    return { detected: false, type: 'none', strength: 0 };
  }

  const currentMACD = macdLine[macdLine.length - 1];
  const prevMACD = macdLine[macdLine.length - 2];
  const currentSignal = signalLine[signalLine.length - 1];
  const prevSignal = signalLine[signalLine.length - 2];

  if (prevMACD < prevSignal && currentMACD > currentSignal) {
    const strength = Math.min(
      Math.abs(currentMACD - currentSignal) * 20,
      1
    );
    return { detected: true, type: 'bullish', strength };
  }

  if (prevMACD > prevSignal && currentMACD < currentSignal) {
    const strength = Math.min(
      Math.abs(currentMACD - currentSignal) * 20,
      1
    );
    return { detected: true, type: 'bearish', strength };
  }

  return { detected: false, type: 'none', strength: 0 };
}
