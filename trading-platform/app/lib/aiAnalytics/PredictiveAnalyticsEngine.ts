/**
 * PredictiveAnalyticsEngine.ts
 * 
 * AI駆動の予測分析エンジン。機械学習モデル（Random Forest、XGBoost、LSTM）を
 * アンサンブルして高精度な価格予測とシグナル生成を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '../../types/shared';
import { CompositeTechnicalAnalysisEngine } from './CompositeTechnicalAnalysisEngine';
import type { CompositeAnalysis } from './CompositeTechnicalAnalysisEngine';

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

export interface PositionSizingInput {
  accountEquity: number;        // 口座資金
  riskPerTrade: number;          // 許容リスク率 (%)
  entryPrice: number;            // エントリー価格
  stopLossPrice: number;         // 損切り価格
  confidence?: number;           // シグナル信頼度 (0-100)
  minShares?: number;            // 最小購入株数 (デフォルト: 100)
  maxPositionPercent?: number;   // 最大ポジション比率 (デフォルト: 20%)
}

export interface PositionSizingResult {
  recommendedShares: number;     // 推奨購入株数
  maxLossAmount: number;         // 予想最大損失額
  riskAmount: number;            // リスク金額
  positionValue: number;         // ポジション価値
  riskPercent: number;           // 実際のリスク率
  stopLossDistance: number;      // 損切り距離
  stopLossPercent: number;       // 損切りパーセンテージ
  reasoning: string[];           // 計算根拠
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
// Predictive Analytics Engine
// ============================================================================

/**
 * PredictiveAnalyticsEngine - 複合テクニカル分析エンジンを使用した予測分析
 * 
 * 旧バージョンのランダム要素や固定重みを持つシミュレーションMLモデルを廃止し、
 * 論理的で解釈可能なテクニカル分析ベースの予測に置き換えました。
 * 
 * 【変更点】
 * - RandomForestModel, XGBoostModel, LSTMModelクラスを削除
 * - CompositeTechnicalAnalysisEngineを使用
 * - 説明可能性の向上（Explainable AI）
 * - 実戦で使える根拠のあるシグナル生成
 */
export class PredictiveAnalyticsEngine extends EventEmitter {
  private config: ModelConfig;
  private compositeEngine: CompositeTechnicalAnalysisEngine;
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

    this.compositeEngine = new CompositeTechnicalAnalysisEngine();
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
   * 複合テクニカル分析による予測
   * 
   * 旧版のランダムMLモデルの代わりに、CompositeTechnicalAnalysisEngineを使用。
   * 論理的で解釈可能な分析結果を返します。
   */
  predict(symbol: string, data: OHLCV[]): PredictionResult {
    const features = this.calculateFeatures(data);
    const currentPrice = data[data.length - 1].close;

    // 複合テクニカル分析を実行
    const compositeAnalysis: CompositeAnalysis = this.compositeEngine.analyze(data);

    // CompositeAnalysisから ModelPrediction を生成
    // 互換性のため、個別モデル予測フィールドは0に設定（使用しない）
    const rfPrediction = 0; // Legacy field - not used
    const xgbPrediction = 0; // Legacy field - not used
    const lstmPrediction = 0; // Legacy field - not used
    const ensemblePrediction = compositeAnalysis.finalScore; // -1 to 1

    // 方向を変換 ('BUY' -> 'UP', 'SELL' -> 'DOWN')
    const direction: 'UP' | 'DOWN' | 'NEUTRAL' = 
      compositeAnalysis.direction === 'BUY' ? 'UP' :
      compositeAnalysis.direction === 'SELL' ? 'DOWN' :
      'NEUTRAL';

    // 信頼度 (0-1)
    const confidence = compositeAnalysis.confidence;

    // 期待リターンとボラティリティ予測
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

    // トレーディングシグナルを生成（複合分析の説明文を使用）
    const signal = this.generateSignalFromComposite(compositeAnalysis, features, currentPrice);

    // 価格予測を生成
    const forecast = this.generateForecast(currentPrice, modelPrediction, features);

    const result: PredictionResult = {
      symbol,
      timestamp: Date.now(),
      prediction: modelPrediction,
      features,
      signal,
      forecast,
    };

    // 履歴に保存
    if (!this.predictionHistory.has(symbol)) {
      this.predictionHistory.set(symbol, []);
    }
    this.predictionHistory.get(symbol)!.push(result);

    // 最新100件のみ保持
    const history = this.predictionHistory.get(symbol)!;
    if (history.length > 100) {
      this.predictionHistory.set(symbol, history.slice(-100));
    }

    this.emit('prediction', result);
    return result;
  }

  /**
   * 複合分析からトレーディングシグナルを生成
   * 説明可能性を重視し、なぜそのシグナルなのかを明確に示す
   */
  private generateSignalFromComposite(
    composite: CompositeAnalysis,
    features: TechnicalFeatures,
    currentPrice: number
  ): TradingSignal {
    const { direction, confidence, strength, explainability } = composite;

    // シグナルタイプを決定
    let type: TradingSignal['type'] = 'HOLD';
    const confidencePercent = confidence * 100;

    if (direction === 'BUY') {
      if (strength === 'STRONG') {
        type = 'STRONG_BUY';
      } else if (strength === 'MODERATE' || confidencePercent > 60) {
        type = 'BUY';
      } else {
        type = 'HOLD';
      }
    } else if (direction === 'SELL') {
      if (strength === 'STRONG') {
        type = 'STRONG_SELL';
      } else if (strength === 'MODERATE' || confidencePercent > 60) {
        type = 'SELL';
      } else {
        type = 'HOLD';
      }
    }

    // 価格ターゲットを計算
    const atrMultiplier = 2;
    const volatilityPercent = features.volatility;
    const targetDistance = (volatilityPercent / 100) * currentPrice * (confidence + 0.5);
    const stopDistance = (features.atrPercent / 100) * currentPrice * atrMultiplier;

    const targetPrice = direction === 'BUY'
      ? currentPrice + targetDistance
      : direction === 'SELL'
      ? currentPrice - targetDistance
      : currentPrice;

    const stopLoss = direction === 'BUY'
      ? currentPrice - stopDistance
      : direction === 'SELL'
      ? currentPrice + stopDistance
      : currentPrice;

    // タイムホライズンを決定
    let timeHorizon: TradingSignal['timeHorizon'] = 'medium';
    if (Math.abs(features.priceMomentum) > 5) {
      timeHorizon = 'short';
    } else if (features.sma200 !== undefined && Math.abs(features.sma200) < 2) {
      timeHorizon = 'long';
    }

    // 説明可能な理由を生成（Explainable AI）
    const rationale: string[] = [
      ...explainability.primaryReasons,
      ...explainability.supportingReasons,
    ];

    // 警告があれば追加
    if (explainability.warnings.length > 0) {
      rationale.push('');
      rationale.push('【注意事項】');
      rationale.push(...explainability.warnings);
    }

    // コンセンサスシグナル情報を追加
    rationale.push('');
    rationale.push(`コンセンサスシグナル: ${composite.consensus.type} (確信度: ${composite.consensus.confidence}%)`);

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
   * トレーディングシグナルを生成（レガシーメソッド - 互換性のため残す）
   * @deprecated Use generateSignalFromComposite instead
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
   * ポジションサイジング計算
   * 
   * 口座資金とリスク許容度に基づいて、適切なポジションサイズを計算します。
   * 資金管理の基本原則に従い、1取引あたりのリスクを口座資金の一定割合に抑えます。
   * 
   * @param input - ポジションサイジング入力パラメータ
   * @returns ポジションサイジング結果（推奨株数、最大損失額など）
   * 
   * @example
   * ```typescript
   * const sizing = engine.calculatePositionSize({
   *   accountEquity: 1000000,     // 100万円の口座資金
   *   riskPerTrade: 2,             // 2%のリスク許容
   *   entryPrice: 1500,            // 1500円でエントリー
   *   stopLossPrice: 1450,         // 1450円で損切り
   *   confidence: 75               // 75%の信頼度
   * });
   * // => { recommendedShares: 400, maxLossAmount: 20000, ... }
   * ```
   */
  calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
    const reasoning: string[] = [];
    const minShares = input.minShares ?? 100;
    const maxPositionPercent = input.maxPositionPercent ?? 20;
    
    // 1. 損切り距離を計算
    const stopLossDistance = Math.abs(input.entryPrice - input.stopLossPrice);
    const stopLossPercent = (stopLossDistance / input.entryPrice) * 100;
    
    reasoning.push(`エントリー価格: ¥${input.entryPrice.toFixed(2)}`);
    reasoning.push(`損切り価格: ¥${input.stopLossPrice.toFixed(2)}`);
    reasoning.push(`損切り距離: ¥${stopLossDistance.toFixed(2)} (${stopLossPercent.toFixed(2)}%)`);
    
    // 2. 損切り距離がゼロの場合のエラーハンドリング
    if (stopLossDistance === 0) {
      reasoning.push(`⚠️ 損切り距離がゼロです。適切な損切り価格を設定してください。`);
      return {
        recommendedShares: 0,
        maxLossAmount: 0,
        riskAmount: 0,
        positionValue: 0,
        riskPercent: 0,
        stopLossDistance: 0,
        stopLossPercent: 0,
        reasoning
      };
    }
    
    // 3. 許容リスク金額を計算
    const riskAmount = input.accountEquity * (input.riskPerTrade / 100);
    reasoning.push(`許容リスク額: ¥${riskAmount.toFixed(0)} (口座資金の${input.riskPerTrade}%)`);
    
    // 4. 基本ポジションサイズを計算
    // 基本公式: ポジションサイズ = リスク金額 / 1株あたりのリスク
    let recommendedShares = Math.floor(riskAmount / stopLossDistance);
    reasoning.push(`基本推奨株数: ${recommendedShares}株`);
    
    // 5. 信頼度による調整（オプション）
    if (input.confidence !== undefined) {
      const confidenceFactor = input.confidence / 100;
      // 信頼度が低い場合は控えめに、高い場合はそのまま
      if (confidenceFactor < 0.7) {
        const adjustedShares = Math.floor(recommendedShares * confidenceFactor);
        reasoning.push(`信頼度調整: ${input.confidence}% → ${adjustedShares}株 (調整率: ${(confidenceFactor * 100).toFixed(0)}%)`);
        recommendedShares = adjustedShares;
      } else {
        reasoning.push(`信頼度: ${input.confidence}% (調整なし)`);
      }
    }
    
    // 6. 最小単位チェック
    if (recommendedShares < minShares) {
      reasoning.push(`⚠️ 推奨株数が最小単位（${minShares}株）未満です。リスク許容度または口座資金を見直してください。`);
    }
    
    // 7. 最終結果を計算
    const positionValue = recommendedShares * input.entryPrice;
    const maxLossAmount = recommendedShares * stopLossDistance;
    const actualRiskPercent = (maxLossAmount / input.accountEquity) * 100;
    
    reasoning.push(`ポジション価値: ¥${positionValue.toFixed(0)}`);
    reasoning.push(`予想最大損失: ¥${maxLossAmount.toFixed(0)} (口座資金の${actualRiskPercent.toFixed(2)}%)`);
    
    // 8. ポートフォリオ集中リスクのチェック
    const positionPercent = (positionValue / input.accountEquity) * 100;
    if (positionPercent > maxPositionPercent) {
      reasoning.push(`⚠️ ポジションが口座資金の${positionPercent.toFixed(1)}%を占めます（推奨: ${maxPositionPercent}%以下）`);
    } else {
      reasoning.push(`✓ ポジション比率: ${positionPercent.toFixed(1)}% (健全)`);
    }
    
    return {
      recommendedShares,
      maxLossAmount,
      riskAmount,
      positionValue,
      riskPercent: actualRiskPercent,
      stopLossDistance,
      stopLossPercent,
      reasoning
    };
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

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<ModelConfig>) => new PredictiveAnalyticsEngine(config)
);

export const getGlobalAnalyticsEngine = getInstance;
export const resetGlobalAnalyticsEngine = resetInstance;

export default PredictiveAnalyticsEngine;
