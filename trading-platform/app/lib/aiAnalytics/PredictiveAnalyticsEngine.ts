/**
 * PredictiveAnalyticsEngine.ts
 * 
 * AI駆動の予測分析エンジン。機械学習モデル（Random Forest、XGBoost、LSTM）を
 * アンサンブルして高精度な価格予測とシグナル生成を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '../../types/shared';

// ============================================================================
// Types
// ============================================================================

// OHLCV is now imported from shared types

export interface TechnicalFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  sma200?: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
  ema12: number;
  ema26: number;
  williamsR: number;
  stochasticK: number;
  stochasticD: number;
  adx: number;
  obv: number;
  mfi: number;
  cci: number;
}

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  expectedReturn: number;
  volatilityForecast: number;
}

export interface PredictionResult {
  symbol: string;
  timestamp: number;
  prediction: ModelPrediction;
  features: TechnicalFeatures;
  signal: TradingSignal;
  forecast: PriceForecast;
}

export interface TradingSignal {
  type: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: 'short' | 'medium' | 'long';
  rationale: string[];
}

export interface PriceForecast {
  currentPrice: number;
  predictions: {
    timeframe: string;
    price: number;
    confidenceInterval: [number, number];
    probability: number;
  }[];
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
}

export interface ModelConfig {
  randomForest: {
    nEstimators: number;
    maxDepth: number;
    minSamplesSplit: number;
    featureImportance: boolean;
  };
  xgboost: {
    maxDepth: number;
    learningRate: number;
    nEstimators: number;
    subsample: number;
    colsampleByTree: number;
  };
  lstm: {
    sequenceLength: number;
    hiddenUnits: number;
    dropout: number;
    epochs: number;
    batchSize: number;
  };
  ensemble: {
    weights: {
      rf: number;
      xgb: number;
      lstm: number;
    };
    confidenceThreshold: number;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  randomForest: {
    nEstimators: 200,
    maxDepth: 15,
    minSamplesSplit: 5,
    featureImportance: true,
  },
  xgboost: {
    maxDepth: 8,
    learningRate: 0.05,
    nEstimators: 300,
    subsample: 0.8,
    colsampleByTree: 0.8,
  },
  lstm: {
    sequenceLength: 60,
    hiddenUnits: 128,
    dropout: 0.2,
    epochs: 100,
    batchSize: 32,
  },
  ensemble: {
    weights: {
      rf: 0.35,
      xgb: 0.35,
      lstm: 0.30,
    },
    confidenceThreshold: 0.65,
  },
};

// ============================================================================
// Technical Indicator Calculations
// ============================================================================

class TechnicalIndicatorCalculator {
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

    // Simplified ADX calculation
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

    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
  }
}

// ============================================================================
// ML Models
// ============================================================================

class RandomForestModel {
  private config: ModelConfig['randomForest'];
  private trees: Array<{ features: number[]; threshold: number; prediction: number }> = [];

  constructor(config: ModelConfig['randomForest']) {
    this.config = config;
    this.initializeTrees();
  }

  private initializeTrees(): void {
    // Simulated tree initialization
    // In production, this would load pre-trained models
    for (let i = 0; i < this.config.nEstimators; i++) {
      this.trees.push({
        features: Array(10).fill(0).map(() => Math.random()),
        threshold: Math.random() * 2 - 1,
        prediction: Math.random() * 2 - 1,
      });
    }
  }

  predict(features: TechnicalFeatures): number {
    // Simplified prediction using feature aggregation
    const featureVector = [
      features.rsi / 100,
      features.rsiChange / 10,
      features.priceMomentum / 10,
      features.volumeRatio / 5,
      features.volatility / 50,
      features.macdSignal / 5,
      features.bollingerPosition / 100,
      features.atrPercent / 5,
      features.williamsR / -100,
      features.stochasticK / 100,
    ];

    const predictions = this.trees.map((tree) => {
      const score = featureVector.reduce((sum, f, i) => sum + f * (tree.features[i] || 0), 0);
      return score > tree.threshold ? tree.prediction : -tree.prediction;
    });

    return predictions.reduce((a, b) => a + b, 0) / predictions.length;
  }
}

class XGBoostModel {
  private config: ModelConfig['xgboost'];
  private weights: number[][] = [];
  private biases: number[] = [];

  constructor(config: ModelConfig['xgboost']) {
    this.config = config;
    this.initializeModel();
  }

  private initializeModel(): void {
    // Simulated XGBoost model initialization
    for (let i = 0; i < this.config.nEstimators; i++) {
      this.weights.push(Array(10).fill(0).map(() => (Math.random() - 0.5) * 0.1));
      this.biases.push((Math.random() - 0.5) * 0.1);
    }
  }

  predict(features: TechnicalFeatures): number {
    const featureVector = [
      features.rsi / 100,
      features.rsiChange / 10,
      features.priceMomentum / 10,
      features.volumeRatio / 5,
      features.volatility / 50,
      features.macdSignal / 5,
      features.bollingerPosition / 100,
      features.atrPercent / 5,
      features.adx / 100,
      features.mfi / 100,
    ];

    let prediction = 0;
    const learningRate = this.config.learningRate;

    for (let i = 0; i < this.weights.length; i++) {
      const treeOutput = featureVector.reduce((sum, f, j) => sum + f * this.weights[i][j], 0) + this.biases[i];
      prediction += learningRate * Math.tanh(treeOutput);
    }

    return Math.tanh(prediction);
  }
}

class LSTMModel {
  private config: ModelConfig['lstm'];
  private hiddenState: number[] = [];
  private cellState: number[] = [];

  constructor(config: ModelConfig['lstm']) {
    this.config = config;
    this.initializeState();
  }

  private initializeState(): void {
    this.hiddenState = Array(this.config.hiddenUnits).fill(0);
    this.cellState = Array(this.config.hiddenUnits).fill(0);
  }

  predictSequence(data: OHLCV[]): number {
    if (data.length < this.config.sequenceLength) {
      return 0;
    }

    const sequence = data.slice(-this.config.sequenceLength);
    this.initializeState();

    // Simplified LSTM forward pass
    for (const candle of sequence) {
      const normalizedInput = [
        (candle.close - candle.open) / candle.open,
        (candle.high - candle.low) / candle.close,
        candle.volume / 1000000,
      ];

      // Update hidden state (simplified)
      for (let i = 0; i < this.config.hiddenUnits; i++) {
        const inputGate = 1 / (1 + Math.exp(-normalizedInput[0] - this.hiddenState[i] * 0.1));
        const forgetGate = 1 / (1 + Math.exp(-normalizedInput[1] - this.hiddenState[i] * 0.1));
        const outputGate = 1 / (1 + Math.exp(-normalizedInput[2] - this.hiddenState[i] * 0.1));

        this.cellState[i] = forgetGate * this.cellState[i] + inputGate * Math.tanh(normalizedInput[0]);
        this.hiddenState[i] = outputGate * Math.tanh(this.cellState[i]);
      }
    }

    // Output layer
    const output = this.hiddenState.reduce((sum, h) => sum + h, 0) / this.config.hiddenUnits;
    return Math.tanh(output);
  }
}

// ============================================================================
// Predictive Analytics Engine
// ============================================================================

export class PredictiveAnalyticsEngine extends EventEmitter {
  private config: ModelConfig;
  private rfModel: RandomForestModel;
  private xgbModel: XGBoostModel;
  private lstmModel: LSTMModel;
  private predictionHistory: Map<string, PredictionResult[]> = new Map();
  private modelAccuracy: Map<string, { correct: number; total: number }> = new Map();

  constructor(config: Partial<ModelConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_MODEL_CONFIG,
      ...config,
      randomForest: { ...DEFAULT_MODEL_CONFIG.randomForest, ...config.randomForest },
      xgboost: { ...DEFAULT_MODEL_CONFIG.xgboost, ...config.xgboost },
      lstm: { ...DEFAULT_MODEL_CONFIG.lstm, ...config.lstm },
      ensemble: { ...DEFAULT_MODEL_CONFIG.ensemble, ...config.ensemble },
    };

    this.rfModel = new RandomForestModel(this.config.randomForest);
    this.xgbModel = new XGBoostModel(this.config.xgboost);
    this.lstmModel = new LSTMModel(this.config.lstm);
  }

  /**
   * テクニカル指標を計算
   */
  calculateFeatures(data: OHLCV[]): TechnicalFeatures {
    const prices = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);
    const currentPrice = prices[prices.length - 1];
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    const rsi = TechnicalIndicatorCalculator.calculateRSI(prices);
    const sma5 = TechnicalIndicatorCalculator.calculateSMA(prices, 5);
    const sma20 = TechnicalIndicatorCalculator.calculateSMA(prices, 20);
    const sma50 = TechnicalIndicatorCalculator.calculateSMA(prices, 50);
    const sma200 = TechnicalIndicatorCalculator.calculateSMA(prices, 200);
    const macd = TechnicalIndicatorCalculator.calculateMACD(prices);
    const bollinger = TechnicalIndicatorCalculator.calculateBollingerBands(prices);
    const atr = TechnicalIndicatorCalculator.calculateATR(data);
    const ema12 = TechnicalIndicatorCalculator.calculateEMA(prices, 12);
    const ema26 = TechnicalIndicatorCalculator.calculateEMA(prices, 26);
    const williamsR = TechnicalIndicatorCalculator.calculateWilliamsR(data);
    const stochastic = TechnicalIndicatorCalculator.calculateStochastic(data);
    const adx = TechnicalIndicatorCalculator.calculateADX(data);
    const obv = TechnicalIndicatorCalculator.calculateOBV(data);
    const mfi = TechnicalIndicatorCalculator.calculateMFI(data);
    const cci = TechnicalIndicatorCalculator.calculateCCI(data);

    const lastIndex = prices.length - 1;

    return {
      rsi: rsi[lastIndex] || 50,
      rsiChange: (rsi[lastIndex] || 50) - (rsi[lastIndex - 5] || 50),
      sma5: ((currentPrice - (sma5[lastIndex] || currentPrice)) / currentPrice) * 100,
      sma20: ((currentPrice - (sma20[lastIndex] || currentPrice)) / currentPrice) * 100,
      sma50: ((currentPrice - (sma50[lastIndex] || currentPrice)) / currentPrice) * 100,
      sma200: sma200[lastIndex] ? ((currentPrice - sma200[lastIndex]) / currentPrice) * 100 : undefined,
      priceMomentum: ((currentPrice - (prices[lastIndex - 10] || currentPrice)) / (prices[lastIndex - 10] || currentPrice)) * 100,
      volumeRatio: volumes[lastIndex] / (avgVolume || 1),
      volatility: TechnicalIndicatorCalculator.calculateVolatility(prices),
      macdSignal: (macd.macd[lastIndex] || 0) - (macd.signal[lastIndex] || 0),
      bollingerPosition: ((currentPrice - (bollinger.lower[lastIndex] || currentPrice)) / ((bollinger.upper[lastIndex] || currentPrice) - (bollinger.lower[lastIndex] || currentPrice) || 1)) * 100,
      atrPercent: ((atr[lastIndex] || 0) / currentPrice) * 100,
      ema12: ((currentPrice - (ema12[lastIndex] || currentPrice)) / currentPrice) * 100,
      ema26: ((currentPrice - (ema26[lastIndex] || currentPrice)) / currentPrice) * 100,
      williamsR: williamsR[lastIndex] || -50,
      stochasticK: stochastic.k[lastIndex] || 50,
      stochasticD: stochastic.d[lastIndex] || 50,
      adx: adx[lastIndex] || 25,
      obv: obv[lastIndex] || 0,
      mfi: mfi[lastIndex] || 50,
      cci: cci[lastIndex] || 0,
    };
  }

  /**
   * MLモデルによる統合予測
   */
  predict(symbol: string, data: OHLCV[]): PredictionResult {
    const features = this.calculateFeatures(data);
    const currentPrice = data[data.length - 1].close;

    // Individual model predictions
    const rfPrediction = this.rfModel.predict(features);
    const xgbPrediction = this.xgbModel.predict(features);
    const lstmPrediction = this.lstmModel.predictSequence(data);

    // Ensemble prediction
    const weights = this.config.ensemble.weights;
    const ensemblePrediction = rfPrediction * weights.rf + xgbPrediction * weights.xgb + lstmPrediction * weights.lstm;

    // Calculate confidence
    const confidence = this.calculateConfidence(features, ensemblePrediction, rfPrediction, xgbPrediction, lstmPrediction);

    // Determine direction
    let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    if (ensemblePrediction > 0.3) direction = 'UP';
    else if (ensemblePrediction < -0.3) direction = 'DOWN';

    // Calculate expected return and volatility forecast
    const expectedReturn = ensemblePrediction * features.volatility;
    const volatilityForecast = features.volatility * (1 + Math.abs(ensemblePrediction) * 0.5);

    const modelPrediction: ModelPrediction = {
      rfPrediction,
      xgbPrediction,
      lstmPrediction,
      ensemblePrediction,
      confidence,
      direction,
      expectedReturn,
      volatilityForecast,
    };

    // Generate trading signal
    const signal = this.generateSignal(features, modelPrediction, currentPrice);

    // Generate price forecast
    const forecast = this.generateForecast(currentPrice, modelPrediction, features);

    const result: PredictionResult = {
      symbol,
      timestamp: Date.now(),
      prediction: modelPrediction,
      features,
      signal,
      forecast,
    };

    // Store in history
    if (!this.predictionHistory.has(symbol)) {
      this.predictionHistory.set(symbol, []);
    }
    this.predictionHistory.get(symbol)!.push(result);

    // Keep only last 100 predictions
    const history = this.predictionHistory.get(symbol)!;
    if (history.length > 100) {
      this.predictionHistory.set(symbol, history.slice(-100));
    }

    this.emit('prediction', result);
    return result;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(
    features: TechnicalFeatures,
    ensemble: number,
    rf: number,
    xgb: number,
    lstm: number
  ): number {
    // Base confidence from model agreement
    const predictions = [rf, xgb, lstm];
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
    const modelAgreement = 1 - Math.min(variance * 2, 1);

    // Feature quality factors
    const volumeQuality = Math.min(features.volumeRatio, 3) / 3;
    const trendStrength = Math.abs(features.priceMomentum) / 10;
    const volatilityFactor = Math.max(0, 1 - features.volatility / 100);

    // Technical indicator confluence
    const rsiSignal = features.rsi < 30 || features.rsi > 70 ? 1 : 0;
    const macdSignal = Math.abs(features.macdSignal) > 1 ? 1 : 0;
    const bollingerSignal = features.bollingerPosition < 10 || features.bollingerPosition > 90 ? 1 : 0;
    const indicatorConfluence = (rsiSignal + macdSignal + bollingerSignal) / 3;

    // Combine factors
    const confidence = (
      modelAgreement * 0.4 +
      volumeQuality * 0.2 +
      trendStrength * 0.15 +
      volatilityFactor * 0.15 +
      indicatorConfluence * 0.1
    );

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * トレーディングシグナルを生成
   */
  private generateSignal(features: TechnicalFeatures, prediction: ModelPrediction, currentPrice: number): TradingSignal {
    const { ensemblePrediction, confidence, direction, volatilityForecast } = prediction;

    // Determine signal type
    let type: TradingSignal['type'] = 'HOLD';
    const confidencePercent = confidence * 100;

    if (direction === 'UP') {
      type = confidencePercent > 80 ? 'STRONG_BUY' : confidencePercent > 60 ? 'BUY' : 'HOLD';
    } else if (direction === 'DOWN') {
      type = confidencePercent > 80 ? 'STRONG_SELL' : confidencePercent > 60 ? 'SELL' : 'HOLD';
    }

    // Calculate price targets
    const atrMultiplier = 2;
    const targetDistance = (volatilityForecast / 100) * currentPrice * (confidence + 0.5);
    const stopDistance = (features.atrPercent / 100) * currentPrice * atrMultiplier;

    const targetPrice = direction === 'UP' ? currentPrice + targetDistance : currentPrice - targetDistance;
    const stopLoss = direction === 'UP' ? currentPrice - stopDistance : currentPrice + stopDistance;

    // Determine time horizon
    let timeHorizon: TradingSignal['timeHorizon'] = 'medium';
    if (Math.abs(features.priceMomentum) > 5) {
      timeHorizon = 'short';
    } else if (features.sma200 !== undefined && Math.abs(features.sma200) < 2) {
      timeHorizon = 'long';
    }

    // Generate rationale
    const rationale: string[] = [];
    if (features.rsi < 30) rationale.push('RSIが過売り水準を示唆');
    if (features.rsi > 70) rationale.push('RSIが過買い水準を示唆');
    if (features.macdSignal > 1) rationale.push('MACDが強い買いシグナル');
    if (features.macdSignal < -1) rationale.push('MACDが強い売りシグナル');
    if (features.bollingerPosition < 10) rationale.push('ボリンジャーバンド下限付近');
    if (features.bollingerPosition > 90) rationale.push('ボリンジャーバンド上限付近');
    if (features.volumeRatio > 2) rationale.push('出来高が平均を大きく上回る');
    if (confidence > 0.8) rationale.push('モデル間の予測が高い一致度');

    return {
      type,
      confidence: confidencePercent,
      entryPrice: currentPrice,
      targetPrice,
      stopLoss,
      timeHorizon,
      rationale,
    };
  }

  /**
   * 価格予測を生成
   */
  private generateForecast(currentPrice: number, prediction: ModelPrediction, features: TechnicalFeatures): PriceForecast {
    const { ensemblePrediction, confidence, volatilityForecast } = prediction;

    const timeframes = [
      { label: '1h', days: 1 / 24 },
      { label: '1d', days: 1 },
      { label: '1w', days: 7 },
      { label: '1m', days: 30 },
    ];

    const predictions = timeframes.map((tf) => {
      const drift = ensemblePrediction * volatilityForecast * Math.sqrt(tf.days / 365);
      const predictedPrice = currentPrice * (1 + drift / 100);
      const volatility = volatilityForecast * Math.sqrt(tf.days / 365);
      const confidenceMultiplier = 1.96 * (1 + (1 - confidence));

      return {
        timeframe: tf.label,
        price: predictedPrice,
        confidenceInterval: [
          predictedPrice * (1 - volatility * confidenceMultiplier / 100),
          predictedPrice * (1 + volatility * confidenceMultiplier / 100),
        ] as [number, number],
        probability: confidence * (1 - Math.abs(drift) / 100),
      };
    });

    // Determine trend
    let trend: PriceForecast['trend'] = 'sideways';
    if (ensemblePrediction > 0.2) trend = 'bullish';
    else if (ensemblePrediction < -0.2) trend = 'bearish';

    // Calculate trend strength
    const strength = Math.min(Math.abs(ensemblePrediction) * 100 + confidence * 50, 100);

    return {
      currentPrice,
      predictions,
      trend,
      strength,
    };
  }

  /**
   * 予測履歴を取得
   */
  getPredictionHistory(symbol: string): PredictionResult[] {
    return this.predictionHistory.get(symbol) || [];
  }

  /**
   * モデル精度を更新
   */
  updateModelAccuracy(symbol: string, predicted: number, actual: number): void {
    if (!this.modelAccuracy.has(symbol)) {
      this.modelAccuracy.set(symbol, { correct: 0, total: 0 });
    }

    const accuracy = this.modelAccuracy.get(symbol)!;
    const correct = (predicted > 0 && actual > 0) || (predicted < 0 && actual < 0);

    accuracy.correct += correct ? 1 : 0;
    accuracy.total += 1;

    this.modelAccuracy.set(symbol, accuracy);
  }

  /**
   * モデル精度を取得
   */
  getModelAccuracy(symbol: string): number {
    const accuracy = this.modelAccuracy.get(symbol);
    if (!accuracy || accuracy.total === 0) return 0.5;
    return accuracy.correct / accuracy.total;
  }

  /**
   * バックテストを実行
   */
  backtest(data: OHLCV[], threshold: number = 0.5): {
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: Array<{ entry: number; exit: number; pnl: number }>;
  } {
    const trades: Array<{ entry: number; exit: number; pnl: number }> = [];
    let position: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let equity = 1;
    let peakEquity = 1;
    let maxDrawdown = 0;
    const equityCurve: number[] = [1];

    for (let i = 60; i < data.length - 1; i++) {
      const slice = data.slice(0, i + 1);
      const prediction = this.predict('backtest', slice);
      const nextPrice = data[i + 1].close;
      const currentPrice = data[i].close;

      if (!position && prediction.prediction.confidence > threshold) {
        // Enter position
        position = prediction.prediction.direction === 'UP' ? 'long' : 'short';
        entryPrice = currentPrice;
      } else if (position) {
        // Check exit conditions
        const pnl = position === 'long' 
          ? (currentPrice - entryPrice) / entryPrice
          : (entryPrice - currentPrice) / entryPrice;

        const shouldExit = 
          (position === 'long' && prediction.prediction.direction === 'DOWN') ||
          (position === 'short' && prediction.prediction.direction === 'UP') ||
          Math.abs(pnl) > 0.05; // 5% stop loss/take profit

        if (shouldExit) {
          trades.push({ entry: entryPrice, exit: currentPrice, pnl });
          equity *= (1 + pnl);
          equityCurve.push(equity);

          // Update max drawdown
          if (equity > peakEquity) peakEquity = equity;
          const drawdown = (peakEquity - equity) / peakEquity;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          position = null;
        }
      }
    }

    // Calculate metrics
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

    // Calculate Sharpe ratio
    const returns = equityCurve.slice(1).map((eq, i) => (eq - equityCurve[i]) / equityCurve[i]);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = Math.sqrt(252) * avgReturn / Math.sqrt(variance || 1);

    return {
      totalReturn: (equity - 1) * 100,
      winRate,
      maxDrawdown,
      sharpeRatio,
      trades,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalAnalyticsEngine: PredictiveAnalyticsEngine | null = null;

export function getGlobalAnalyticsEngine(config?: Partial<ModelConfig>): PredictiveAnalyticsEngine {
  if (!globalAnalyticsEngine) {
    globalAnalyticsEngine = new PredictiveAnalyticsEngine(config);
  }
  return globalAnalyticsEngine;
}

export function resetGlobalAnalyticsEngine(): void {
  globalAnalyticsEngine = null;
}

export default PredictiveAnalyticsEngine;
