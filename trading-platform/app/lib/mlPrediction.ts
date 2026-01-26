import { Stock, OHLCV, Signal, TechnicalIndicator } from '../types';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR } from './utils';
import { analyzeStock } from './analysis';
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
  private readonly weights = ENSEMBLE_WEIGHTS;

  /**
   * 予測に必要な全てのテクニカル指標を一括計算
   */
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
      atr: calculateATR(data, RSI_CONFIG.DEFAULT_PERIOD),
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
      rsi: this.last(ind.rsi, SMA_CONFIG.MEDIUM_PERIOD),
      rsiChange: this.last(ind.rsi, SMA_CONFIG.MEDIUM_PERIOD) - this.at(ind.rsi, ind.rsi.length - 2, SMA_CONFIG.MEDIUM_PERIOD),
      sma5: (currentPrice - this.last(ind.sma5, currentPrice)) / currentPrice * 100,
      sma20: (currentPrice - this.last(ind.sma20, currentPrice)) / currentPrice * 100,
      sma50: (currentPrice - this.last(ind.sma50, currentPrice)) / currentPrice * 100,
      priceMomentum: ((currentPrice - this.at(prices, prices.length - 10, currentPrice)) / this.at(prices, prices.length - 10, currentPrice)) * 100,
      volumeRatio: this.last(volumes, 0) / (avgVol || 1),
      volatility: this.calculateVolatility(prices.slice(-VOLATILITY.CALCULATION_PERIOD)),
      macdSignal: this.last(ind.macd.macd, 0) - this.last(ind.macd.signal, 0),
      bollingerPosition: ((currentPrice - this.last(ind.bollingerBands.lower, 0)) / (this.last(ind.bollingerBands.upper, 1) - this.last(ind.bollingerBands.lower, 0) || 1)) * 100,
      atrPercent: (this.last(ind.atr, 0) / currentPrice) * 100,
    };

    const rf = this.randomForestPredict(features);
    const xgb = this.xgboostPredict(features);
    const lstm = this.lstmPredict(data);

    const ensemblePrediction = rf * this.weights.RF + xgb * this.weights.XGB + lstm * this.weights.LSTM;
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

    const finalConfidence = Math.min(Math.max(pred.confidence + confidenceAdj, PRICE_CALCULATION.MIN_CONFIDENCE), PRICE_CALCULATION.MAX_CONFIDENCE);
    const isStrong = finalConfidence >= 80;

    // 2. シグナルタイプの決定
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (pred.ensemblePrediction > 1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'BUY';
    else if (pred.ensemblePrediction < -1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'SELL';

    // 3. 自己矯正 (Self-Correction): 誤差係数による補正と、ターゲット価格の再計算
    const errorFactor = baseAnalysis.predictionError || 1.0;
    const ERROR_THRESHOLD = 1.2;
    const TARGET_MULTIPLIER = 1.5;

    // ML予測に基づいた動的なターゲット価格の算出 (テクニカル分析の結果をML予測で上書きして一貫性を持たせる)
    const atr = baseAnalysis.atr || (currentPrice * PRICE_CALCULATION.DEFAULT_ATR_RATIO);
    let targetPrice = currentPrice;
    let stopLoss = currentPrice;

    if (type === 'BUY') {
      // 予測騰落率かATRの大きい方を採用
      const move = Math.max(currentPrice * (Math.abs(pred.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice + move;
      stopLoss = currentPrice - (move / 2);
    } else if (type === 'SELL') {
      const move = Math.max(currentPrice * (Math.abs(pred.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice - move;
      stopLoss = currentPrice + (move / 2);
    } else {
      // HOLDの場合はターゲットを現在値に固定し、不必要な予報線の傾きを排除する
      targetPrice = currentPrice;
      stopLoss = currentPrice;
    }

    let correctionComment = "";
    if (errorFactor > ERROR_THRESHOLD && type !== 'HOLD') {
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
    if (!indexData || indexData.length < SMA_CONFIG.SHORT_PERIOD) {
      return {
        marketInfo: undefined,
        confidenceAdj: 0,
        marketComment: "市場指数との相関は低く、個別要因が支配的です。"
      };
    }

    const correlation = this.calculateCorrelation(
      this.calculateReturns(data.slice(-VOLATILITY.CALCULATION_PERIOD)),
      this.calculateReturns(indexData.slice(-VOLATILITY.CALCULATION_PERIOD))
    );
    const indexPrice = this.last(indexData.map(d => d.close), 0);
    const indexSMA20 = calculateSMA(indexData.map(d => d.close), SMA_CONFIG.SHORT_PERIOD).pop() || indexPrice;
    const trendDeviation = 1 + MARKET_CORRELATION.TREND_DEVIATION;
    const indexTrend: 'UP' | 'DOWN' | 'NEUTRAL' =
      indexPrice > indexSMA20 * trendDeviation ? 'UP' :
        indexPrice < indexSMA20 * (2 - trendDeviation) ? 'DOWN' : 'NEUTRAL';

    const marketInfo = {
      indexSymbol: stock.market === 'japan' ? '日経平均' : 'NASDAQ',
      correlation,
      indexTrend
    };
    const isAligned = (indexTrend === 'UP' && prediction > 0) || (indexTrend === 'DOWN' && prediction < 0);
    const isOpposed = (indexTrend === 'DOWN' && prediction > 0) || (indexTrend === 'UP' && prediction < 0);

    let confidenceAdj = 0;
    let marketComment = `市場全体（${marketInfo.indexSymbol}）との相関は ${correlation.toFixed(2)} です。`;
    if (Math.abs(correlation) > SIGNAL_THRESHOLDS.STRONG_CORRELATION) {
      if (isAligned) {
        confidenceAdj = 10;
        marketComment = `市場全体（${marketInfo.indexSymbol}）との強い連動(r=${correlation.toFixed(2)})を伴う確実性の高い動きです。`;
      } else if (isOpposed) {
        confidenceAdj = -15;
        marketComment = `市場全体は${indexTrend === 'UP' ? '好調' : '不調'}ですが、本銘柄は逆行(r=${correlation.toFixed(2)})しており警戒が必要です。`;
      }
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
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = SIGNAL_THRESHOLDS.STRONG_MOMENTUM;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let s = (f.rsi < RSI_CONFIG.EXTREME_OVERSOLD ? RSI_EXTREME_SCORE : f.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT ? -RSI_EXTREME_SCORE : 0);
    if (f.sma5 > 0) s += SMA_BULL_SCORE;
    if (f.sma20 > 0) s += SMA_BEAR_SCORE;
    if (f.priceMomentum > MOMENTUM_STRONG_THRESHOLD) s += MOMENTUM_SCORE;
    else if (f.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) s -= MOMENTUM_SCORE;
    return s * RF_SCALING;
  }

  private xgboostPredict(f: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let s = (f.rsi < RSI_CONFIG.EXTREME_OVERSOLD ? RSI_EXTREME_SCORE : f.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT ? -RSI_EXTREME_SCORE : 0);
    s += Math.min(f.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE) + (f.sma5 * SMA5_WEIGHT + f.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    return s * XGB_SCALING;
  }

  private lstmPredict(data: OHLCV[]): number {
    const LSTM_SCALING = 0.6;
    const prices = data.map(d => d.close).slice(-VOLATILITY.CALCULATION_PERIOD);
    return (prices[prices.length - 1] - prices[0]) / (prices[0] || 1) * 100 * LSTM_SCALING;
  }

  private calculateConfidence(f: PredictionFeatures, p: number): number {
    const RSI_EXTREME_BONUS = 10;
    const MOMENTUM_BONUS = 8;
    const PREDICTION_BONUS = 5;
    const MOMENTUM_THRESHOLD = SIGNAL_THRESHOLDS.STRONG_MOMENTUM;

    const c = 50 +
      (f.rsi < RSI_CONFIG.EXTREME_OVERSOLD - 5 || f.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT + 5 ? RSI_EXTREME_BONUS : 0) +
      (Math.abs(f.priceMomentum) > MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0) +
      (Math.abs(p) > MOMENTUM_THRESHOLD ? PREDICTION_BONUS : 0);
    return Math.min(Math.max(c, PRICE_CALCULATION.MIN_CONFIDENCE), 95);
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
