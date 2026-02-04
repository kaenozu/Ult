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
} from '@/app/lib/constants';

/**
 * 機械学習予測に使用する特徴量
 * @property rsi - RSI値（相対力指数）
 * @property rsiChange - RSI変化量
 * @property sma5 - 5日移動平均からの乖離率（%）
 * @property sma20 - 20日移動平均からの乖離率（%）
 * @property sma50 - 50日移動平均からの乖離率（%）
 * @property priceMomentum - 価格モメンタム（%）
 * @property volumeRatio - 出来高比率
 * @property volatility - ボラティリティ
 * @property macdSignal - MACDシグナル
 * @property bollingerPosition - ボリンジャーバンド内の位置（%）
 * @property atrPercent - ATR比率（%）
 */
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

/**
 * 機械学習モデル予測結果
 * @property rfPrediction - Random Forest予測値
 * @property xgbPrediction - XGBoost予測値
 * @property lstmPrediction - LSTM予測値
 * @property ensemblePrediction - アンサンブル予測値
 * @property confidence - 予測信頼度（0-100）
 */
interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}

/**
 * 機械学習予測サービス
 * 
 * Random Forest、XGBoost、LSTMの3つのモデルを組み合わせたアンサンブル予測を提供。
 * 市場相関分析と自己矯正機能を含む高度な株価予測を行う。
 * 
 * @example
 * ```typescript
 * const mlService = new MLPredictionService();
 * const indicators = mlService.calculateIndicators(ohlcvData);
 * const prediction = mlService.predict(stock, ohlcvData, indicators);
 * const signal = mlService.generateSignal(stock, ohlcvData, prediction, indicators);
 * ```
 */
class MLPredictionService {
  private readonly weights = ENSEMBLE_WEIGHTS;

  /**
   * 予測に必要な全てのテクニカル指標を一括計算
   * 
   * @param data - OHLCVデータ配列
   * @returns 計算されたテクニカル指標（SMA、RSI、MACD、ボリンジャーバンド、ATR）
   * 
   * @example
   * ```typescript
   * const indicators = mlService.calculateIndicators(ohlcvData);
   * ```
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
      atr: calculateATR(
        data.map(d => d.high),
        data.map(d => d.low),
        data.map(d => d.close),
        RSI_CONFIG.DEFAULT_PERIOD
      ),
    };
  }

  /**
   * MLモデル群（RF, XGB, LSTM）による統合予測
   * 
   * 3つの異なる機械学習モデルを使用して株価を予測し、
   * アンサンブル手法で統合した予測値と信頼度を返す。
   * 
   * @param stock - 銘柄情報
   * @param data - OHLCVデータ配列
   * @param indicators - 計算済みテクニカル指標
   * @returns 各モデルの予測値とアンサンブル予測結果
   * 
   * @example
   * ```typescript
   * const prediction = mlService.predict(stock, ohlcvData, indicators);
   * ```
   */
  predict(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): ModelPrediction {
    const prices = data.map(d => d.close), volumes = data.map(d => d.volume);
    const currentPrice = prices[prices.length - 1];
    const averageVolume = volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length;

    // フィーチャー抽出
    const features: PredictionFeatures = {
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

    const randomForestPrediction = this.randomForestPredict(features);
    const xgboostPrediction = this.xgboostPredict(features);
    const lstmPrediction = this.lstmPredict(data);

    const ensemblePrediction = randomForestPrediction * this.weights.RF + xgboostPrediction * this.weights.XGB + lstmPrediction * this.weights.LSTM;
    return { rfPrediction: randomForestPrediction, xgbPrediction: xgboostPrediction, lstmPrediction: lstmPrediction, ensemblePrediction, confidence: this.calculateConfidence(features, ensemblePrediction) };
  }

  /**
   * 最終的なシグナルを生成（市場相関と自己矯正を含む）
   * 
   * 機械学習予測、テクニカル指標、市場相関を総合的に分析し、
   * BUY/SELL/HOLDのシグナルを生成する。
   * 
   * @param stock - 銘柄情報
   * @param data - OHLCVデータ配列
   * @param pred - 機械学習予測結果
   * @param indicators - テクニカル指標
   * @param indexData - 市場インデックスデータ（オプション）
   * @returns 売買シグナル、予測価格、信頼度を含むSignalオブジェクト
   * 
   * @example
   * ```typescript
   * const signal = mlService.generateSignal(stock, ohlcvData, prediction, indicators, indexData);
   * if (signal.type === 'BUY' && signal.confidence >= 80) {
   * }
   * ```
   */
  generateSignal(stock: Stock, data: OHLCV[], prediction: ModelPrediction, indicators: TechnicalIndicator & { atr: number[] }, indexData?: OHLCV[]): Signal {
    const currentPrice = data[data.length - 1].close;
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market);

    // 1. 市場相関分析 (Market Sync)
    const { marketInfo, confidenceAdjustment, marketComment } = this.analyzeMarketCorrelation(stock, data, indexData, prediction.ensemblePrediction);

    const finalConfidence = Math.min(Math.max(prediction.confidence + confidenceAdjustment, PRICE_CALCULATION.MIN_CONFIDENCE), PRICE_CALCULATION.MAX_CONFIDENCE);
    const isStrong = finalConfidence >= 80;

    // 2. シグナルタイプの決定
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (prediction.ensemblePrediction > 1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'BUY';
    else if (prediction.ensemblePrediction < -1.0 && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'SELL';

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
      const priceMove = Math.max(currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice + priceMove;
      stopLoss = currentPrice - (priceMove / 2);
    } else if (type === 'SELL') {
      const priceMove = Math.max(currentPrice * (Math.abs(prediction.ensemblePrediction) / 100), atr * TARGET_MULTIPLIER);
      targetPrice = currentPrice - priceMove;
      stopLoss = currentPrice + (priceMove / 2);
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
    let finalPredictedChange = prediction.ensemblePrediction;
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
        confidenceAdjustment: 0,
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

    let confidenceAdjustment = 0;
    let marketComment = `市場全体（${marketInfo.indexSymbol}）との相関は ${correlation.toFixed(2)} です。`;
    if (Math.abs(correlation) > SIGNAL_THRESHOLDS.STRONG_CORRELATION) {
      if (isAligned) {
        confidenceAdjustment = 10;
        marketComment = `市場全体（${marketInfo.indexSymbol}）との強い連動(r=${correlation.toFixed(2)})を伴う確実性の高い動きです。`;
      } else if (isOpposed) {
        confidenceAdjustment = -15;
        marketComment = `市場全体は${indexTrend === 'UP' ? '好調' : '不調'}ですが、本銘柄は逆行(r=${correlation.toFixed(2)})しており警戒が必要です。`;
      }
    }
    return { marketInfo, confidenceAdjustment, marketComment };
  }

  private calculateReturns(data: OHLCV[]): number[] {
    return data.slice(1).map((d, i) => (d.close - data[i].close) / data[i].close);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const muX = x.reduce((a: number, b: number) => a + b, 0) / n, muY = y.reduce((a: number, b: number) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - muX, dy = y[i] - muY;
      num += dx * dy; denX += dx * dx; denY += dy * dy;
    }
    const denominator = Math.sqrt(denX) * Math.sqrt(denY);
    return denominator === 0 ? 0 : num / denominator;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const returns = prices.slice(1).map((price, index) => (price - prices[index]) / prices[index]);
    const averageReturn = returns.reduce((sum, returnValue) => sum + returnValue, 0) / returns.length;
    const variance = returns.reduce((sum, returnValue) => sum + Math.pow(returnValue - averageReturn, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  private randomForestPredict(features: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_STRONG_THRESHOLD = SIGNAL_THRESHOLDS.STRONG_MOMENTUM;
    const MOMENTUM_SCORE = 2;
    const SMA_BULL_SCORE = 2;
    const SMA_BEAR_SCORE = 1;
    const RF_SCALING = 0.8;

    let score = (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD ? RSI_EXTREME_SCORE : features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT ? -RSI_EXTREME_SCORE : 0);
    if (features.sma5 > 0) score += SMA_BULL_SCORE;
    if (features.sma20 > 0) score += SMA_BEAR_SCORE;
    if (features.priceMomentum > MOMENTUM_STRONG_THRESHOLD) score += MOMENTUM_SCORE;
    else if (features.priceMomentum < -MOMENTUM_STRONG_THRESHOLD) score -= MOMENTUM_SCORE;
    return score * RF_SCALING;
  }

  private xgboostPredict(features: PredictionFeatures): number {
    const RSI_EXTREME_SCORE = 3;
    const MOMENTUM_DIVISOR = 3;
    const MOMENTUM_MAX_SCORE = 3;
    const SMA_DIVISOR = 10;
    const SMA5_WEIGHT = 0.5;
    const SMA20_WEIGHT = 0.3;
    const XGB_SCALING = 0.9;

    let score = (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD ? RSI_EXTREME_SCORE : features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT ? -RSI_EXTREME_SCORE : 0);
    score += Math.min(features.priceMomentum / MOMENTUM_DIVISOR, MOMENTUM_MAX_SCORE) + (features.sma5 * SMA5_WEIGHT + features.sma20 * SMA20_WEIGHT) / SMA_DIVISOR;
    return score * XGB_SCALING;
  }

  private lstmPredict(data: OHLCV[]): number {
    const LSTM_SCALING = 0.6;
    const prices = data.map(d => d.close).slice(-VOLATILITY.CALCULATION_PERIOD);
    return (prices[prices.length - 1] - prices[0]) / (prices[0] || 1) * 100 * LSTM_SCALING;
  }

  private calculateConfidence(features: PredictionFeatures, prediction: number): number {
    const RSI_EXTREME_BONUS = 10;
    const MOMENTUM_BONUS = 8;
    const PREDICTION_BONUS = 5;
    const MOMENTUM_THRESHOLD = SIGNAL_THRESHOLDS.STRONG_MOMENTUM;

    const confidence = 50 +
      (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD - 5 || features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT + 5 ? RSI_EXTREME_BONUS : 0) +
      (Math.abs(features.priceMomentum) > MOMENTUM_THRESHOLD ? MOMENTUM_BONUS : 0) +
      (Math.abs(prediction) > MOMENTUM_THRESHOLD ? PREDICTION_BONUS : 0);
    return Math.min(Math.max(confidence, PRICE_CALCULATION.MIN_CONFIDENCE), 95);
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
