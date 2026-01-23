import { Stock, OHLCV, Signal, TechnicalIndicator } from '../types';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR, roundToTickSize } from './utils';

interface PredictionFeatures {
  rsi: number;
  rsiChange: number;
  sma5: number;
  sma20: number;
  sma50: number;
  priceMomentum: number;
  volumeRatio: number;
  volatility: number;
  macdSignal: number;
  bollingerPosition: number;
  atrPercent: number;
}

interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}

class MLPredictionService {
  private weights = {
    rf: 0.35,
    xgb: 0.35,
    lstm: 0.30,
  };

  calculateIndicators(data: OHLCV[]): TechnicalIndicator & { atr: number[] } {
    const prices = data.map(d => d.close);

    const sma5 = calculateSMA(prices, 5);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = prices.length >= 200 ? calculateSMA(prices, 200) : undefined;

    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const atr = calculateATR(data, 14);

    return {
      symbol: '',
      sma5,
      sma20,
      sma50,
      sma200,
      rsi,
      macd,
      bollingerBands: bb,
      atr,
    };
  }

  extractFeatures(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): PredictionFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const currentPrice = prices[prices.length - 1];
    const prevRSI = indicators.rsi[indicators.rsi.length - 2] || 50;

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeRatio = volumes[volumes.length - 1] / avgVolume;

    const volatility = this.calculateVolatility(prices.slice(-20));

    const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
    
    const currentSMA5 = indicators.sma5[indicators.sma5.length - 1] || currentPrice;
    const currentSMA20 = indicators.sma20[indicators.sma20.length - 1] || currentPrice;
    const currentSMA50 = indicators.sma50[indicators.sma50.length - 1] || currentPrice;

    const momentum = ((currentPrice - prices[Math.max(0, prices.length - 10)]) / prices[Math.max(0, prices.length - 10)]) * 100;

    const macdLine = indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
    const signalLine = indicators.macd.signal[indicators.macd.signal.length - 1] || 0;

    const bbUpper = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1] || currentPrice;
    const bbLower = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1] || currentPrice;
    const bollingerPosition = ((currentPrice - bbLower) / (bbUpper - bbLower || 1)) * 100;

    const currentATR = indicators.atr[indicators.atr.length - 1] || 0;
    const atrPercent = (currentATR / currentPrice) * 100;

    return {
      rsi: currentRSI,
      rsiChange: currentRSI - prevRSI, 
      sma5: (currentPrice - currentSMA5) / currentSMA5 * 100,
      sma20: (currentPrice - currentSMA20) / currentSMA20 * 100,
      sma50: (currentPrice - currentSMA50) / currentSMA50 * 100,
      priceMomentum: momentum,
      volumeRatio,
      volatility,
      macdSignal: macdLine - signalLine,
      bollingerPosition,
      atrPercent,
    };
  }

  predict(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): ModelPrediction {
    const features = this.extractFeatures(stock, data, indicators);

    const rfPrediction = this.randomForestPredict(features);
    const xgbPrediction = this.xgboostPredict(features);
    const lstmPrediction = this.lstmPredict(data);

    const ensemblePrediction =
      rfPrediction * this.weights.rf +
      xgbPrediction * this.weights.xgb +
      lstmPrediction * this.weights.lstm;

    const confidence = this.calculateConfidence(features, ensemblePrediction);

    return {
      rfPrediction,
      xgbPrediction,
      lstmPrediction,
      ensemblePrediction,
      confidence,
    };
  }

  generateSignal(stock: Stock, data: OHLCV[], prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }): Signal {
    const currentPrice = data[data.length - 1].close;
    const currentATR = indicators.atr[indicators.atr.length - 1] || currentPrice * 0.02;
    
    // Check for minimum data length
    if (data.length < 20) {
      return {
        symbol: stock.symbol,
        type: 'HOLD',
        confidence: 0,
        targetPrice: currentPrice,
        stopLoss: currentPrice,
        reason: '分析に必要なデータ期間（最低20日間）が不足しています。',
        predictedChange: 0,
        predictionDate: new Date().toISOString().split('T')[0],
      };
    }

    // Adjust multipliers based on confidence (Project Rule: 80%+ is Strong)
    const isStrong = prediction.confidence >= 80;
    const targetMove = currentATR * (isStrong ? 3.5 : 2.0);
    const stopMove = currentATR * (isStrong ? 1.5 : 1.2);

    let signalType: 'BUY' | 'SELL' | 'HOLD';
    let reason: string;
    let targetPrice: number;
    let stopLoss: number;

    const prefix = isStrong ? '【強気】' : '【注視】';

    if (prediction.ensemblePrediction > 1.5 && prediction.confidence >= 60) {
      signalType = 'BUY';
      reason = prefix + this.generateBuyReason(prediction, indicators);
      targetPrice = currentPrice + targetMove;
      stopLoss = currentPrice - stopMove;
    } else if (prediction.ensemblePrediction < -1.5 && prediction.confidence >= 60) {
      signalType = 'SELL';
      reason = prefix + this.generateSellReason(prediction, indicators);
      targetPrice = currentPrice - targetMove;
      stopLoss = currentPrice + stopMove;
    } else {
      signalType = 'HOLD';
      reason = '中立的なシグナル。市場の方向性を様子見することを推奨。';
      targetPrice = currentPrice;
      stopLoss = currentPrice;
    }

    return {
      symbol: stock.symbol,
      type: signalType,
      confidence: Math.round(prediction.confidence),
      targetPrice: roundToTickSize(targetPrice, stock.market),
      stopLoss: roundToTickSize(stopLoss, stock.market),
      reason,
      predictedChange: parseFloat(prediction.ensemblePrediction.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
    };
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  private randomForestPredict(features: PredictionFeatures): number {
    let score = 0;

    if (features.rsi < 30) score += 3;
    else if (features.rsi > 70) score -= 3;
    else if (features.rsi < 45) score += 1;
    else if (features.rsi > 55) score -= 1;

    if (features.sma5 > 0) score += 2;
    if (features.sma20 > 0) score += 1;
    if (features.sma50 > 0) score += 0.5;

    if (features.priceMomentum > 3) score += 2;
    else if (features.priceMomentum < -3) score -= 2;

    if (features.macdSignal > 0) score += 1.5;
    else if (features.macdSignal < 0) score -= 1.5;

    if (features.bollingerPosition < 20) score += 1;
    else if (features.bollingerPosition > 80) score -= 1;

    if (features.volumeRatio > 1.5) score += 0.5;
    else if (features.volumeRatio < 0.5) score -= 0.5;

    return score * 0.8;
  }

  private xgboostPredict(features: PredictionFeatures): number {
    let score = 0;

    const rsiScore = features.rsi < 30 ? 3 : features.rsi < 40 ? 1.5 : features.rsi > 70 ? -3 : features.rsi > 60 ? -1.5 : 0;
    score += rsiScore;

    const momentumScore = Math.min(features.priceMomentum / 3, 3);
    score += momentumScore;

    const trendScore = (features.sma5 * 0.5 + features.sma20 * 0.3 + features.sma50 * 0.2) / 10;
    score += trendScore;

    const macdScore = features.macdSignal > 0 ? 1 : features.macdSignal < 0 ? -1 : 0;
    score += macdScore;

    const bbScore = features.bollingerPosition < 30 ? 1 : features.bollingerPosition > 70 ? -1 : 0;
    score += bbScore;

    return score * 0.9;
  }

  private lstmPredict(data: OHLCV[]): number {
    const prices = data.map(d => d.close);
    const recentPrices = prices.slice(-20);
    const trend = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100;

    const volatility = this.calculateVolatility(recentPrices);

    const shortMA = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const longMA = recentPrices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const maSignal = (shortMA - longMA) / longMA * 100;

    const score = trend * 0.4 + maSignal * 0.4 - volatility * 0.2;

    return score * 0.8;
  }

  private calculateConfidence(features: PredictionFeatures, prediction: number): number {
    let confidence = 50;

    if (features.rsi < 25 || features.rsi > 75) confidence += 10;
    
    if (Math.abs(features.priceMomentum) > 5) confidence += 8;
    if (Math.abs(features.priceMomentum) > 10) confidence += 5;

    if (Math.abs(features.macdSignal) > 2) confidence += 7;

    if (features.bollingerPosition < 15 || features.bollingerPosition > 85) confidence += 5;

    if (features.volumeRatio > 2) confidence += 3;

    if (Math.abs(prediction) > 5) confidence += 5;
    if (Math.abs(prediction) > 10) confidence += 5;

    return Math.min(Math.max(confidence, 30), 95);
  }

  private generateBuyReason(prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }): string {
    const reasons: string[] = [];
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];

    if (currentRSI && currentRSI < 35) {
      reasons.push('RSIが売られ過ぎ領域');
    }

    if (prediction.lstmPrediction > prediction.rfPrediction) {
      reasons.push('短期的な上昇トレンドを検出');
    }

    if (prediction.xgbPrediction > 2) {
      reasons.push('複数のテクニカル指標が買いを示唆');
    }

    if (reasons.length === 0) {
      reasons.push('AIモデルが上昇を予測');
    }

    return reasons.join('、') + '。上昇余地あり。';
  }

  private generateSellReason(prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }): string {
    const reasons: string[] = [];
    const currentRSI = indicators.rsi[indicators.rsi.length - 1];

    if (currentRSI && currentRSI > 65) {
      reasons.push('RSIが買われ過ぎ領域');
    }

    if (prediction.lstmPrediction < prediction.rfPrediction) {
      reasons.push('短期的な下降トレンドを検出');
    }

    if (prediction.xgbPrediction < -2) {
      reasons.push('複数のテクニカル指標が売りを示唆');
    }

    if (reasons.length === 0) {
      reasons.push('AIモデルが下落を予測');
    }

    return reasons.join('、') + '。下落リスクに注意。';
  }
}

export const mlPredictionService = new MLPredictionService();