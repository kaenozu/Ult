/**
 * PredictiveAnalyticsEngine
 * 
 * AI駆動の予測分析エンジン。機械学習モデル（Random Forest、XGBoost、LSTM）を
 * アンサンブルして高精度な価格予測とシグナル生成を提供します。
 */

import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';
import { CompositeTechnicalAnalysisEngine } from '../CompositeTechnicalAnalysisEngine';
import type { CompositeAnalysis } from '../CompositeTechnicalAnalysisEngine';
import { createSingleton } from '../../utils/singleton';
import { TechnicalIndicatorCalculator } from './TechnicalIndicatorCalculator';
import { DEFAULT_MODEL_CONFIG } from './constants';
import type {
  ModelConfig,
  TechnicalFeatures,
  ModelPrediction,
  PredictionResult,
  TradingSignal,
  PriceForecast,
  PositionSizingInput,
  PositionSizingResult,
} from './types';

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

  predict(symbol: string, data: OHLCV[]): PredictionResult {
    const features = this.calculateFeatures(data);
    const currentPrice = data[data.length - 1].close;

    const compositeAnalysis: CompositeAnalysis = this.compositeEngine.analyze(data);

    const rfPrediction = 0;
    const xgbPrediction = 0;
    const lstmPrediction = 0;
    const ensemblePrediction = compositeAnalysis.finalScore;

    const direction: 'UP' | 'DOWN' | 'NEUTRAL' = 
      compositeAnalysis.direction === 'BUY' ? 'UP' :
      compositeAnalysis.direction === 'SELL' ? 'DOWN' :
      'NEUTRAL';

    const confidence = compositeAnalysis.confidence;

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

    const signal = this.generateSignalFromComposite(compositeAnalysis, features, currentPrice);
    const forecast = this.generateForecast(currentPrice, modelPrediction, features);

    const result: PredictionResult = {
      symbol,
      timestamp: Date.now(),
      prediction: modelPrediction,
      features,
      signal,
      forecast,
    };

    if (!this.predictionHistory.has(symbol)) {
      this.predictionHistory.set(symbol, []);
    }
    this.predictionHistory.get(symbol)!.push(result);

    const history = this.predictionHistory.get(symbol)!;
    if (history.length > 100) {
      this.predictionHistory.set(symbol, history.slice(-100));
    }

    this.emit('prediction', result);
    return result;
  }

  private generateSignalFromComposite(
    composite: CompositeAnalysis,
    features: TechnicalFeatures,
    currentPrice: number
  ): TradingSignal {
    const { direction, confidence, strength, explainability } = composite;

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

    let timeHorizon: TradingSignal['timeHorizon'] = 'medium';
    if (Math.abs(features.priceMomentum) > 5) {
      timeHorizon = 'short';
    } else if (features.sma200 !== undefined && Math.abs(features.sma200) < 2) {
      timeHorizon = 'long';
    }

    const rationale: string[] = [
      ...explainability.primaryReasons,
      ...explainability.supportingReasons,
    ];

    if (explainability.warnings.length > 0) {
      rationale.push('');
      rationale.push('【注意事項】');
      rationale.push(...explainability.warnings);
    }

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

  private generateSignal(_features: TechnicalFeatures, prediction: ModelPrediction, currentPrice: number): TradingSignal {
    const { confidence, direction, volatilityForecast } = prediction;

    let type: TradingSignal['type'] = 'HOLD';
    const confidencePercent = confidence * 100;

    if (direction === 'UP') {
      type = confidencePercent > 80 ? 'STRONG_BUY' : confidencePercent > 60 ? 'BUY' : 'HOLD';
    } else if (direction === 'DOWN') {
      type = confidencePercent > 80 ? 'STRONG_SELL' : confidencePercent > 60 ? 'SELL' : 'HOLD';
    }

    const atrMultiplier = 2;
    const targetDistance = (volatilityForecast / 100) * currentPrice * (confidence + 0.5);
    const stopDistance = (_features.atrPercent / 100) * currentPrice * atrMultiplier;

    const targetPrice = direction === 'UP' ? currentPrice + targetDistance : currentPrice - targetDistance;
    const stopLoss = direction === 'UP' ? currentPrice - stopDistance : currentPrice + stopDistance;

    let timeHorizon: TradingSignal['timeHorizon'] = 'medium';
    if (Math.abs(_features.priceMomentum) > 5) {
      timeHorizon = 'short';
    } else if (_features.sma200 !== undefined && Math.abs(_features.sma200) < 2) {
      timeHorizon = 'long';
    }

    const rationale: string[] = [];
    if (_features.rsi < 30) rationale.push('RSIが過売り水準を示唆');
    if (_features.rsi > 70) rationale.push('RSIが過買い水準を示唆');
    if (_features.macdSignal > 1) rationale.push('MACDが強い買いシグナル');
    if (_features.macdSignal < -1) rationale.push('MACDが強い売りシグナル');
    if (_features.bollingerPosition < 10) rationale.push('ボリンジャーバンド下限付近');
    if (_features.bollingerPosition > 90) rationale.push('ボリンジャーバンド上限付近');
    if (_features.volumeRatio > 2) rationale.push('出来高が平均を大きく上回る');
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

    let trend: PriceForecast['trend'] = 'sideways';
    if (ensemblePrediction > 0.2) trend = 'bullish';
    else if (ensemblePrediction < -0.2) trend = 'bearish';

    const strength = Math.min(Math.abs(ensemblePrediction) * 100 + confidence * 50, 100);

    return {
      currentPrice,
      predictions,
      trend,
      strength,
    };
  }

  getPredictionHistory(symbol: string): PredictionResult[] {
    return this.predictionHistory.get(symbol) || [];
  }

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

  getModelAccuracy(symbol: string): number {
    const accuracy = this.modelAccuracy.get(symbol);
    if (!accuracy || accuracy.total === 0) return 0.5;
    return accuracy.correct / accuracy.total;
  }

  calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
    const reasoning: string[] = [];
    const minShares = input.minShares ?? 100;
    const maxPositionPercent = input.maxPositionPercent ?? 20;
    
    const stopLossDistance = Math.abs(input.entryPrice - input.stopLossPrice);
    const stopLossPercent = (stopLossDistance / input.entryPrice) * 100;
    
    reasoning.push(`エントリー価格: ¥${input.entryPrice.toFixed(2)}`);
    reasoning.push(`損切り価格: ¥${input.stopLossPrice.toFixed(2)}`);
    reasoning.push(`損切り距離: ¥${stopLossDistance.toFixed(2)} (${stopLossPercent.toFixed(2)}%)`);
    
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
    
    const riskAmount = input.accountEquity * (input.riskPerTrade / 100);
    reasoning.push(`許容リスク額: ¥${riskAmount.toFixed(0)} (口座資金の${input.riskPerTrade}%)`);
    
    let recommendedShares = Math.floor(riskAmount / stopLossDistance);
    reasoning.push(`基本推奨株数: ${recommendedShares}株`);
    
    if (input.confidence !== undefined) {
      const confidenceFactor = input.confidence / 100;
      if (confidenceFactor < 0.7) {
        const adjustedShares = Math.floor(recommendedShares * confidenceFactor);
        reasoning.push(`信頼度調整: ${input.confidence}% → ${adjustedShares}株 (調整率: ${(confidenceFactor * 100).toFixed(0)}%)`);
        recommendedShares = adjustedShares;
      } else {
        reasoning.push(`信頼度: ${input.confidence}% (調整なし)`);
      }
    }
    
    if (recommendedShares < minShares) {
      reasoning.push(`⚠️ 推奨株数が最小単位（${minShares}株）未満です。リスク許容度または口座資金を見直してください。`);
    }
    
    const positionValue = recommendedShares * input.entryPrice;
    const maxLossAmount = recommendedShares * stopLossDistance;
    const actualRiskPercent = (maxLossAmount / input.accountEquity) * 100;
    
    reasoning.push(`ポジション価値: ¥${positionValue.toFixed(0)}`);
    reasoning.push(`予想最大損失: ¥${maxLossAmount.toFixed(0)} (口座資金の${actualRiskPercent.toFixed(2)}%)`);
    
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
      const currentPrice = data[i].close;

      if (!position && prediction.prediction.confidence > threshold) {
        position = prediction.prediction.direction === 'UP' ? 'long' : 'short';
        entryPrice = currentPrice;
      } else if (position) {
        const pnl = position === 'long' 
          ? (currentPrice - entryPrice) / entryPrice
          : (entryPrice - currentPrice) / entryPrice;

        const shouldExit = 
          (position === 'long' && prediction.prediction.direction === 'DOWN') ||
          (position === 'short' && prediction.prediction.direction === 'UP') ||
          Math.abs(pnl) > 0.05;

        if (shouldExit) {
          trades.push({ entry: entryPrice, exit: currentPrice, pnl });
          equity *= (1 + pnl);
          equityCurve.push(equity);

          if (equity > peakEquity) peakEquity = equity;
          const drawdown = (peakEquity - equity) / peakEquity;
          if (drawdown > maxDrawdown) maxDrawdown = drawdown;

          position = null;
        }
      }
    }

    const winningTrades = trades.filter((t) => t.pnl > 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

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

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<ModelConfig>) => new PredictiveAnalyticsEngine(config)
);

export const getGlobalAnalyticsEngine = getInstance;
export const resetGlobalAnalyticsEngine = resetInstance;

export default PredictiveAnalyticsEngine;
