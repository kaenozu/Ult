import { Stock, OHLCV, Signal, TechnicalIndicator } from '../types';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR } from './utils';
import { analyzeStock } from './analysis';

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
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);
    const atr = calculateATR(data, 14);

    return {
      symbol: '',
      sma5, sma20, sma50,
      rsi, macd,
      bollingerBands: bb,
      atr,
    };
  }

  predict(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): ModelPrediction {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const currentPrice = prices[prices.length - 1];
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    const features: PredictionFeatures = {
      rsi: indicators.rsi[indicators.rsi.length - 1] || 50,
      rsiChange: (indicators.rsi[indicators.rsi.length - 1] || 50) - (indicators.rsi[indicators.rsi.length - 2] || 50),
      sma5: (currentPrice - (indicators.sma5[indicators.sma5.length - 1] || currentPrice)) / currentPrice * 100,
      sma20: (currentPrice - (indicators.sma20[indicators.sma20.length - 1] || currentPrice)) / currentPrice * 100,
      sma50: (currentPrice - (indicators.sma50[indicators.sma50.length - 1] || currentPrice)) / currentPrice * 100,
      priceMomentum: ((currentPrice - prices[Math.max(0, prices.length - 10)]) / prices[Math.max(0, prices.length - 10)]) * 100,
      volumeRatio: volumes[volumes.length - 1] / avgVolume,
      volatility: this.calculateVolatility(prices.slice(-20)),
      macdSignal: (indicators.macd.macd.pop() || 0) - (indicators.macd.signal.pop() || 0),
      bollingerPosition: ((currentPrice - indicators.bollingerBands.lower.pop()!) / (indicators.bollingerBands.upper.pop()! - indicators.bollingerBands.lower.pop()! || 1)) * 100,
      atrPercent: (indicators.atr[indicators.atr.length - 1] / currentPrice) * 100,
    };

    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(data);

    const ensemblePrediction = rf * this.weights.rf + xgb * this.weights.xgb + lstm * this.weights.lstm;
    const confidence = this.calculateConfidence(features, ensemblePrediction);

    return { rfPrediction: rf, xgbPrediction: xgb, lstmPrediction: lstm, ensemblePrediction, confidence };
  }

  generateSignal(stock: Stock, data: OHLCV[], prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }, indexData?: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    
    // 1. パラメータ最適化エンジン (analysis.ts) の結果を取得
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market);

    // 2. 市場相関の分析 (Market Sync)
    let marketInfo: Signal['marketContext'] = undefined;
    let confidenceAdjustment = 0;
    let marketComment = "";

    if (indexData && indexData.length >= 20) {
      const stockReturns = this.calculateReturns(data.slice(-20));
      const indexReturns = this.calculateReturns(indexData.slice(-20));
      const correlation = this.calculateCorrelation(stockReturns, indexReturns);
      
      const indexPrice = indexData[indexData.length - 1].close;
      const indexSMA20 = calculateSMA(indexData.map(d => d.close), 20).pop() || indexPrice;
      const indexTrend: 'UP' | 'DOWN' | 'NEUTRAL' = indexPrice > indexSMA20 * 1.01 ? 'UP' : indexPrice < indexSMA20 * 0.99 ? 'DOWN' : 'NEUTRAL';

      marketInfo = {
        indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ',
        correlation,
        indexTrend
      };

      const isAligned = (indexTrend === 'UP' && prediction.ensemblePrediction > 0) || (indexTrend === 'DOWN' && prediction.ensemblePrediction < 0);
      const isOpposed = (indexTrend === 'DOWN' && prediction.ensemblePrediction > 0) || (indexTrend === 'UP' && prediction.ensemblePrediction < 0);

      if (Math.abs(correlation) > 0.4) {
        if (isAligned) {
          confidenceAdjustment = 10;
          marketComment = `市場全体（${marketInfo.indexSymbol}）との強い連動(r=${correlation.toFixed(2)})を伴う確実性の高い動きです。`;
        } else if (isOpposed) {
          confidenceAdjustment = -15;
          marketComment = `市場全体は${indexTrend === 'UP' ? '好調' : '不調'}ですが、本銘柄は逆行(r=${correlation.toFixed(2)})しており警戒が必要です。`;
        } else {
          marketComment = `市場全体（${marketInfo.indexSymbol}）との相関は ${correlation.toFixed(2)} です。`;
        }
      } else {
        marketComment = `市場指数との相関は低く、個別要因が支配的です。`;
      }
    }

    const finalConfidence = Math.min(Math.max(prediction.confidence + confidenceAdjustment, 30), 98);
    const isStrong = finalConfidence >= 80;
    const prefix = isStrong ? '【強気】' : '【注視】';

    // 3. シグナル合成
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (prediction.ensemblePrediction > 1.5 && finalConfidence >= 60) signalType = 'BUY';
    else if (prediction.ensemblePrediction < -1.5 && finalConfidence >= 60) signalType = 'SELL';

    // 4. 自己矯正 (Self-Correction): 誤差係数によるターゲット補正
    const errorFactor = baseAnalysis.predictionError || 1.0;
    const targetPrice = baseAnalysis.targetPrice;
    let stopLoss = baseAnalysis.stopLoss;

    if (errorFactor > 1.2) {
      marketComment += ` 直近の予測誤差が大きいため、予報円を ${errorFactor.toFixed(1)}倍に広げて警戒を促しています。`;
      // 誤差が大きい時はリスク許容度を下げる
      if (signalType === 'BUY') stopLoss = currentPrice - (Math.abs(currentPrice - stopLoss) * errorFactor);
      else if (signalType === 'SELL') stopLoss = currentPrice + (Math.abs(currentPrice - stopLoss) * errorFactor);
    }

    const optParams = baseAnalysis.optimizedParams ? `最適化設定(RSI:${baseAnalysis.optimizedParams.rsiPeriod}, SMA:${baseAnalysis.optimizedParams.smaPeriod}) ` : "";
    const reason = `${prefix}${optParams}${this.generateBaseReason(signalType, prediction, indicators)} ${marketComment}`;

    return {
      symbol: stock.symbol,
      type: signalType,
      confidence: Math.round(finalConfidence),
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice: targetPrice,
      stopLoss: stopLoss,
      reason,
      predictedChange: parseFloat(prediction.ensemblePrediction.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext: marketInfo,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: errorFactor,
      volumeResistance: baseAnalysis.volumeResistance
    };
  }

  private calculateReturns(data: OHLCV[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    return returns;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const muX = x.reduce((a, b) => a + b, 0) / n;
    const muY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - muX, dy = y[i] - muY;
      num += dx * dy; denX += dx * dx; denY += dy * dy;
    }
    const den = Math.sqrt(denX) * Math.sqrt(denY);
    return den === 0 ? 0 : num / den;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  private randomForestPredict(f: PredictionFeatures): number {
    let s = 0;
    if (f.rsi < 30) s += 3; else if (f.rsi > 70) s -= 3;
    if (f.sma5 > 0) s += 2; if (f.sma20 > 0) s += 1;
    if (f.priceMomentum > 3) s += 2; else if (f.priceMomentum < -3) s -= 2;
    return s * 0.8;
  }

  private xgboostPredict(f: PredictionFeatures): number {
    let s = (f.rsi < 30 ? 3 : f.rsi > 70 ? -3 : 0);
    s += Math.min(f.priceMomentum / 3, 3);
    s += (f.sma5 * 0.5 + f.sma20 * 0.3) / 10;
    return s * 0.9;
  }

  private lstmPredict(data: OHLCV[]): number {
    const prices = data.map(d => d.close).slice(-20);
    const trend = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
    return trend * 0.6;
  }

  private calculateConfidence(f: PredictionFeatures, p: number): number {
    let c = 50;
    if (f.rsi < 25 || f.rsi > 75) c += 10;
    if (Math.abs(f.priceMomentum) > 5) c += 8;
    if (Math.abs(p) > 5) c += 5;
    return Math.min(Math.max(c, 30), 95);
  }

  private generateBaseReason(type: string, _p: ModelPrediction, _ind: TechnicalIndicator): string {
    if (type === 'BUY') return "短期的な上昇トレンドを検出。上昇余地あり。";
    if (type === 'SELL') return "過熱感があり、反落の可能性が高いシグナル。";
    return "中立的なシグナル。市場の方向性を様子見することを推奨。";
  }
}

export const mlPredictionService = new MLPredictionService();