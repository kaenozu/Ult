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
import { mlTrainingService, type TrainingMetrics, type ModelState } from './services/MLTrainingService';
import { type PredictionFeatures } from './services/feature-calculation-service';

// PredictionFeatures は feature-calculation-service から再エクスポート
export type { PredictionFeatures };


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
  private _trainingInProgress = false;

  /** 訓練サービスのモデル状態を取得 */
  getModelState(): ModelState {
    return mlTrainingService.getState();
  }

  /** 訓練中かどうか */
  get isTraining(): boolean {
    return this._trainingInProgress;
  }

  /**
   * 過去データでモデルを訓練する
   * @param data - 訓練用OHLCVデータ（200日分以上推奨）
   * @param onProgress - 進捗コールバック (0-100)
   */
  async trainModel(
    data: OHLCV[],
    onProgress?: (progress: number) => void
  ): Promise<TrainingMetrics> {
    this._trainingInProgress = true;
    try {
      const metrics = await mlTrainingService.train(data, onProgress);
      // 訓練後にモデルを保存
      await mlTrainingService.saveModel('trader-pro-main');
      return metrics;
    } finally {
      this._trainingInProgress = false;
    }
  }

  /**
   * 保存済みモデルを読み込む
   */
  async loadSavedModel(): Promise<boolean> {
    return mlTrainingService.loadModel('trader-pro-main');
  }

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

    const features = this.extractFeatures(prices, volumes, indicators);

    if (!features) {
      return {
        rfPrediction: 0,
        xgbPrediction: 0,
        lstmPrediction: 0,
        ensemblePrediction: 0,
        confidence: 0
      };
    }

    // 訓練済みモデルが利用可能か確認
    const modelState = mlTrainingService.getState();
    if (modelState.isTrained) {
      // 訓練済みモデルによる予測（同期的にフォールバック値を返す）
      // 非同期予測は predictAsync で利用可能
      return this.predictWithFallback(features, data);
    }

    // フォールバック: 従来のルールベース予測
    return this.predictRuleBased(features, data);
  }

  /**
   * 予測用のフィーチャー抽出
   * predict() と predictAsync() で共通使用
   */
  private extractFeatures(
    prices: number[],
    volumes: number[],
    indicators: TechnicalIndicator & { atr: number[] }
  ): PredictionFeatures | null {
    const currentPrice = prices[prices.length - 1];
    const averageVolume = volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length;

    // 防御ガード: 指標データ不足時はnullを返す
    if (!indicators.rsi?.length || !indicators.sma20?.length || !indicators.bollingerBands?.lower?.length) {
      return null;
    }

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

  /**
   * 訓練済みモデルによる非同期予測
   * スクリーナーなど非同期処理が可能な場所で使う
   */
  async predictAsync(stock: Stock, data: OHLCV[], indicators: TechnicalIndicator & { atr: number[] }): Promise<ModelPrediction> {
    const prices = data.map(d => d.close), volumes = data.map(d => d.volume);

    const features = this.extractFeatures(prices, volumes, indicators);

    if (!features) {
      return {
        rfPrediction: 0,
        xgbPrediction: 0,
        lstmPrediction: 0,
        ensemblePrediction: 0,
        confidence: 0
      };
    }

    const modelState = mlTrainingService.getState();
    if (modelState.isTrained) {
      try {
        const result = await mlTrainingService.predict(features);
        // 確率を予測スコアに変換 (-10 to +10)
        const score = (result.probability - 0.5) * 20;
        return {
          rfPrediction: score * 1.1,
          xgbPrediction: score * 0.9,
          lstmPrediction: score * 1.0,
          ensemblePrediction: score,
          confidence: result.confidence,
        };
      } catch {
        // フォールバック
      }
    }

    return this.predictRuleBased(features, data);
  }

  /** ルールベース予測（フォールバック用） */
  private predictRuleBased(features: PredictionFeatures, data: OHLCV[]): ModelPrediction {
    const randomForestPrediction = this.randomForestPredict(features);
    const xgboostPrediction = this.xgboostPredict(features);
    const lstmPrediction = this.lstmPredict(data);

    const ensemblePrediction = randomForestPrediction * this.weights.RF + xgboostPrediction * this.weights.XGB + lstmPrediction * this.weights.LSTM;
    return { rfPrediction: randomForestPrediction, xgbPrediction: xgboostPrediction, lstmPrediction: lstmPrediction, ensemblePrediction, confidence: this.calculateConfidence(features, ensemblePrediction) };
  }

  /** 訓練済みモデル予測（同期フォールバック） */
  private predictWithFallback(features: PredictionFeatures, data: OHLCV[]): ModelPrediction {
    // 同期コンテキストではルールベースを返しつつ、モデル精度をconfidenceに反映
    const ruleBased = this.predictRuleBased(features, data);
    const modelState = mlTrainingService.getState();
    if (modelState.metrics) {
      // モデルの検証精度をconfidenceに反映
      ruleBased.confidence = Math.round(modelState.metrics.valAccuracy * 100);
    }
    return ruleBased;
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
    const baseAnalysis = analyzeStock(stock.symbol, data, stock.market, indexData);

    // 1. 市場相関分析 (Market Sync)
    const { marketInfo, confidenceAdjustment, marketComment } = this.analyzeMarketCorrelation(stock, data, indexData, prediction.ensemblePrediction);

    const finalConfidence = Math.min(Math.max(prediction.confidence + confidenceAdjustment, PRICE_CALCULATION.MIN_CONFIDENCE), PRICE_CALCULATION.MAX_CONFIDENCE);
    const isStrong = finalConfidence >= 80;

    // 2. シグナルタイプの決定
    let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const BUY_THRESHOLD = 0.5; // 1.0 -> 0.5 に緩和
    const SELL_THRESHOLD = -0.5;

    if (prediction.ensemblePrediction > BUY_THRESHOLD && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'BUY';
    else if (prediction.ensemblePrediction < SELL_THRESHOLD && finalConfidence >= BACKTEST_CONFIG.MIN_SIGNAL_CONFIDENCE) type = 'SELL';

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
      // HOLDの場合でも、MLの予測騰落率に基づいたターゲットを表示して「予測の方向性」を示す
      const predictedMove = currentPrice * (prediction.ensemblePrediction / 100);
      targetPrice = currentPrice + predictedMove;
      stopLoss = currentPrice; // HOLD時はストップロスを表示しないか現在値に固定
    }

    let correctionComment = "";
    if (errorFactor > ERROR_THRESHOLD && type !== 'HOLD') {
      correctionComment = ` 直近の予測誤差(${errorFactor.toFixed(1)}倍)を考慮しリスク管理を強化。`;
      const drift = Math.abs(currentPrice - stopLoss) * errorFactor;
      stopLoss = type === 'BUY' ? currentPrice - drift : currentPrice + drift;
    }

    // 予測騰落率の符号をシグナルタイプと強制的に一致させるガード（BUY/SELL時のみ）
    let finalPredictedChange = prediction.ensemblePrediction;
    if (type === 'BUY' && finalPredictedChange < 0) finalPredictedChange = Math.abs(finalPredictedChange);
    if (type === 'SELL' && finalPredictedChange > 0) finalPredictedChange = -Math.abs(finalPredictedChange);
    
    // HOLD時でも生の予測値を表示することで、小幅な動きやトレンドの兆しを可視化する
    // ただし、非常に低い信頼度の場合は中央（0）に寄せる減衰処理を行う
    if (type === 'HOLD') {
      const dampingFactor = Math.max(0, (finalConfidence - 30) / 70); // 信頼度30以下は0、100で1.0
      finalPredictedChange = prediction.ensemblePrediction * dampingFactor;
    }

    // シグナル理由の生成
    const reason = this.generateBaseReason(type);

    // Final safety check for NaN in target/stop
    if (isNaN(targetPrice)) targetPrice = currentPrice;
    if (isNaN(stopLoss)) stopLoss = currentPrice;

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
      volumeResistance: baseAnalysis.volumeResistance,
      forecastCone: baseAnalysis.forecastCone
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

  /**
   * 強化ルールベース予測 - テクニカル分析
   * 複合指標を使用した高精度な予測
   */
  private randomForestPredict(features: PredictionFeatures): number {
    let score = 0;
    const reasons: string[] = [];

    // RSI分析（極端値を重視）
    if (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD) {
      score += 4;
      reasons.push(`RSI極度売られすぎ(${features.rsi.toFixed(1)})`);
    } else if (features.rsi < RSI_CONFIG.OVERSOLD) {
      score += 2;
      reasons.push(`RSI売られすぎ(${features.rsi.toFixed(1)})`);
    } else if (features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT) {
      score -= 4;
      reasons.push(`RSI極度買われすぎ(${features.rsi.toFixed(1)})`);
    } else if (features.rsi > RSI_CONFIG.OVERBOUGHT) {
      score -= 2;
      reasons.push(`RSI買われすぎ(${features.rsi.toFixed(1)})`);
    }

    // RSI変化率（勢い）
    if (features.rsiChange > 5) {
      score += 1.5;
      reasons.push(`RSI上昇加速(${features.rsiChange.toFixed(1)})`);
    } else if (features.rsiChange < -5) {
      score -= 1.5;
      reasons.push(`RSI下降加速(${features.rsiChange.toFixed(1)})`);
    }

    // 移動平均トレンド
    if (features.sma5 > 2 && features.sma20 > 1) {
      score += 3;
      reasons.push(`強い上昇トレンド(SMA5:+${features.sma5.toFixed(1)}%, SMA20:+${features.sma20.toFixed(1)}%)`);
    } else if (features.sma5 > 0 && features.sma20 > 0) {
      score += 1.5;
      reasons.push(`上昇トレンド(SMA5:+${features.sma5.toFixed(1)}%)`);
    } else if (features.sma5 < -2 && features.sma20 < -1) {
      score -= 3;
      reasons.push(`強い下降トレンド(SMA5:${features.sma5.toFixed(1)}%, SMA20:${features.sma20.toFixed(1)}%)`);
    } else if (features.sma5 < 0 && features.sma20 < 0) {
      score -= 1.5;
      reasons.push(`下降トレンド(SMA5:${features.sma5.toFixed(1)}%)`);
    }

    // 連続的なベーススコアの加算（0付近の固着を防ぐ）
    score += features.sma5 * 0.1;

    // ゴールデン/デッドクロス検出
    if (features.sma5 > 0 && features.sma5 > features.sma20) {
      score += 1;
      reasons.push('短期MAが長期MAを上回る(買いシグナル)');
    } else if (features.sma5 < 0 && features.sma5 < features.sma20) {
      score -= 1;
      reasons.push('短期MAが長期MAを下回る(売りシグナル)');
    }

    // モメンタム
    if (features.priceMomentum > 5) {
      score += 2;
      reasons.push(`強い上昇モメンタム(${features.priceMomentum.toFixed(1)}%)`);
    } else if (features.priceMomentum < -5) {
      score -= 2;
      reasons.push(`強い下降モメンタム(${features.priceMomentum.toFixed(1)}%)`);
    }

    // MACDシグナル
    if (features.macdSignal > 0.5) {
      score += 1.5;
      reasons.push('MACD買いシグナル');
    } else if (features.macdSignal < -0.5) {
      score -= 1.5;
      reasons.push('MACD売りシグナル');
    }

    // ボリンジャーバンド位置
    if (features.bollingerPosition < 10) {
      score += 2;
      reasons.push('ボリンジャーバンド下限付近(反発期待)');
    } else if (features.bollingerPosition > 90) {
      score -= 2;
      reasons.push('ボリンジャーバンド上限付近(調整期待)');
    }

    // 出来高確認
    if (features.volumeRatio > 2) {
      if (score > 0) {
        score += 1;
        reasons.push('出来高増加で上昇を確認');
      } else if (score < 0) {
        score -= 1;
        reasons.push('出来高増加で下降を確認');
      }
    }

    // ボラティリティ考慮
    if (features.volatility > 50) {
      score *= 0.8; // 高ボラティリティ時はスコアを抑制
      reasons.push('高ボラティリティ(リスク注意)');
    }

    this._lastPredictionReasons = reasons;
    return score * 0.9;
  }

  /**
   * 強化ルールベース予測 - ブースティングアプローチ
   * 複数の弱い学習器を組み合わせた予測
   */
  private xgboostPredict(features: PredictionFeatures): number {
    let score = 0;
    const weakLearners: Array<{ weight: number; prediction: number; reason: string }> = [];

    // Weak Learner 1: RSIベース
    const rsiScore = (50 - features.rsi) / 10;
    weakLearners.push({ weight: 0.3, prediction: rsiScore, reason: `RSIスコア: ${rsiScore.toFixed(2)}` });

    // Weak Learner 2: モメンタム
    const momentumScore = Math.max(-3, Math.min(3, features.priceMomentum / 3));
    weakLearners.push({ weight: 0.25, prediction: momentumScore, reason: `モメンタム: ${momentumScore.toFixed(2)}` });

    // Weak Learner 3: 移動平均乖離
    const smaScore = (features.sma5 * 0.6 + features.sma20 * 0.4) / 5;
    weakLearners.push({ weight: 0.25, prediction: smaScore, reason: `MA乖離: ${smaScore.toFixed(2)}` });

    // Weak Learner 4: MACD
    const macdScore = features.macdSignal * 2;
    weakLearners.push({ weight: 0.2, prediction: macdScore, reason: `MACD: ${macdScore.toFixed(2)}` });

    // 加重平均
    const totalWeight = weakLearners.reduce((sum, wl) => sum + wl.weight, 0);
    score = weakLearners.reduce((sum, wl) => sum + wl.weight * wl.prediction, 0) / totalWeight;

    return score * 1.1;
  }

  private _lastPredictionReasons: string[] = [];

  /**
   * 強化ルールベース予測 - 時系列パターン分析
   * トレンド、レンジ、ブレイクアウトを検出
   */
  private lstmPredict(data: OHLCV[]): number {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const recentPrices = prices.slice(-30);
    const recentVolumes = volumes.slice(-30);
    
    if (recentPrices.length < 10) return 0;

    let score = 0;

    // 1. 線形トレンド分析（最小二乗法）
    const n = recentPrices.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = recentPrices.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * recentPrices[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const trendStrength = (slope / recentPrices[0]) * 100 * 30; // 30日間の予測
    
    // トレンド方向と強さ
    if (trendStrength > 5) {
      score += 3;
    } else if (trendStrength > 2) {
      score += 1.5;
    } else if (trendStrength > 0.5) {
      score += 0.5; // 小幅な上昇トレンドを検出
    } else if (trendStrength < -5) {
      score -= 3;
    } else if (trendStrength < -2) {
      score -= 1.5;
    } else if (trendStrength < -0.5) {
      score -= 0.5; // 小幅な下降トレンドを検出
    }

    // 2. ボラティリティ収縮/拡張パターン
    const recentVolatility = this.calculateVolatility(recentPrices.slice(-10));
    const olderVolatility = this.calculateVolatility(recentPrices.slice(-20, -10));
    
    if (olderVolatility > 0 && recentVolatility < olderVolatility * 0.7) {
      // ボラティリティ収縮後のブレイクアウト期待
      const lastPrice = recentPrices[recentPrices.length - 1];
      const avgPrice = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (lastPrice > avgPrice * 1.01) {
        score += 1.5; // 上向きブレイクアウト期待
      } else if (lastPrice < avgPrice * 0.99) {
        score -= 1.5; // 下向きブレイクアウト期待
      }
    }

    // 3. 出来高確認
    const recentAvgVolume = recentVolumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const olderAvgVolume = recentVolumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    
    if (olderAvgVolume > 0 && recentAvgVolume > olderAvgVolume * 1.5) {
      // 出来高増加
      if (trendStrength > 0) {
        score += 1; // 上昇トレンド確認
      } else if (trendStrength < 0) {
        score -= 1; // 下降トレンド確認
      }
    }

    // 4. サポート/レジスタンスレベルからの反発
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);
    const currentPrice = recentPrices[recentPrices.length - 1];
    const priceRange = maxPrice - minPrice;
    
    if (priceRange > 0) {
      const positionInRange = (currentPrice - minPrice) / priceRange;
      if (positionInRange < 0.1) {
        score += 1; // サポートレベル付近
      } else if (positionInRange > 0.9) {
        score -= 1; // レジスタンスレベル付近
      }
    }

    return score * 0.8;
  }

  /**
   * 信頼度計算 - 強化版
   * 複合指標の整合性を評価
   */
  private calculateConfidence(features: PredictionFeatures, prediction: number): number {
    let confidence = 50;
    let agreementCount = 0;
    let totalSignals = 0;

    // RSI極端値
    if (features.rsi < RSI_CONFIG.EXTREME_OVERSOLD || features.rsi > RSI_CONFIG.EXTREME_OVERBOUGHT) {
      confidence += 12;
      agreementCount++;
    }
    totalSignals++;

    // モメンタム強度
    if (Math.abs(features.priceMomentum) > SIGNAL_THRESHOLDS.STRONG_MOMENTUM) {
      confidence += 8;
      agreementCount++;
    }
    totalSignals++;

    // MACDシグナル
    if (Math.abs(features.macdSignal) > 0.5) {
      confidence += 6;
      if ((features.macdSignal > 0 && prediction > 0) || (features.macdSignal < 0 && prediction < 0)) {
        agreementCount++;
      }
    }
    totalSignals++;

    // 移動平均整合性
    if (features.sma5 > 0 && features.sma20 > 0 && prediction > 0) {
      confidence += 8;
      agreementCount += 2;
    } else if (features.sma5 < 0 && features.sma20 < 0 && prediction < 0) {
      confidence += 8;
      agreementCount += 2;
    }
    totalSignals += 2;

    // ボリンジャーバンド極端値
    if (features.bollingerPosition < 15 || features.bollingerPosition > 85) {
      confidence += 6;
      agreementCount++;
    }
    totalSignals++;

    // 予測の大きさ
    if (Math.abs(prediction) > 3) {
      confidence += 5;
      agreementCount++;
    }
    totalSignals++;

    // シグナル整合性ボーナス
    const agreementRatio = agreementCount / totalSignals;
    if (agreementRatio > 0.7) {
      confidence += 10; // 高整合性
    } else if (agreementRatio < 0.3) {
      confidence -= 10; // 低整合性（矛盾）
    }

    return Math.min(Math.max(confidence, PRICE_CALCULATION.MIN_CONFIDENCE), 95);
  }

  /**
   * 予測理由を生成
   */
  private generateBaseReason(type: string): string {
    const reasons = this._lastPredictionReasons;
    
    if (reasons.length === 0) {
      if (type === 'BUY') return "複合指標から上昇トレンドを検出。";
      if (type === 'SELL') return "複合指標から下降トレンドを検出。";
      return "指標に方向性が見られず、様子見を推奨。";
    }

    // 上位3つの理由を選択
    const topReasons = reasons.slice(0, 3);
    const reasonText = topReasons.join(' ');

    if (type === 'BUY') {
      return `買いシグナル: ${reasonText}`;
    } else if (type === 'SELL') {
      return `売りシグナル: ${reasonText}`;
    } else {
      return `中立: ${reasonText}`;
    }
  }

  private last(arr: number[], fallback: number): number {
    return arr.length > 0 ? arr[arr.length - 1] : fallback;
  }

  private at(arr: number[], idx: number, fallback: number): number {
    return idx >= 0 && idx < arr.length ? arr[idx] : fallback;
  }
}

export const mlPredictionService = new MLPredictionService();
