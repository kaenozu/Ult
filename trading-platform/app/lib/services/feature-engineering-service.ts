/**
 * FeatureEngineeringService.ts
 *
 * Unified Feature Engineering Service
 * Consolidates logic from ML, AI Analytics, and Prediction domains.
 */

import { OHLCV } from '@/app/types';
import { MLFeatures } from '../ml/types';
import { PredictionFeatures } from '@/app/domains/prediction/types';
import { 
  TechnicalFeatures, 
  TimeSeriesFeatures, 
  AllFeatures, 
  MacroEconomicFeatures, 
  SentimentFeatures,
  ExtendedTechnicalFeatures,
  MacroIndicators,
  NewsSentimentData,
  FeatureImportance
} from './feature-engineering/feature-types';
import { TechnicalCalculator } from './feature-engineering/calculators/technical-calculator';
import { TimeSeriesCalculator } from './feature-engineering/calculators/time-series-calculator';
import { MLFeatureExtractor } from './feature-engineering/calculators/ml-feature-extractor';
import { calculateRSI, calculateSMA } from '../utils/technical-analysis';
import { RSI_CONFIG } from '@/app/constants';

export type { PredictionFeatures }; // Re-export for compatibility

export class FeatureEngineeringService {
  private technicalCalc = new TechnicalCalculator();
  private timeSeriesCalc = new TimeSeriesCalculator();
  private mlExtractor = new MLFeatureExtractor();

  // --- Core Methods ---

  public calculateAllFeatures(
    data: OHLCV[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): AllFeatures {
    if (data.length < 200) {
      throw new Error('Insufficient data for feature calculation (minimum 200 data points required)');
    }

    const technical = this.technicalCalc.calculate(data);
    const timeSeries = this.timeSeriesCalc.calculate(data);

    const macro = macroData || this.getDefaultMacroFeatures();
    const sentiment = sentimentData || this.getDefaultSentimentFeatures();
    const dataQuality = this.assessDataQuality(data);
    const featureCount = this.countFeatures(technical, macro, sentiment, timeSeries);

    return {
      technical,
      macro,
      sentiment,
      timeSeries,
      featureCount,
      lastUpdate: new Date().toISOString(),
      dataQuality,
    };
  }

  public calculateExtendedFeatures(
    data: OHLCV[],
    currentPrice: number,
    averageVolume: number,
    macroIndicators?: MacroIndicators,
    newsTexts?: string[]
  ): ExtendedTechnicalFeatures {
    if (data.length < 50) {
      throw new Error('Insufficient data for feature calculation (minimum 50 data points required)');
    }

    const technical = this.technicalCalc.calculate(data);
    const timeSeries = this.timeSeriesCalc.calculate(data);

    const volatility = this.calculateVolatility(data.map(d => d.close));
    const momentum = this.technicalCalc.calculateMomentum(data.map(d => d.close), 10);
    const rateOfChange = this.technicalCalc.calculateROC(data.map(d => d.close), 12);

    const prices = data.map(d => d.close);
    const rsiArray = calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD);
    const stochasticRSI = this.calculateStochasticRSI(rsiArray, 14);

    return {
      rsi: technical.rsi,
      rsiChange: technical.rsiChange,
      sma5: technical.sma5,
      sma20: technical.sma20,
      sma50: technical.sma50,
      priceMomentum: technical.momentum10,
      volumeRatio: technical.volumeRatio,
      volatility: volatility,
      macdSignal: technical.macdSignal,
      bollingerPosition: technical.bbPosition,
      atrPercent: technical.atrPercent,
      momentum: momentum,
      rateOfChange: rateOfChange,
      stochasticRSI: stochasticRSI,
      williamsR: technical.williamsR,
      cci: technical.cci,
      atrRatio: technical.atrRatio,
      volumeProfile: 1,
      pricePosition: technical.pricePosition,
      momentumTrend: this.classifyMomentumTrend(momentum, rateOfChange),
      volatilityRegime: this.classifyVolatilityRegime(volatility),
      macroIndicators: macroIndicators,
      sentiment: newsTexts && newsTexts.length > 0 ? this.quantifyTextData(newsTexts) : undefined,
      timeSeriesFeatures: timeSeries,
    };
  }

  public calculateFeatures(data: OHLCV[], indicators?: any): PredictionFeatures {
    if (indicators && (indicators.rsi || indicators.sma5 || indicators.atr)) {
      const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
      const prevPrice = data.length > 1 ? data[data.length - 2].close : currentPrice;
      const momentum = currentPrice > 0 && prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
      
      const lastVal = (arr: number[]) => arr && arr.length > 0 ? arr[arr.length - 1] : 0;
      const prevValue = (arr: number[]) => arr && arr.length > 1 ? arr[arr.length - 2] : lastVal(arr);

      let volumeRatio = indicators.volumeRatio;
      if (volumeRatio === undefined && data.length > 0) {
        const currentVolume = data[data.length - 1].volume;
        const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
        volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;
      }

      let volatility = indicators.volatility;
      if (volatility === undefined && data.length > 0) {
        volatility = this.calculateVolatility(data.map(d => d.close));
      }

      return {
        rsi: indicators.rsi && indicators.rsi.length > 0 ? lastVal(indicators.rsi) : 0,
        rsiChange: indicators.rsi && indicators.rsi.length > 1 ? (lastVal(indicators.rsi) - prevValue(indicators.rsi)) : 0,
        sma5: indicators.sma5 && indicators.sma5.length > 0 && lastVal(indicators.sma5) !== 0 
          ? ((currentPrice - lastVal(indicators.sma5)) / (currentPrice || 1) * 100) : 0,
        sma20: indicators.sma20 && indicators.sma20.length > 0 && lastVal(indicators.sma20) !== 0 
          ? ((currentPrice - lastVal(indicators.sma20)) / (currentPrice || 1) * 100) : 0,
        sma50: indicators.sma50 && indicators.sma50.length > 0 && lastVal(indicators.sma50) !== 0 
          ? ((currentPrice - lastVal(indicators.sma50)) / (currentPrice || 1) * 100) : 0,
        priceMomentum: momentum,
        volumeRatio: volumeRatio || 1,
        volatility: volatility || 0,
        macdSignal: indicators.macd && indicators.macd.macd && indicators.macd.macd.length > 0 
          ? (lastVal(indicators.macd.macd) - lastVal(indicators.macd.signal)) : 0,
        bollingerPosition: indicators.bollinger && indicators.bollinger.upper && indicators.bollinger.upper.length > 0 
          ? ((currentPrice - lastVal(indicators.bollinger.lower)) / (lastVal(indicators.bollinger.upper) - lastVal(indicators.bollinger.lower) || 1) * 100) 
          : 50,
        atrPercent: indicators.atr && indicators.atr.length > 0 ? (lastVal(indicators.atr) / (currentPrice || 1) * 100) : 0,
      };
    }
    return this.calculateBasicFeatures(data);
  }

  public calculateBasicFeatures(data: OHLCV[]): PredictionFeatures {
     const technical = this.technicalCalc.calculate(data);
     const closes = data.map(d => d.close);
     const volatility = this.calculateVolatility(closes);

     const sma5 = this.lastValue(calculateSMA(closes, 5));
     const sma20 = this.lastValue(calculateSMA(closes, 20));
     const sma50 = this.lastValue(calculateSMA(closes, 50));

     return {
       rsi: technical.rsi,
       rsiChange: technical.rsiChange,
       sma5: sma5,
       sma20: sma20,
       sma50: sma50,
       priceMomentum: technical.momentum10,
       volumeRatio: technical.volumeRatio,
       volatility: volatility,
       macdSignal: technical.macdSignal,
       bollingerPosition: technical.bbPosition,
       atrPercent: technical.atrPercent,
     };
  }

  public calculateTechnicalFeatures(data: OHLCV[]): TechnicalFeatures {
    return this.technicalCalc.calculate(data);
  }

  public calculateTimeSeriesFeatures(data: OHLCV[]): TimeSeriesFeatures {
    return this.timeSeriesCalc.calculate(data);
  }

  public extractFeatures(data: OHLCV[], lookback: number): MLFeatures[] {
    return this.mlExtractor.extract(data, lookback);
  }

  public normalizeFeatures(features: MLFeatures[]): { normalized: MLFeatures[]; scalers: Record<string, { min: number; max: number }> } {
    return this.mlExtractor.normalize(features);
  }

  // --- Sentiment & Macro Helpers ---

  private quantifyTextData(newsTexts: string[]): NewsSentimentData {
    if (newsTexts.length === 0) {
      return { positive: 0.5, negative: 0.5, neutral: 1, overall: 0, confidence: 0 };
    }
    const positiveKeywords = ['上昇', '好調', '成長', '利益', '増加', 'bull', 'rally', 'gain', 'profit', 'growth'];
    const negativeKeywords = ['下落', '不調', '減少', '損失', '危機', 'bear', 'decline', 'loss', 'risk', 'crisis'];
    let positiveScore = 0; let negativeScore = 0;
    for (const text of newsTexts) {
      const lowerText = text.toLowerCase();
      positiveKeywords.forEach(k => positiveScore += (lowerText.match(new RegExp(k, 'g')) || []).length);
      negativeKeywords.forEach(k => negativeScore += (lowerText.match(new RegExp(k, 'g')) || []).length);
    }
    const total = positiveScore + negativeScore;
    const pos = total > 0 ? positiveScore / total : 0.5;
    const neg = total > 0 ? negativeScore / total : 0.5;
    return { positive: pos, negative: neg, neutral: Math.max(0, 1 - (pos + neg)), overall: pos - neg, confidence: Math.min(total / (newsTexts.length * 3), 1) };
  }

  public analyzeFeatureImportance(features: ExtendedTechnicalFeatures): FeatureImportance[] {
    const scoreFeature = (val: number, min: number, max: number) => Math.min(Math.max((val - min) / (max - min), 0), 1);
    const importance: FeatureImportance[] = [
      { name: 'sma20', score: scoreFeature(Math.abs(features.sma20), 0, 10), rank: 0, category: 'trend' },
      { name: 'sma50', score: scoreFeature(Math.abs(features.sma50), 0, 15), rank: 0, category: 'trend' },
      { name: 'pricePosition', score: scoreFeature(Math.abs(features.pricePosition - 50), 0, 50), rank: 0, category: 'trend' },
      { name: 'rsi', score: scoreFeature(Math.abs(features.rsi - 50), 0, 50), rank: 0, category: 'momentum' },
      { name: 'momentum', score: scoreFeature(Math.abs(features.momentum), 0, 10), rank: 0, category: 'momentum' },
      { name: 'volatility', score: scoreFeature(features.volatility, 0, 50), rank: 0, category: 'volatility' },
      { name: 'volumeRatio', score: scoreFeature(Math.abs(features.volumeRatio - 1), 0, 2), rank: 0, category: 'volume' },
    ];
    importance.sort((a, b) => b.score - a.score);
    importance.forEach((item, index) => item.rank = index + 1);
    return importance;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  private calculateStochasticRSI(rsiValues: number[], period: number): number {
    if (rsiValues.length < period) return 50;
    const slice = rsiValues.slice(-period).filter(v => !isNaN(v));
    if (slice.length < 2) return 50;
    const minRSI = Math.min(...slice); const maxRSI = Math.max(...slice);
    return maxRSI === minRSI ? 50 : ((rsiValues[rsiValues.length - 1] - minRSI) / (maxRSI - minRSI)) * 100;
  }

  private classifyMomentumTrend(m: number, r: number): any {
    const avg = (m + r) / 2;
    return avg > 5 ? 'STRONG_UP' : avg > 2 ? 'UP' : avg < -5 ? 'STRONG_DOWN' : avg < -2 ? 'DOWN' : 'NEUTRAL';
  }

  private classifyVolatilityRegime(v: number): any {
    return v < 15 ? 'LOW' : v > 30 ? 'HIGH' : 'NORMAL';
  }

  private getDefaultMacroFeatures(): MacroEconomicFeatures {
    return { interestRate: 0, interestRateTrend: 'STABLE', gdpGrowth: 0, gdpTrend: 'STABLE', cpi: 0, cpiTrend: 'STABLE', inflationRate: 0, macroScore: 0 };
  }

  private getDefaultSentimentFeatures(): SentimentFeatures {
    return { newsSentiment: 0, newsVolume: 0, newsTrend: 'STABLE', socialSentiment: 0, socialVolume: 0, socialBuzz: 0, analystRating: 3, ratingChange: 0, sentimentScore: 0 };
  }

  private assessDataQuality(data: OHLCV[]): any {
    return data.length >= 252 ? 'EXCELLENT' : data.length >= 100 ? 'GOOD' : data.length >= 50 ? 'FAIR' : 'POOR';
  }

  private countFeatures(t: any, m: any, s: any, ts: any): number {
    let count = Object.keys(t).length + Object.keys(ts).length;
    if (m) count += Object.keys(m).length;
    if (s) count += Object.keys(s).length;
    return count;
  }

  private lastValue(arr: number[]): number {
    const valid = arr.filter(v => !isNaN(v));
    return valid.length > 0 ? valid[valid.length - 1] : 0;
  }
}

export const featureEngineeringService = new FeatureEngineeringService();
export { FeatureEngineeringService as FeatureCalculationService };
