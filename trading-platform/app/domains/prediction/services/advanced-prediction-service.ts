/**
 * Advanced Prediction Service
 * 
 * 高度な機械学習モデルを使用した予測サービス
 */

import { OHLCV, Stock } from '../../../lib/types';
import { 
  AdvancedPrediction, 
  AttentionWeights, 
  MarketContext 
} from '../types';
import { ExtendedTechnicalIndicator } from '../../../lib/types/prediction-types';

export class AdvancedPredictionService {
  private sequenceLength: number = 20;
  private dModel: number = 64;
  private nHeads: number = 8;

  async generateAdvancedPrediction(
    stock: Stock,
    historicalData: OHLCV[],
    indicators: ExtendedTechnicalIndicator,
    marketContext?: MarketContext
  ): Promise<AdvancedPrediction> {
    const sequenceData = this.prepareSequenceData(historicalData, indicators);
    const attentionWeights = this.calculateAttentionWeights(sequenceData, marketContext);
    const pricePrediction = this.calculatePricePrediction(sequenceData, attentionWeights);
    const volatilityPrediction = this.calculateVolatilityPrediction(historicalData);
    const trendStrength = this.calculateTrendStrength(historicalData);
    const marketRegime = this.determineMarketRegime(historicalData, marketContext);
    const confidence = this.calculateConfidence(attentionWeights, historicalData);

    return {
      pricePrediction,
      confidence,
      attentionWeights,
      volatilityPrediction,
      trendStrength,
      marketRegime
    };
  }

  private prepareSequenceData(
    historicalData: OHLCV[],
    indicators: ExtendedTechnicalIndicator
  ): number[][] {
    const sequences: number[][] = [];
    const recentData = historicalData.slice(-this.sequenceLength);

    for (let i = 0; i < recentData.length; i++) {
      const candle = recentData[i];
      sequences.push([
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        i < indicators.sma20.length ? indicators.sma20[i] : 0,
        i < indicators.rsi.length ? indicators.rsi[i] : 50,
        i < indicators.atr.length ? indicators.atr[i] : 0,
      ]);
    }

    return sequences;
  }

  private calculateAttentionWeights(
    sequenceData: number[][],
    marketContext?: MarketContext
  ): AttentionWeights {
    const temporalWeights = sequenceData.map((_, idx) => {
      return 1.0 - (sequenceData.length - 1 - idx) / sequenceData.length;
    });

    const featureWeights = [0.3, 0.2, 0.1, 0.3, 0.1];
    let priceWeight = 0.4;
    let volumeWeight = 0.2;

    if (marketContext) {
      if (marketContext.sentimentScore > 0.7) {
        priceWeight += 0.1;
        volumeWeight -= 0.05;
      } else if (marketContext.sentimentScore < 0.3) {
        priceWeight -= 0.1;
        volumeWeight += 0.05;
      }

      if (marketContext.marketVolatility > 0.02) {
        priceWeight *= 1.2;
      }
    }

    return {
      temporal: temporalWeights,
      feature: featureWeights,
      price: Math.min(priceWeight, 1.0),
      volume: Math.min(volumeWeight, 1.0)
    };
  }

  private calculatePricePrediction(
    sequenceData: number[][],
    attentionWeights: AttentionWeights
  ): number {
    let weightedPriceChange = 0;
    let totalWeight = 0;

    for (let i = 0; i < sequenceData.length - 1; i++) {
      const current = sequenceData[i][3];
      const next = sequenceData[i + 1][3];
      const priceChange = (next - current) / current;
      const weight = attentionWeights.temporal[i] * attentionWeights.price;
      weightedPriceChange += priceChange * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return sequenceData[sequenceData.length - 1][3];
    }

    const avgPriceChange = weightedPriceChange / totalWeight;
    const lastPrice = sequenceData[sequenceData.length - 1][3];
    return lastPrice * (1 + avgPriceChange);
  }

  private calculateVolatilityPrediction(historicalData: OHLCV[]): number {
    const returns: number[] = [];
    for (let i = 1; i < historicalData.length; i++) {
      const ret = (historicalData[i].close - historicalData[i-1].close) / historicalData[i-1].close;
      returns.push(Math.abs(ret));
    }

    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateTrendStrength(historicalData: OHLCV[]): number {
    if (historicalData.length < 20) return 0;

    const closes = historicalData.map(d => d.close);
    const sma20 = this.calculateSMA(closes, 20);

    const recentDeviations: number[] = [];
    for (let i = Math.max(0, sma20.length - 5); i < sma20.length; i++) {
      if (sma20[i] !== undefined && sma20[i] !== 0) {
        const deviation = (closes[i] - sma20[i]) / sma20[i];
        recentDeviations.push(Math.abs(deviation));
      }
    }

    if (recentDeviations.length === 0) return 0;

    const avgDeviation = recentDeviations.reduce((sum, dev) => sum + dev, 0) / recentDeviations.length;
    const lastDeviation = (closes[closes.length - 1] - sma20[sma20.length - 1]) / sma20[sma20.length - 1];
    return lastDeviation >= 0 ? avgDeviation : -avgDeviation;
  }

  private determineMarketRegime(
    historicalData: OHLCV[],
    marketContext?: MarketContext
  ): 'BULL' | 'BEAR' | 'SIDEWAYS' {
    if (historicalData.length < 30) return 'SIDEWAYS';

    const startPrice = historicalData[historicalData.length - 30].close;
    const endPrice = historicalData[historicalData.length - 1].close;
    const change = (endPrice - startPrice) / startPrice;
    const volatility = this.calculateVolatilityPrediction(historicalData);

    if (marketContext) {
      if (marketContext.sentimentScore > 0.7 && change > 0.05) return 'BULL';
      if (marketContext.sentimentScore < 0.3 && change < -0.05) return 'BEAR';
    }

    if (Math.abs(change) > volatility * 2) {
      return change > 0 ? 'BULL' : 'BEAR';
    }

    return 'SIDEWAYS';
  }

  private calculateConfidence(
    attentionWeights: AttentionWeights,
    historicalData: OHLCV[]
  ): number {
    const temporalAttentionConcentration = this.calculateAttentionConcentration(attentionWeights.temporal);
    const dataQualityScore = this.assessDataQuality(historicalData);

    const baseConfidence = 50;
    const attentionBonus = temporalAttentionConcentration * 30;
    const dataQualityBonus = (dataQualityScore - 0.5) * 20;

    const confidence = baseConfidence + attentionBonus + dataQualityBonus;
    return Math.max(0, Math.min(100, confidence));
  }

  private calculateAttentionConcentration(weights: number[]): number {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;

    const normalizedWeights = weights.map(w => w / totalWeight);
    let entropy = 0;

    for (const w of normalizedWeights) {
      if (w > 0) {
        entropy -= w * Math.log2(w);
      }
    }

    const maxEntropy = Math.log2(weights.length);
    return maxEntropy > 0 ? (maxEntropy - entropy) / maxEntropy : 1;
  }

  private assessDataQuality(historicalData: OHLCV[]): number {
    if (historicalData.length === 0) return 0;

    let validDataPoints = 0;
    const totalPoints = historicalData.length;

    for (const candle of historicalData) {
      if (candle.open > 0 && candle.high > 0 && candle.low > 0 && 
          candle.close > 0 && candle.volume >= 0) {
        if (candle.high >= candle.open && candle.high >= candle.close &&
            candle.low <= candle.open && candle.low <= candle.close &&
            Math.abs(candle.high - candle.low) > 0) {
          validDataPoints++;
        }
      }
    }

    return validDataPoints / totalPoints;
  }

  private calculateSMA(values: number[], period: number): (number | undefined)[] {
    const result: (number | undefined)[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(undefined);
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }
}

export const advancedPredictionService = new AdvancedPredictionService();
