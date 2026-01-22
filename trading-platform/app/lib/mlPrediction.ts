import { Stock, OHLCV, Signal, TechnicalIndicator } from '../types';

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

  calculateIndicators(data: OHLCV[]): TechnicalIndicator {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const sma5 = this.calculateSMA(prices, 5);
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    const sma200 = prices.length >= 200 ? this.calculateSMA(prices, 200) : undefined;

    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const bb = this.calculateBollingerBands(prices);

    return {
      symbol: '',
      sma5,
      sma20,
      sma50,
      sma200,
      rsi,
      macd,
      bollingerBands: bb,
    };
  }

  extractFeatures(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator): PredictionFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeRatio = volumes[volumes.length - 1] / avgVolume;

    const volatility = this.calculateVolatility(prices.slice(-20));

    const currentRSI = indicators.rsi[indicators.rsi.length - 1] || 50;
    const prevRSI = indicators.rsi[indicators.rsi.length - 2] || 50;

    const currentSMA5 = indicators.sma5[indicators.sma5.length - 1] || currentPrice;
    const currentSMA20 = indicators.sma20[indicators.sma20.length - 1] || currentPrice;
    const currentSMA50 = indicators.sma50[indicators.sma50.length - 1] || currentPrice;

    const momentum = ((currentPrice - prices[Math.max(0, prices.length - 10)]) / prices[Math.max(0, prices.length - 10)]) * 100;

    const macdLine = indicators.macd.macd[indicators.macd.macd.length - 1] || 0;
    const signalLine = indicators.macd.signal[indicators.macd.signal.length - 1] || 0;

    const bbUpper = indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1] || currentPrice;
    const bbLower = indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1] || currentPrice;
    const bbMiddle = indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1] || currentPrice;
    const bollingerPosition = ((currentPrice - bbLower) / (bbUpper - bbLower || 1)) * 100;

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
    };
  }

  predict(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator): ModelPrediction {
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

  generateSignal(stock: Stock, data: OHLCV[], prediction: ModelPrediction): Signal {
    const currentPrice = data[data.length - 1].close;
    const targetPrice = currentPrice * (1 + prediction.ensemblePrediction / 100);
    const stopLoss = currentPrice * (1 - Math.abs(prediction.ensemblePrediction) * 0.5 / 100);

    let signalType: 'BUY' | 'SELL' | 'HOLD';
    let reason: string;

    if (prediction.ensemblePrediction > 2 && prediction.confidence > 60) {
      signalType = 'BUY';
      reason = this.generateBuyReason(prediction, data);
    } else if (prediction.ensemblePrediction < -2 && prediction.confidence > 60) {
      signalType = 'SELL';
      reason = this.generateSellReason(prediction, data);
    } else {
      signalType = 'HOLD';
      reason = '中立的なシグナル。市場の方向性を様子見することを推奨。';
    }

    return {
      symbol: stock.symbol,
      type: signalType,
      confidence: Math.round(prediction.confidence),
      targetPrice: parseFloat(targetPrice.toFixed(2)),
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      reason,
      predictedChange: parseFloat(prediction.ensemblePrediction.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
    };
  }

  private calculateSMA(prices: number[], period: number): number[] {
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

  private calculateRSI(prices: number[], period: number): number[] {
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
        const prevRSI = rsi[i - 1];
        const currentGain = gains[i - 1];
        const currentLoss = losses[i - 1];
        const avgGain = (gains.slice(i - period, i).reduce((a, b) => a + b, 0) + currentGain) / period;
        const avgLoss = (losses.slice(i - period, i).reduce((a, b) => a + b, 0) + currentLoss) / period;
        const rs = avgGain / (avgLoss || 0.0001);
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    rsi.unshift(NaN);
    return rsi;
  }

  private calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = this.calculateEMA(prices, 12);
    const slowEMA = this.calculateEMA(prices, 26);

    const macdLine: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
        macdLine.push(NaN);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    const validMacd = macdLine.filter(v => !isNaN(v));
    const signalEMA = this.calculateEMA(validMacd, 9);

    const signal: number[] = [];
    const histogram: number[] = [];
    let signalIndex = 0;

    for (let i = 0; i < prices.length; i++) {
      if (isNaN(macdLine[i])) {
        signal.push(NaN);
        histogram.push(NaN);
      } else {
        const sigValue = signalEMA[signalIndex];
        signal.push(sigValue);
        histogram.push(macdLine[i] - sigValue);
        signalIndex++;
      }
    }

    return { macd: macdLine, signal, histogram };
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
    }
    let initialSMA = sum / period;
    ema.push(initialSMA);

    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(emaValue);
    }

    while (ema.length < prices.length) {
      ema.unshift(NaN);
    }

    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    const middle = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
        const std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
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

    let score = trend * 0.4 + maSignal * 0.4 - volatility * 0.2;

    return score * 0.8;
  }

  private calculateConfidence(features: PredictionFeatures, prediction: number): number {
    let confidence = 50;

    if (features.rsi < 25 || features.rsi > 75) confidence += 10;
    if (Math.abs(features.rsiChange) > 5) confidence += 5;

    if (Math.abs(features.priceMomentum) > 5) confidence += 8;
    if (Math.abs(features.priceMomentum) > 10) confidence += 5;

    if (Math.abs(features.macdSignal) > 2) confidence += 7;

    if (features.bollingerPosition < 15 || features.bollingerPosition > 85) confidence += 5;

    if (features.volumeRatio > 2) confidence += 3;

    if (Math.abs(prediction) > 5) confidence += 5;
    if (Math.abs(prediction) > 10) confidence += 5;

    return Math.min(Math.max(confidence, 30), 95);
  }

  private generateBuyReason(prediction: ModelPrediction, data: OHLCV[]): string {
    const reasons: string[] = [];
    const prices = data.map(d => d.close);
    const currentRSI = this.calculateRSI(prices, 14).pop();

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

  private generateSellReason(prediction: ModelPrediction, data: OHLCV[]): string {
    const reasons: string[] = [];
    const prices = data.map(d => d.close);
    const currentRSI = this.calculateRSI(prices, 14).pop();

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
