/**
 * ml-feature-extractor.ts
 * 
 * 機械学習モデル向けの特徴量抽出と正規化
 */

import { OHLCV } from '@/app/types';
import { MLFeatures } from '../../../ml/types';
import { TechnicalCalculator } from './technical-calculator';
import { TimeSeriesCalculator } from './time-series-calculator';
import { calculateADX } from '../../../utils/technical-analysis';
import { candlestickPatternService } from '../../candlestick-pattern-service';

export class MLFeatureExtractor {
  private technicalCalc = new TechnicalCalculator();
  private timeSeriesCalc = new TimeSeriesCalculator();

  public extract(data: OHLCV[], lookback: number): MLFeatures[] {
    if (data.length <= lookback) return [];

    const features: MLFeatures[] = [];
    const startIndex = Math.max(lookback, 1);

    const calcStd = (values: number[]): number => {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance);
    };

    for (let i = startIndex; i <= data.length; i++) {
      const window = data.slice(i - lookback, i);
      const current = window[window.length - 1];
      const technical = this.technicalCalc.calculate(window);
      const timeSeries = this.timeSeriesCalc.calculate(window);
      const prices = window.map(d => d.close);
      const volumes = window.map(d => d.volume);

      const obv = window.reduce((sum, d, idx) => {
        if (idx === 0) return sum;
        const prev = window[idx - 1].close;
        if (d.close > prev) return sum + d.volume;
        if (d.close < prev) return sum - d.volume;
        return sum;
      }, 0);

      const vwap = (() => {
        const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
        if (totalVolume === 0) return current.close;
        const totalValue = window.reduce((sum, d) => sum + d.close * d.volume, 0);
        return totalValue / totalVolume;
      })();

      const momentum5 = this.technicalCalc.calculateMomentum(prices, 5);
      const supportLevel = Math.min(...prices);
      const resistanceLevel = Math.max(...prices);
      const volumeStd = calcStd(volumes);

      const returns = prices.slice(1).map((price, idx) => (price - prices[idx]) / (prices[idx] || 1));
      const historicalVolatility = calcStd(returns) * Math.sqrt(252) * 100;

      const parkinsonVolatility = (() => {
        if (window.length === 0) return 0;
        const logRatios = window.map(d => Math.log((d.high || 1) / (d.low || 1)));
        const meanSquare = logRatios.reduce((sum, v) => sum + v * v, 0) / logRatios.length;
        return Math.sqrt(meanSquare) * Math.sqrt(252) * 100;
      })();

      const garmanKlassVolatility = (() => {
        if (window.length === 0) return 0;
        const values = window.map(d => {
          const logHL = Math.log((d.high || 1) / (d.low || 1));
          const logCO = Math.log((d.close || 1) / (d.open || 1));
          return 0.5 * logHL * logHL - (2 * Math.log(2) - 1) * logCO * logCO;
        });
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(Math.max(mean, 0)) * Math.sqrt(252) * 100;
      })();

      const adxHistory = calculateADX(window, 14);
      const adx = adxHistory[adxHistory.length - 1] || 20;
      const prevADX = adxHistory[adxHistory.length - 2] || adx;
      const adxTrend = adx - prevADX;

      const candlePatternFeatures = candlestickPatternService.calculatePatternFeatures(window);
      const candlePattern = candlestickPatternService.getPatternSignal(candlePatternFeatures);

      const currentDate = new Date(current.date);
      const weekOfMonth = Math.floor((currentDate.getDate() - 1) / 7) + 1;

      features.push({
        close: current.close, open: current.open, high: current.high, low: current.low,
        rsi: technical.rsi, rsiChange: technical.rsiChange,
        sma5: technical.sma5, sma20: technical.sma20, sma50: technical.sma50, sma200: technical.sma200,
        ema12: technical.ema12, ema26: technical.ema26,
        priceMomentum: technical.momentum10, volumeRatio: technical.volumeRatio, volatility: technical.atrPercent,
        macdSignal: technical.macdSignal, macdHistogram: technical.macdHistogram,
        bollingerPosition: technical.bbPosition, atrPercent: technical.atrPercent,
        stochasticK: technical.stochasticK, stochasticD: technical.stochasticD,
        williamsR: technical.williamsR, adx, cci: technical.cci, roc: technical.rateOfChange12,
        obv, vwap, volumeProfile: [current.volume], priceLevel: current.close,
        momentum5, momentum10: technical.momentum10, momentum20: technical.momentum20,
        historicalVolatility, parkinsonVolatility, garmanKlassVolatility, adxTrend,
        aroonUp: technical.aroonUp, aroonDown: technical.aroonDown,
        volumeSMA: technical.volumeMA5, volumeStd,
        volumeTrend: technical.volumeTrend === 'INCREASING' ? 1 : -1,
        candlePattern, supportLevel, resistanceLevel,
        marketCorrelation: 0, sectorCorrelation: 0,
        dayOfWeek: timeSeries.dayOfWeek, weekOfMonth, monthOfYear: timeSeries.monthOfYear,
        timestamp: data.length > 1 ? (i - 1) / (data.length - 1) : 0,
      });
    }
    return features;
  }

  public normalize(features: MLFeatures[]): { normalized: MLFeatures[]; scalers: Record<string, { min: number; max: number }> } {
    if (features.length === 0) return { normalized: [], scalers: {} };
    const keys = Object.keys(features[0]) as Array<keyof MLFeatures>;
    const scalers: Record<string, { min: number; max: number }> = {};
    const normalized = features.map(f => ({ ...f }));
    for (const key of keys) {
      const values = features.map(f => f[key] as number).filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      scalers[key] = { min, max };
      if (max === min) {
        normalized.forEach(f => (f as any)[key] = 0.5);
      } else {
        normalized.forEach(f => (f as any)[key] = ((f as any)[key] - min) / (max - min));
      }
    }
    return { normalized, scalers };
  }
}
