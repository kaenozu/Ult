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
  private readonly weights = { rf: 0.35, xgb: 0.35, lstm: 0.30 };

  /**
   * 予測に必要な全てのテクニカル指標を一括計算
   */
  calculateIndicators(data: OHLCV[]): TechnicalIndicator & { atr: number[] } {
    const prices = data.map(d => d.close);
    return {
      symbol: '',
      sma5: calculateSMA(prices, 5),
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      rsi: calculateRSI(prices, 14),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices),
      atr: calculateATR(data, 14),
    };
  }

  /**
   * MLモデル群（RF, XGB, LSTM）による統合予測
   */
  predict(stock: Stock, data: OHLCV[], ind: TechnicalIndicator & { atr: number[] }): ModelPrediction {
    const prices = data.map(d => d.close), volumes = data.map(d => d.volume);
    const currentPrice = prices[prices.length - 1];
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    // フィーチャー抽出
    const features: PredictionFeatures = {
      rsi: this.last(ind.rsi, 50),
      rsiChange: this.last(ind.rsi, 50) - this.at(ind.rsi, ind.rsi.length - 2, 50),
      sma5: (currentPrice - this.last(ind.sma5, currentPrice)) / currentPrice * 100,
      sma20: (currentPrice - this.last(ind.sma20, currentPrice)) / currentPrice * 100,
      sma50: (currentPrice - this.last(ind.sma50, currentPrice)) / currentPrice * 100,
      priceMomentum: ((currentPrice - this.at(prices, prices.length - 10, currentPrice)) / this.at(prices, prices.length - 10, currentPrice)) * 100,
      volumeRatio: this.last(volumes, 0) / (avgVol || 1),
      volatility: this.calculateVolatility(prices.slice(-20)),
      macdSignal: this.last(ind.macd.macd, 0) - this.last(ind.macd.signal, 0),
      bollingerPosition: ((currentPrice - this.last(ind.bollingerBands.lower, 0)) / (this.last(ind.bollingerBands.upper, 1) - this.last(ind.bollingerBands.lower, 0) || 1)) * 100,
      atrPercent: (this.last(ind.atr, 0) / currentPrice) * 100,
    };

    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(data);

    const ensemblePrediction = rf * this.weights.rf + xgb * this.weights.xgb + lstm * this.weights.lstm;
    return { rfPrediction: rf, xgbPrediction: xgb, lstmPrediction: lstm, ensemblePrediction, confidence: this.calculateConfidence(features, ensemblePrediction) };
  }

  /**
   * 最終的なシグナルを生成（市場相関と自己矯正を含む）
   */
  generateSignal(stock: Stock, data: OHLCV[], pred: ModelPrediction, ind: TechnicalIndicator & { atr: number[] }, indexData?: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market);

    // 1. 市場相関分析 (Market Sync)
    const { marketInfo, confidenceAdj, marketComment } = this.analyzeMarketCorrelation(stock, data, indexData, pred.ensemblePrediction);

    const finalConfidence = Math.min(Math.max(pred.confidence + confidenceAdj, 30), 98);
    const isStrong = finalConfidence >= 80;
    
    // 2. シグナルタイプの決定
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (pred.ensemblePrediction > 1.0 && finalConfidence >= 60) type = 'BUY';
    else if (pred.ensemblePrediction < -1.0 && finalConfidence >= 60) type = 'SELL';

    // 3. 自己矯正 (Self-Correction): 誤差係数による補正と、ターゲット価格の再計算
    const errorFactor = baseAnalysis.predictionError || 1.0;
    
    // ML予測に基づいた動的なターゲット価格の算出 (テクニカル分析の結果をML予測で上書きして一貫性を持たせる)
    const atr = baseAnalysis.atr || (currentPrice * 0.02);
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      // 予測騰落率かATRの大きい方を採用
      const move = Math.max(currentPrice * (Math.abs(pred.ensemblePrediction) / 100), atr * 1.5);
      targetPrice = currentPrice + move;
      stopLoss = currentPrice - (move / 2);
    } else if (type === 'SELL') {
      const move = Math.max(currentPrice * (Math.abs(pred.ensemblePrediction) / 100), atr * 1.5);
      targetPrice = currentPrice - move;
      stopLoss = currentPrice + (move / 2);
    } else {
      // HOLDの場合はターゲットを現在値に固定し、不必要な予報線の傾きを排除する
      targetPrice = currentPrice;
      stopLoss = currentPrice;
    }

    let correctionComment = "";
    if (errorFactor > 1.2 && type !== 'HOLD') {
      correctionComment = ` 直近の予測誤差(${errorFactor.toFixed(1)}倍)を考慮しリスク管理を強化。`;
      const drift = Math.abs(currentPrice - stopLoss) * errorFactor;
      stopLoss = type === 'BUY' ? currentPrice - drift : currentPrice + drift;
    }

    const optParamsStr = baseAnalysis.optimizedParams ? `最適化設定(RSI:${baseAnalysis.optimizedParams.rsiPeriod}, SMA:${baseAnalysis.optimizedParams.smaPeriod}) ` : "";
    const reason = `${isStrong ? '【強気】' : '【注視】'}${optParamsStr}${this.generateBaseReason(type)} ${marketComment}${correctionComment}`;

    // 予測騰落率の符号をシグナルタイプと強制的に一致させるガード
    let finalPredictedChange = pred.ensemblePrediction;
    if (type === 'BUY' && finalPredictedChange < 0) finalPredictedChange = Math.abs(finalPredictedChange);
    if (type === 'SELL' && finalPredictedChange > 0) finalPredictedChange = -Math.abs(finalPredictedChange);
    if (type === 'HOLD') finalPredictedChange = 0;

    return {
      symbol: stock.symbol, type,
      confidence: Math.round(finalConfidence),
      accuracy: baseAnalysis.accuracy,
      atr: baseAnalysis.atr,
      targetPrice, stopLoss, reason,
      predictedChange: parseFloat(finalPredictedChange.toFixed(2)),
      predictionDate: new Date().toISOString().split('T')[0],
      marketContext: marketInfo,
      optimizedParams: baseAnalysis.optimizedParams,
      predictionError: errorFactor,
      volumeResistance: baseAnalysis.volumeResistance
    };
  }

  private analyzeMarketCorrelation(stock: Stock, data: OHLCV[], indexData: OHLCV[] | undefined, prediction: number) {
    if (!indexData || indexData.length < 20) return { marketInfo: undefined, confidenceAdj: 0, marketComment: "市場指数との相関は低く、個別要因が支配的です。" };

    const correlation = this.calculateCorrelation(this.calculateReturns(data.slice(-20)), this.calculateReturns(indexData.slice(-20)));
    const indexPrice = this.last(indexData.map(d => d.close), 0);
    const indexSMA20 = calculateSMA(indexData.map(d => d.close), 20).pop() || indexPrice;
    const indexTrend: 'UP' | 'DOWN' | 'NEUTRAL' = indexPrice > indexSMA20 * 1.01 ? 'UP' : indexPrice < indexSMA20 * 0.99 ? 'DOWN' : 'NEUTRAL';

    const marketInfo = { indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ', correlation, indexTrend };
    const isAligned = (indexTrend === 'UP' && prediction > 0) || (indexTrend === 'DOWN' && prediction < 0);
    const isOpposed = (indexTrend === 'DOWN' && prediction > 0) || (indexTrend === 'UP' && prediction < 0);

    let confidenceAdj = 0, marketComment = `市場全体（${marketInfo.indexSymbol}）との相関は ${correlation.toFixed(2)} です。`;
    if (Math.abs(correlation) > 0.4) {
      if (isAligned) { confidenceAdj = 10; marketComment = `市場全体（${marketInfo.indexSymbol}）との強い連動(r=${correlation.toFixed(2)})を伴う確実性の高い動きです。`; }
      else if (isOpposed) { confidenceAdj = -15; marketComment = `市場全体は${indexTrend === 'UP' ? '好調' : '不調'}ですが、本銘柄は逆行(r=${correlation.toFixed(2)})しており警戒が必要です。`; }
    }
    return { marketInfo, confidenceAdj, marketComment };
  }

  private calculateReturns(data: OHLCV[]): number[] {
    return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const muX = x.reduce((a, b) => a + b, 0) / n, muY = y.reduce((a, b) => a + b, 0) / n;
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
    let s = (f.rsi < 30 ? 3 : f.rsi > 70 ? -3 : 0);
    if (f.sma5 > 0) s += 2; if (f.sma20 > 0) s += 1;
    if (f.priceMomentum > 3) s += 2; else if (f.priceMomentum < -3) s -= 2;
    return s * 0.8;
  }

  private xgboostPredict(f: PredictionFeatures): number {
    let s = (f.rsi < 30 ? 3 : f.rsi > 70 ? -3 : 0);
    s += Math.min(f.priceMomentum / 3, 3) + (f.sma5 * 0.5 + f.sma20 * 0.3) / 10;
    return s * 0.9;
  }

  private lstmPredict(data: OHLCV[]): number {
    const prices = data.map(d => d.close).slice(-20);
    return (prices[prices.length - 1] - prices[0]) / (prices[0] || 1) * 100 * 0.6;
  }

  private calculateConfidence(f: PredictionFeatures, p: number): number {
    let c = 50 + (f.rsi < 25 || f.rsi > 75 ? 10 : 0) + (Math.abs(f.priceMomentum) > 5 ? 8 : 0) + (Math.abs(p) > 5 ? 5 : 0);
    return Math.min(Math.max(c, 30), 95);
  }

  private generateBaseReason(type: string): string {
    if (type === 'BUY') return "短期的な上昇トレンドを検出。上昇余地あり。";
    if (type === 'SELL') return "過熱感があり、反落の可能性が高いシグナル。";
    return "中立的なシグナル。市場の方向性を様子見することを推奨。";
  }

  private last(arr: number[], fallback: number): number {
    return arr.length > 0 ? arr[arr.length - 1] : fallback;
  }

  private at(arr: number[], idx: number, fallback: number): number {
    return idx >= 0 && idx < arr.length ? arr[idx] : fallback;
  }
}

export const mlPredictionService = new MLPredictionService();
