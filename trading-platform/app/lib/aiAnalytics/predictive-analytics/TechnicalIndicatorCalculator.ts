/**
 * TechnicalIndicatorCalculator
 * 
 * テクニカル指標計算ユーティリティ
 */

import { OHLCV } from '@/app/types';

export class TechnicalIndicatorCalculator {
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    let sum = 0;

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sum += prices[i];
        ema.push(NaN);
      } else if (i === period - 1) {
        sum += prices[i];
        ema.push(sum / period);
      } else {
        const prevEMA = ema[i - 1];
        const emaValue = (prices[i] - prevEMA) * multiplier + prevEMA;
        ema.push(emaValue);
      }
    }
    return ema;
  }

  static calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(NaN);
      } else if (i === period) {
        const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / (avgLoss || 0.0001);
        rsi.push(100 - 100 / (1 + rs));
      } else {
        const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const rs = avgGain / (avgLoss || 0.0001);
        rsi.push(100 - 100 / (1 + rs));
      }
    }
    return rsi;
  }

  static calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    const macdLine = prices.map((_, i) => fastEMA[i] - slowEMA[i]);
    const validMacd = macdLine.filter((v) => !isNaN(v));
    const signalEMA = this.calculateEMA(validMacd, signalPeriod);

    const signal: number[] = [];
    const histogram: number[] = [];
    let signalIndex = 0;

    for (let i = 0; i < macdLine.length; i++) {
      if (isNaN(macdLine[i])) {
        signal.push(NaN);
        histogram.push(NaN);
      } else {
        const sig = signalEMA[signalIndex] || 0;
        signal.push(sig);
        histogram.push(macdLine[i] - sig);
        signalIndex++;
      }
    }

    return { macd: macdLine, signal, histogram };
  }

  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle: sma, lower };
  }

  static calculateATR(data: OHLCV[], period: number = 14): number[] {
    const atr: number[] = [];
    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trueRanges.push(tr);
    }

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        atr.push(NaN);
      } else if (i < period) {
        atr.push(NaN);
      } else if (i === period) {
        const sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      } else {
        const prevATR = atr[i - 1];
        const currentTR = trueRanges[i - 1];
        atr.push((prevATR * (period - 1) + currentTR) / period);
      }
    }

    return atr;
  }

  static calculateWilliamsR(data: OHLCV[], period: number = 14): number[] {
    const williamsR: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        williamsR.push(NaN);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const highestHigh = Math.max(...slice.map((d) => d.high));
        const lowestLow = Math.min(...slice.map((d) => d.low));
        const currentClose = data[i].close;

        const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
        williamsR.push(wr);
      }
    }

    return williamsR;
  }

  static calculateStochastic(data: OHLCV[], kPeriod: number = 14, dPeriod: number = 3): { k: number[]; d: number[] } {
    const kValues: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) {
        kValues.push(NaN);
      } else {
        const slice = data.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...slice.map((d) => d.high));
        const lowestLow = Math.min(...slice.map((d) => d.low));
        const currentClose = data[i].close;

        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(k);
      }
    }

    const dValues = this.calculateSMA(kValues.filter((v) => !isNaN(v)), dPeriod);
    const paddedD: number[] = [];
    let dIndex = 0;

    for (let i = 0; i < kValues.length; i++) {
      if (isNaN(kValues[i])) {
        paddedD.push(NaN);
      } else {
        paddedD.push(dValues[dIndex] ?? NaN);
        dIndex++;
      }
    }

    return { k: kValues, d: paddedD };
  }

  static calculateADX(data: OHLCV[], period: number = 14): number[] {
    const adx: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const trueRange = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      tr.push(trueRange);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        adx.push(NaN);
      } else {
        const avgTR = tr.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgPlusDM = plusDM.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgMinusDM = minusDM.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

        const plusDI = (avgPlusDM / avgTR) * 100;
        const minusDI = (avgMinusDM / avgTR) * 100;
        const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;

        adx.push(dx);
      }
    }

    return adx;
  }

  static calculateOBV(data: OHLCV[]): number[] {
    const obv: number[] = [0];

    for (let i = 1; i < data.length; i++) {
      const prevOBV = obv[i - 1];
      const currentVolume = data[i].volume;

      if (data[i].close > data[i - 1].close) {
        obv.push(prevOBV + currentVolume);
      } else if (data[i].close < data[i - 1].close) {
        obv.push(prevOBV - currentVolume);
      } else {
        obv.push(prevOBV);
      }
    }

    return obv;
  }

  static calculateMFI(data: OHLCV[], period: number = 14): number[] {
    const mfi: number[] = [];
    const typicalPrices: number[] = data.map((d) => (d.high + d.low + d.close) / 3);
    const rawMoney: number[] = typicalPrices.map((tp, i) => tp * data[i].volume);

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        mfi.push(NaN);
      } else {
        let positiveFlow = 0;
        let negativeFlow = 0;

        for (let j = i - period + 1; j <= i; j++) {
          if (typicalPrices[j] > typicalPrices[j - 1]) {
            positiveFlow += rawMoney[j];
          } else if (typicalPrices[j] < typicalPrices[j - 1]) {
            negativeFlow += rawMoney[j];
          }
        }

        const moneyRatio = positiveFlow / (negativeFlow || 1);
        mfi.push(100 - 100 / (1 + moneyRatio));
      }
    }

    return mfi;
  }

  static calculateCCI(data: OHLCV[], period: number = 20): number[] {
    const cci: number[] = [];
    const typicalPrices: number[] = data.map((d) => (d.high + d.low + d.close) / 3);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        cci.push(NaN);
      } else {
        const slice = typicalPrices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b, 0) / period;
        const meanDeviation = slice.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;

        cci.push((typicalPrices[i] - sma) / (0.015 * meanDeviation));
      }
    }

    return cci;
  }

  static calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }
}
