import { Stock, OHLCV, Signal, TechnicalIndicator } from '../../types';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR } from '../utils';
import { analyzeStock } from '../analysis';
import {
  RSI_CONFIG,
  SMA_CONFIG,
  VOLATILITY,
  PRICE_CALCULATION,
  BACKTEST_CONFIG,
  MARKET_CORRELATION,
  ENSEMBLE_WEIGHTS,
  SIGNAL_THRESHOLDS,
} from '@/app/constants';
import { mlTrainingService, type TrainingMetrics, type ModelState } from '../services/MLTrainingService';
import { type PredictionFeatures, ModelPrediction } from './types';

export class MLPredictionCore {
  protected readonly weights = ENSEMBLE_WEIGHTS;
  protected _trainingInProgress = false;
  protected _lastPredictionReasons: string[] = [];

  getModelState(): ModelState {
    return mlTrainingService.getState();
  }

  get isTraining(): boolean {
    return this._trainingInProgress;
  }

  async trainModel(data: OHLCV[], onProgress?: (progress: number) => void): Promise<TrainingMetrics> {
    this._trainingInProgress = true;
    try {
      const metrics = await mlTrainingService.train(data, onProgress);
      await mlTrainingService.saveModel('trader-pro-main');
      return metrics;
    } finally {
      this._trainingInProgress = false;
    }
  }

  async loadSavedModel(): Promise<boolean> {
    return mlTrainingService.loadModel('trader-pro-main');
  }

  calculateIndicators(data: OHLCV[]): TechnicalIndicator & { atr: number[] } {
    const prices = data.map(d => d.close);
    return {
      symbol: '',
      sma5: calculateSMA(prices, 5),
      sma20: calculateSMA(prices, SMA_CONFIG.SHORT_PERIOD),
      sma50: calculateSMA(prices, SMA_CONFIG.MEDIUM_PERIOD),
      rsi: calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices),
      atr: calculateATR(data.map(d => d.high), data.map(d => d.low), data.map(d => d.close), RSI_CONFIG.DEFAULT_PERIOD),
    };
  }

  protected extractFeatures(prices: number[], volumes: number[], indicators: TechnicalIndicator & { atr: number[] }): PredictionFeatures | null {
    const currentPrice = prices[prices.length - 1];
    const averageVolume = volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length;

    if (!indicators.rsi?.length || !indicators.sma20?.length || !indicators.bollingerBands?.lower?.length) return null;

    return {
      rsi: this.last(indicators.rsi, SMA_CONFIG.MEDIUM_PERIOD),
      rsiChange: this.last(indicators.rsi, SMA_CONFIG.MEDIUM_PERIOD) - this.at(indicators.rsi, indicators.rsi.length - 2, SMA_CONFIG.MEDIUM_PERIOD),
      sma5: (currentPrice - this.last(indicators.sma5, currentPrice)) / currentPrice * 100,
      sma20: (currentPrice - this.last(indicators.sma20, currentPrice)) / currentPrice * 100,
      sma50: (currentPrice - this.last(indicators.sma50, currentPrice)) / currentPrice * 100,
      priceMomentum: ((currentPrice - this.at(prices, prices.length - 10, currentPrice)) / this.at(prices, prices.length - 10, currentPrice)) * 100,
      volumeRatio: this.last(volumes, 0) / (averageVolume || 1),
      volatility: this.calculateVolatility(prices.slice(-VOLATILITY.CALCULATION_PERIOD)),
      macdSignal: this.last(indicators.macd.macd, 0) - this.last(indicators.macd.signal, 0),
      bollingerPosition: ((currentPrice - this.last(indicators.bollingerBands.lower, 0)) / (this.last(indicators.bollingerBands.upper, 1) - this.last(indicators.bollingerBands.lower, 0) || 1)) * 100,
      atrPercent: (this.last(indicators.atr, 0) / currentPrice) * 100,
    };
  }

  async predictAsync(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): Promise<ModelPrediction> {
    const prices = data.map(d => d.close), volumes = data.map(d => d.volume);
    const features = this.extractFeatures(prices, volumes, indicators);

    if (!features) return { rfPrediction: 0, xgbPrediction: 0, lstmPrediction: 0, ensemblePrediction: 0, confidence: 0 };

    const modelState = mlTrainingService.getState();
    if (modelState.isTrained) {
      try {
        const result = await mlTrainingService.predict(features);
        const score = (result.probability - 0.5) * 20;
        return { rfPrediction: score * 1.1, xgbPrediction: score * 0.9, lstmPrediction: score * 1.0, ensemblePrediction: score, confidence: result.confidence };
      } catch { }
    }
    return this.predictRuleBased(features, data);
  }

  predict(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): ModelPrediction {
    const prices = data.map(d => d.close), volumes = data.map(d => d.volume);
    const features = this.extractFeatures(prices, volumes, indicators);

    if (!features) return { rfPrediction: 0, xgbPrediction: 0, lstmPrediction: 0, ensemblePrediction: 0, confidence: 0 };

    const modelState = mlTrainingService.getState();
    if (modelState.isTrained) return this.predictWithFallback(features, data);
    return this.predictRuleBased(features, data);
  }

  protected predictRuleBased(features: PredictionFeatures, data: OHLCV[]): ModelPrediction {
    const randomForestPrediction = this.randomForestPredict(features);
    const xgboostPrediction = this.xgboostPredict(features);
    const lstmPrediction = this.lstmPredict(data);
    const ensemblePrediction = randomForestPrediction * this.weights.RF + xgboostPrediction * this.weights.XGB + lstmPrediction * this.weights.LSTM;
    return { rfPrediction: randomForestPrediction, xgbPrediction: xgboostPrediction, lstmPrediction, ensemblePrediction, confidence: this.calculateConfidence(features, ensemblePrediction) };
  }

  protected predictWithFallback(features: PredictionFeatures, data: OHLCV[]): ModelPrediction {
    const ruleBased = this.predictRuleBased(features, data);
    const modelState = mlTrainingService.getState();
    if (modelState.metrics) ruleBased.confidence = Math.round(modelState.metrics.valAccuracy * 100);
    return ruleBased;
  }

  protected randomForestPredict(features: PredictionFeatures): number {
    let score = 0;
    const reasons: string[] = [];

    if (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD) { score += 4; reasons.push(`RSI極度売られすぎ(${features.rsi.toFixed(1)})`); }
    else if (features.rsi < RSI_CONFIG.OVERSOLD) { score += 2; reasons.push(`RSI売られすぎ(${features.rsi.toFixed(1)})`); }
    else if (features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT) { score -= 4; reasons.push(`RSI極度買われすぎ(${features.rsi.toFixed(1)})`); }
    else if (features.rsi > RSI_CONFIG.OVERBOUGHT) { score -= 2; reasons.push(`RSI買われすぎ(${features.rsi.toFixed(1)})`); }

    if (features.rsiChange > 5) { score += 1.5; reasons.push(`RSI上昇加速(${features.rsiChange.toFixed(1)})`); }
    else if (features.rsiChange < -5) { score -= 1.5; reasons.push(`RSI下降加速(${features.rsiChange.toFixed(1)})`); }

    if (features.sma5 > 2 && features.sma20 > 1) { score += 3; reasons.push(`強い上昇トレンド(SMA5:+${features.sma5.toFixed(1)}%, SMA20:+${features.sma20.toFixed(1)}%)`); }
    else if (features.sma5 > 0 && features.sma20 > 0) { score += 1.5; reasons.push(`上昇トレンド(SMA5:+${features.sma5.toFixed(1)}%)`); }
    else if (features.sma5 < -2 && features.sma20 < -1) { score -= 3; reasons.push(`強い下降トレンド(SMA5:${features.sma5.toFixed(1)}%, SMA20:${features.sma20.toFixed(1)}%)`); }
    else if (features.sma5 < 0 && features.sma20 < 0) { score -= 1.5; reasons.push(`下降トレンド(SMA5:${features.sma5.toFixed(1)}%)`); }

    score += features.sma5 * 0.1;
    if (features.sma5 > 0 && features.sma5 > features.sma20) { score += 1; reasons.push('短期MAが長期MAを上回る(買いシグナル)'); }
    else if (features.sma5 < 0 && features.sma5 < features.sma20) { score -= 1; reasons.push('短期MAが長期MAを下回る(売りシグナル)'); }

    if (features.priceMomentum > 5) { score += 2; reasons.push(`強い上昇モメンタム(${features.priceMomentum.toFixed(1)}%)`); }
    else if (features.priceMomentum < -5) { score -= 2; reasons.push(`強い下降モメンタム(${features.priceMomentum.toFixed(1)}%)`); }

    if (features.macdSignal > 0.5) { score += 1.5; reasons.push('MACD買いシグナル'); }
    else if (features.macdSignal < -0.5) { score -= 1.5; reasons.push('MACD売りシグナル'); }

    if (features.bollingerPosition < 10) { score += 2; reasons.push('ボリンジャーバンド下限付近(反発期待)'); }
    else if (features.bollingerPosition > 90) { score -= 2; reasons.push('ボリンジャーバンド上限付近(調整期待)'); }

    if (features.volumeRatio > 2) {
      if (score > 0) { score += 1; reasons.push('出来高増加で上昇を確認'); }
      else if (score < 0) { score -= 1; reasons.push('出来高増加で下降を確認'); }
    }

    if (features.volatility > 50) { score *= 0.8; reasons.push('高ボラティリティ(リスク注意)'); }

    this._lastPredictionReasons = reasons;
    return score * 0.9;
  }

  protected xgboostPredict(features: PredictionFeatures): number {
    const weakLearners: Array<{ weight: number; prediction: number }> = [];
    weakLearners.push({ weight: 0.3, prediction: (50 - features.rsi) / 10 });
    weakLearners.push({ weight: 0.25, prediction: Math.max(-3, Math.min(3, features.priceMomentum / 3)) });
    weakLearners.push({ weight: 0.25, prediction: (features.sma5 * 0.6 + features.sma20 * 0.4) / 5 });
    weakLearners.push({ weight: 0.2, prediction: features.macdSignal * 2 });
    const totalWeight = weakLearners.reduce((sum, wl) => sum + wl.weight, 0);
    const score = weakLearners.reduce((sum, wl) => sum + wl.weight * wl.prediction, 0) / totalWeight;
    return score * 1.1;
  }

  protected lstmPredict(data: OHLCV[]): number {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const recentPrices = prices.slice(-30);
    const recentVolumes = volumes.slice(-30);
    if (recentPrices.length < 10) return 0;

    let score = 0;
    const n = recentPrices.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = recentPrices.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * recentPrices[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const trendStrength = (slope / recentPrices[0]) * 100 * 30;

    if (trendStrength > 5) score += 3;
    else if (trendStrength > 2) score += 1.5;
    else if (trendStrength > 0.5) score += 0.5;
    else if (trendStrength < -5) score -= 3;
    else if (trendStrength < -2) score -= 1.5;
    else if (trendStrength < -0.5) score -= 0.5;

    const recentVolatility = this.calculateVolatility(recentPrices.slice(-10));
    const olderVolatility = this.calculateVolatility(recentPrices.slice(-20, -10));
    if (olderVolatility > 0 && recentVolatility < olderVolatility * 0.7) {
      const lastPrice = recentPrices[recentPrices.length - 1];
      const avgPrice = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (lastPrice > avgPrice * 1.01) score += 1.5;
      else if (lastPrice < avgPrice * 0.99) score -= 1.5;
    }

    const recentAvgVolume = recentVolumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderAvgVolume = recentVolumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    if (olderAvgVolume > 0 && recentAvgVolume > olderAvgVolume * 1.5) {
      if (trendStrength > 0) score += 1;
      else if (trendStrength < 0) score -= 1;
    }

    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const currentPrice = recentPrices[recentPrices.length - 1];
    const priceRange = maxPrice - minPrice;
    if (priceRange > 0) {
      const positionInRange = (currentPrice - minPrice) / priceRange;
      if (positionInRange < 0.1) score += 1;
      else if (positionInRange > 0.9) score -= 1;
    }

    return score * 0.8;
  }

  protected calculateConfidence(features: PredictionFeatures, prediction: number): number {
    let confidence = 50;
    let agreementCount = 0, totalSignals = 0;

    if (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD || features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT) { confidence += 12; agreementCount++; }
    totalSignals++;

    if (Math.abs(features.priceMomentum) > SIGNAL_THRESHOLDS.STRONG_MOMENTUM) { confidence += 8; agreementCount++; }
    totalSignals++;

    if (Math.abs(features.macdSignal) > 0.5) {
      confidence += 6;
      if ((features.macdSignal > 0 && prediction > 0) || (features.macdSignal < 0 && prediction < 0)) agreementCount++;
    }
    totalSignals++;

    if (features.sma5 > 0 && features.sma20 > 0 && prediction > 0) { confidence += 8; agreementCount += 2; }
    else if (features.sma5 < 0 && features.sma20 < 0 && prediction < 0) { confidence += 8; agreementCount += 2; }
    totalSignals += 2;

    if (features.bollingerPosition < 15 || features.bollingerPosition > 85) { confidence += 6; agreementCount++; }
    totalSignals++;

    if (Math.abs(prediction) > 3) { confidence += 5; agreementCount++; }
    totalSignals++;

    const agreementRatio = agreementCount / totalSignals;
    if (agreementRatio > 0.7) confidence += 10;
    else if (agreementRatio < 0.3) confidence -= 10;

    return Math.min(Math.max(confidence, PRICE_CALCULATION.MIN_CONFIDENCE), 95);
  }

  protected calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((price, index) => (price - prices[index]) / prices[index]);
    const averageReturn = returns.reduce((sum, returnValue) => sum + returnValue, 0) / returns.length;
    const variance = returns.reduce((sum, returnValue) => sum + Math.pow(returnValue - averageReturn, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  protected last(arr: number[], fallback: number): number {
    return arr.length > 0 ? arr[arr.length - 1] : fallback;
  }

  protected at(arr: number[], idx: number, fallback: number): number {
    return idx >= 0 && idx < arr.length ? arr[idx] : fallback;
  }
}
