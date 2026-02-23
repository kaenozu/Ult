import { OHLCV } from '@/app/types';
import {
  AllFeatures,
  MacroEconomicFeatures,
  SentimentFeatures,
} from './types';
import {
  validateOHLCVData,
  validateMacroFeatures,
  validateSentimentFeatures,
} from './validation';
import { calculateTechnicalFeatures } from './technical-indicators';
import { calculateTimeSeriesFeatures } from './time-series-features';
import {
  getDefaultMacroFeatures,
  getDefaultSentimentFeatures,
  assessDataQuality,
  countFeatures,
} from './utils';

export class FeatureEngineering {
  private memoCache: Map<string, { timestamp: number; features: AllFeatures }> = new Map();
  private readonly CACHE_TTL = 60000;

  clearCache(): void {
    this.memoCache.clear();
  }

  calculateAllFeatures(
    data: OHLCV[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures,
    symbol?: string
  ): AllFeatures {
    if (symbol && this.memoCache.has(symbol)) {
      const cached = this.memoCache.get(symbol)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.features;
      }
    }

    validateOHLCVData(data);

    if (macroData) {
      validateMacroFeatures(macroData);
    }

    if (sentimentData) {
      validateSentimentFeatures(sentimentData);
    }

    const technical = calculateTechnicalFeatures(data);
    const timeSeries = calculateTimeSeriesFeatures(data);

    const macro = macroData || getDefaultMacroFeatures();
    const sentiment = sentimentData || getDefaultSentimentFeatures();

    const dataQuality = assessDataQuality(data);
    const featureCount = countFeatures(technical, macro, sentiment, timeSeries);

    const result: AllFeatures = {
      technical,
      macro,
      sentiment,
      timeSeries,
      featureCount,
      lastUpdate: new Date().toISOString(),
      dataQuality,
    };

    if (symbol) {
      this.memoCache.set(symbol, { timestamp: Date.now(), features: result });
    }

    return result;
  }

  extractFeatures(data: OHLCV[], windowSize: number): AllFeatures {
    return this.calculateAllFeatures(data);
  }

  normalizeFeatures(features: AllFeatures): { normalized: AllFeatures; stats: { means: Record<string, number>; stds: Record<string, number> } } {
    return {
      normalized: features,
      stats: {
        means: {},
        stds: {},
      },
    };
  }
}

export const featureEngineering = new FeatureEngineering();
