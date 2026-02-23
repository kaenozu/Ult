import type { EnhancedMarketData, EnhancedAlertConfig } from './types';

export interface AnomalyResult {
  isAnomaly: boolean;
  anomalyType?: string;
  confidence: number;
  description: string;
}

export function detectAnomaly(
  symbol: string,
  data: EnhancedMarketData,
  history: Map<string, Map<string, number[]>> | undefined,
  anomalyThreshold: number
): AnomalyResult {
  if (!history || history.size === 0) {
    return { isAnomaly: false, confidence: 0, description: 'No historical data' };
  }

  const symbolHistory = history.get(symbol);
  if (!symbolHistory) {
    return { isAnomaly: false, confidence: 0, description: 'No historical data for symbol' };
  }

  const priceHistory = symbolHistory.get('price') || [];
  if (priceHistory.length >= 10) {
    const recentPrices = priceHistory.slice(-10);
    const mean = recentPrices.reduce((sum: number, p: number) => sum + p, 0) / recentPrices.length;
    const stdDev = Math.sqrt(
      recentPrices.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length
    );

    if (stdDev > 0) {
      const zScore = Math.abs((data.price - mean) / stdDev);

      if (zScore > anomalyThreshold) {
        return {
          isAnomaly: true,
          anomalyType: 'PRICE_SPIKE',
          confidence: Math.min(zScore / anomalyThreshold, 1),
          description: `Price deviation of ${zScore.toFixed(2)} standard deviations detected`,
        };
      }
    }
  }

  const volumeHistory = symbolHistory.get('volume') || [];
  if (volumeHistory.length >= 10) {
    const avgVolume = volumeHistory.slice(-10).reduce((sum: number, v: number) => sum + v, 0) / 10;
    const volumeRatio = data.volume / avgVolume;

    if (volumeRatio > 5) {
      return {
        isAnomaly: true,
        anomalyType: 'VOLUME_SPIKE',
        confidence: Math.min(volumeRatio / 5, 1),
        description: `Unusual volume: ${volumeRatio.toFixed(1)}x average`,
      };
    }
  }

  return { isAnomaly: false, confidence: 0, description: 'No anomaly detected' };
}
