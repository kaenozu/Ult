/**
 * EnsembleModel.ts
 *
 * 動的アンサンブル重み付けクラス
 * 複数モデルのパフォーマンスに基づく重み調整、市場状態に応じたモデル選択を提供します。
 *
 * SECURITY NOTE: This module contains STUB implementations for ML models (RF, XGB, LSTM).
 * These are placeholder rule-based models for development and testing only.
 * DO NOT deploy to production without replacing with actual trained ML models.
 */

import { AllFeatures, SentimentFeatures, MacroEconomicFeatures } from './FeatureEngineering';
import { OHLCV } from '@/app/types';
import { calculateATR } from '@/app/lib/utils/technical-analysis';

// SECURITY: Production deployment safeguard
const PRODUCTION_ML_READY = false; // SET TO TRUE ONLY AFTER DEPLOYING REAL ML MODELS

/**
 * Check if running in production and ML models are properly deployed
 * @throws Error if production deployment is detected without real ML models
 */
function validateProductionDeployment(): void {
  if (typeof window !== 'undefined' &&
      (window.location.hostname === 'production-domain.com' ||
       process.env.NODE_ENV === 'production' ||
       process.env.NEXT_PUBLIC_ENV === 'production')) {
    if (!PRODUCTION_ML_READY) {
      throw new Error(
        'SECURITY ERROR: Attempted to use STUB ML models in production. ' +
        'Replace stub implementations with trained models before deploying. ' +
        'Set PRODUCTION_ML_READY=true only after real ML models are deployed.'
      );
    }
  }
}

/**
 * モデルタイプ
 */
export type ModelType = 'RF' | 'XGB' | 'LSTM' | 'TECHNICAL' | 'ENSEMBLE';

/**
 * モデルパフォーマンスメトリクス
 */
export interface ModelPerformance {
  modelType: ModelType;
  accuracy: number; // 0-100
  precision: number; // 0-1
  recall: number; // 0-1
  f1Score: number; // 0-1
  sharpeRatio: number;
  lastUpdate: string;
  totalPredictions: number;
  correctPredictions: number;
}

/**
 * 予測結果
 */
export interface ModelPrediction {
  modelType: ModelType;
  prediction: number; // 予測騰落率（%）
  confidence: number; // 0-100
  timestamp: string;
}

/**
 * アンサンブル予測結果
 */
export interface EnsemblePrediction {
  finalPrediction: number; // 最終予測騰落率（%）
  confidence: number; // 信頼度 0-100
  weights: Record<ModelType, number>; // 各モデルの重み
  modelPredictions: ModelPrediction[]; // 各モデルの予測
  marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  reasoning: string; // 予測の根拠
  timestamp: string;
}

/**
 * 市場状態
 */
export interface MarketRegime {
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
  trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // 0-100
  adx: number; // Average Directional Index
  atr: number; // Average True Range
  expectedDuration: number; // 予想される持続期間（日数）
  daysInRegime: number; // 現在のレジーム経過日数
}

/**
 * アンサンブル重み付け設定
 */
interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
  TECHNICAL: number;
  ENSEMBLE: number; // Ensembled model weight (typically 0 or derived)
}

/**
 * 動的アンサンブルモデルクラス
 */
export class EnsembleModel {
  private performanceHistory: Map<ModelType, ModelPerformance[]> = new Map();
  private currentWeights: EnsembleWeights = { RF: 0.25, XGB: 0.35, LSTM: 0.25, TECHNICAL: 0.15, ENSEMBLE: 0 };
  private baseWeights: EnsembleWeights = { RF: 0.25, XGB: 0.35, LSTM: 0.25, TECHNICAL: 0.15, ENSEMBLE: 0 };
  private lastRegimeUpdate: string = new Date().toISOString();
  private currentRegime: MarketRegime | null = null;

  // 重み調整パラメータ
  private readonly LEARNING_RATE = 0.1;
  private readonly MIN_WEIGHT = 0.05;
  private readonly MAX_WEIGHT = 0.6;
  private readonly PERFORMANCE_WINDOW = 50; // パフォーマンス評価ウィンドウ
  private readonly REGIME_UPDATE_INTERVAL = 5; // レジーム更新間隔（日数）

  /**
   * アンサンブル予測を実行
   */
  predict(
    data: OHLCV[],
    features: AllFeatures,
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): EnsemblePrediction {
    // SECURITY: Validate production deployment
    validateProductionDeployment();

    if (!data || data.length === 0) {
      throw new Error('Insufficient data for prediction');
    }

    // 市場レジームを判定
    const marketRegime = this.detectMarketRegime(data);

    // 市場レジームに基づいて重みを調整
    const adjustedWeights = this.adjustWeightsForRegime(marketRegime);

    // 各モデルの予測を生成
    const modelPredictions: ModelPrediction[] = [
      this.predictRandomForest(features),
      this.predictXGBoost(features),
      this.predictLSTM(data, features),
      this.predictTechnical(features),
    ];

    // マクロ経済・センチメントの調整
    const macroAdjustedPredictions = this.applyMacroSentimentAdjustment(
      modelPredictions,
      macroData,
      sentimentData
    );

    // アンサンブル予測を計算
    const finalPrediction = this.calculateEnsemblePrediction(
      macroAdjustedPredictions,
      adjustedWeights
    );

    // 信頼度を計算
    const confidence = this.calculateEnsembleConfidence(
      macroAdjustedPredictions,
      adjustedWeights,
      marketRegime
    );

    // 予測の根拠を生成
    const reasoning = this.generateReasoning(
      macroAdjustedPredictions,
      adjustedWeights,
      marketRegime,
      confidence
    );

    return {
      finalPrediction,
      confidence,
      weights: adjustedWeights,
      modelPredictions: macroAdjustedPredictions,
      marketRegime: marketRegime.regime,
      reasoning,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 各モデルのパフォーマンスを記録
   */
  recordPerformance(modelType: ModelType, actual: number, predicted: number): void {
    const isCorrect = Math.sign(actual) === Math.sign(predicted);
    const accuracy = isCorrect ? 100 : 0;

    const performance: ModelPerformance = {
      modelType,
      accuracy,
      precision: this.calculatePrecision(actual, predicted),
      recall: this.calculateRecall(actual, predicted),
      f1Score: this.calculateF1Score(actual, predicted),
      sharpeRatio: this.calculateSharpeRatio(actual, predicted),
      lastUpdate: new Date().toISOString(),
      totalPredictions: 1,
      correctPredictions: isCorrect ? 1 : 0,
    };

    // パフォーマンス履歴に追加
    if (!this.performanceHistory.has(modelType)) {
      this.performanceHistory.set(modelType, []);
    }
    const history = this.performanceHistory.get(modelType)!;
    history.push(performance);

    // パフォーマンスウィンドウを維持
    if (history.length > this.PERFORMANCE_WINDOW) {
      history.shift();
    }

    // 重みを更新
    this.updateWeightsBasedOnPerformance();
  }

  /**
   * 市場レジームを検出
   */
  private detectMarketRegime(data: OHLCV[]): MarketRegime {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // ADX（Average Directional Index）を計算してトレンド強度を判定
    const adx = this.calculateADX(data, 14);
    const atr = this.calculateATR(data, 14);

    // ボラティリティを計算
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * 100;

    // トレンド方向を判定
    const recentPrices = prices.slice(-20);
    const firstHalf = recentPrices.slice(0, 10);
    const secondHalf = recentPrices.slice(10);
    const trendDirection: 'UP' | 'DOWN' | 'NEUTRAL' =
      (secondHalf.reduce((sum, p) => sum + p, 0) / 10) >
      (firstHalf.reduce((sum, p) => sum + p, 0) / 10) * 1.02
        ? 'UP'
        : (secondHalf.reduce((sum, p) => sum + p, 0) / 10) <
          (firstHalf.reduce((sum, p) => sum + p, 0) / 10) * 0.98
        ? 'DOWN'
        : 'NEUTRAL';

    // レジームを判定
    let regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET';
    if (adx > 25) {
      regime = 'TRENDING';
    } else if (volatility > 2.5) {
      regime = 'VOLATILE';
    } else if (adx < 20 && volatility < 1.5) {
      regime = 'QUIET';
    } else {
      regime = 'RANGING';
    }

    // ボラティリティレベル
    const volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      volatility > 2.5 ? 'HIGH' : volatility > 1.5 ? 'MEDIUM' : 'LOW';

    // レジームの信頼度
    const confidence = Math.min(100, (adx / 40) * 100);

    // 現在のレジームとの比較
    let daysInRegime = 0;
    if (this.currentRegime && this.currentRegime.regime === regime) {
      const lastUpdate = new Date(this.lastRegimeUpdate);
      const now = new Date();
      daysInRegime = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // レジームが変わった場合のみ更新
    if (!this.currentRegime || this.currentRegime.regime !== regime) {
      this.currentRegime = {
        regime,
        trendDirection,
        volatilityLevel,
        confidence,
        adx,
        atr: atr[atr.length - 1] || 0,
        expectedDuration: this.estimateRegimeDuration(regime),
        daysInRegime: 0,
      };
      this.lastRegimeUpdate = new Date().toISOString();
    } else {
      this.currentRegime.daysInRegime = daysInRegime;
    }

    return this.currentRegime;
  }

  /**
   * 市場レジームに基づいて重みを調整
   */
  private adjustWeightsForRegime(regime: MarketRegime): EnsembleWeights {
    const adjustedWeights = { ...this.currentWeights };

    switch (regime.regime) {
      case 'TRENDING':
        // トレンド市場ではLSTMとXGBを重視
        adjustedWeights.LSTM = Math.min(this.MAX_WEIGHT, this.currentWeights.LSTM * 1.3);
        adjustedWeights.XGB = Math.min(this.MAX_WEIGHT, this.currentWeights.XGB * 1.2);
        adjustedWeights.RF = this.currentWeights.RF * 0.9;
        adjustedWeights.TECHNICAL = this.currentWeights.TECHNICAL * 0.8;
        break;

      case 'RANGING':
        // レンジ相場ではTechnical Analysisを重視
        adjustedWeights.TECHNICAL = Math.min(this.MAX_WEIGHT, this.currentWeights.TECHNICAL * 1.5);
        adjustedWeights.RF = this.currentWeights.RF * 1.1;
        adjustedWeights.LSTM = this.currentWeights.LSTM * 0.8;
        adjustedWeights.XGB = this.currentWeights.XGB * 0.9;
        break;

      case 'VOLATILE':
        // ボラティルな市場ではRFとXGBを重視
        adjustedWeights.RF = Math.min(this.MAX_WEIGHT, this.currentWeights.RF * 1.3);
        adjustedWeights.XGB = Math.min(this.MAX_WEIGHT, this.currentWeights.XGB * 1.2);
        adjustedWeights.LSTM = this.currentWeights.LSTM * 0.7;
        adjustedWeights.TECHNICAL = this.currentWeights.TECHNICAL * 0.9;
        break;

      case 'QUIET':
        // 静かな市場では全モデルを均等に
        adjustedWeights.RF = 0.25;
        adjustedWeights.XGB = 0.25;
        adjustedWeights.LSTM = 0.25;
        adjustedWeights.TECHNICAL = 0.25;
        break;
    }

    // 重みを正規化
    return this.normalizeWeights(adjustedWeights);
  }

  /**
   * 重みをパフォーマンスに基づいて更新
   */
  private updateWeightsBasedOnPerformance(): void {
    const modelTypes: ModelType[] = ['RF', 'XGB', 'LSTM', 'TECHNICAL'];

    for (const modelType of modelTypes) {
      const history = this.performanceHistory.get(modelType);
      if (!history || history.length < 10) continue;

      // 最近のパフォーマンスを計算
      const recentHistory = history.slice(-10);
      const avgAccuracy = recentHistory.reduce((sum, p) => sum + p.accuracy, 0) / recentHistory.length;

      // ベースラインと比較して重みを調整
      const baselineAccuracy = 60; // 60%をベースラインとする（厳格化: 55% → 60%）
      const adjustment = (avgAccuracy - baselineAccuracy) / 100 * this.LEARNING_RATE;      this.currentWeights[modelType] = Math.max(
        this.MIN_WEIGHT,
        Math.min(
          this.MAX_WEIGHT,          this.currentWeights[modelType] * (1 + adjustment)
        )
      );
    }

    // 重みを正規化
    this.currentWeights = this.normalizeWeights(this.currentWeights);
  }

  /**
   * 重みを正規化（合計が1になるように）
   */
  private normalizeWeights(weights: EnsembleWeights): EnsembleWeights {
    const total = weights.RF + weights.XGB + weights.LSTM + weights.TECHNICAL;
    return {
      RF: weights.RF / total,
      XGB: weights.XGB / total,
      LSTM: weights.LSTM / total,
      TECHNICAL: weights.TECHNICAL / total,
      ENSEMBLE: 0, // Not used for base models
    };
  }

  /**
   * Random Forestモデルで予測
   * STUB IMPLEMENTATION - Replace with actual trained Random Forest model
   */
  private predictRandomForest(features: AllFeatures): ModelPrediction {
    const t = features.technical;

    // STUB: RFは木ベースのモデルなので、しきい値ベースのルールを使用
    // TODO: Replace with actual sklearn/TensorFlow Random Forest model
    let score = 0;

    // RSI
    if (t.rsi < 30) score += 3;
    else if (t.rsi > 70) score -= 3;

    // モメンタム
    if (t.momentum10 > 3) score += 2;
    else if (t.momentum10 < -3) score -= 2;

    // 移動平均
    if (t.sma5 > 0 && t.sma20 > 0) score += 2;
    if (t.sma5 < 0 && t.sma20 < 0) score -= 2;

    // MACD
    if (t.macdHistogram > 0) score += 1;
    else if (t.macdHistogram < 0) score -= 1;

    const prediction = score * 0.8;
    const confidence = Math.min(95, 50 + Math.abs(score) * 5);

    return {
      modelType: 'RF',
      prediction,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * XGBoostモデルで予測
   * STUB IMPLEMENTATION - Replace with actual trained XGBoost model
   */
  private predictXGBoost(features: AllFeatures): ModelPrediction {
    const t = features.technical;

    // STUB: XGBoostは勾配ブースティングなので、より細かい重み付け
    // TODO: Replace with actual XGBoost model from xgboost.js or Python backend
    let score = 0;

    // RSI（重要度: 高）
    score += (50 - t.rsi) / 10;

    // モメンタム（重要度: 高）
    score += (t.momentum10 + t.momentum20) / 5;

    // 移動平均乖離（重要度: 中）
    score += (t.sma5 + t.sma10 + t.sma20) / 10;

    // ボリンジャーバンド位置（重要度: 中）
    score += (t.bbPosition - 50) / 20;

    // ATR比率（重要度: 低）
    score += (t.atrRatio - 1) * 2;

    const prediction = score * 0.9;
    const confidence = Math.min(95, 50 + Math.abs(score) * 4);

    return {
      modelType: 'XGB',
      prediction,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * LSTMモデルで予測
   * STUB IMPLEMENTATION - Replace with actual trained LSTM model
   */
  private predictLSTM(data: OHLCV[], features: AllFeatures): ModelPrediction {
    // STUB: LSTMは時系列パターンを学習する
    // TODO: Replace with actual TensorFlow.js LSTM model (see ModelPipeline.ts)
    const prices = data.map(d => d.close);
    const recentPrices = prices.slice(-30);

    // 線形トレンドを検出
    const n = recentPrices.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = recentPrices.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * recentPrices[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const prediction = (slope / (recentPrices[0] || 1)) * 100 * 30; // 30日間の予測

    // トレンド強度に基づいて信頼度を計算
    const volatility = features.technical.atrPercent;
    const confidence = Math.min(95, Math.max(50, 100 - volatility * 2));

    return {
      modelType: 'LSTM',
      prediction,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * テクニカル分析モデルで予測
   */
  private predictTechnical(features: AllFeatures): ModelPrediction {
    const t = features.technical;

    let score = 0;
    let bullishSignals = 0;
    let bearishSignals = 0;

    // RSIシグナル
    if (t.rsi < 30) bullishSignals++;
    else if (t.rsi > 70) bearishSignals++;

    // MACDシグナル
    if (t.macdHistogram > 0) bullishSignals++;
    else bearishSignals++;

    // 移動平均シグナル
    if (t.sma5 > 0 && t.sma20 > 0 && t.sma50 > 0) bullishSignals++;
    else if (t.sma5 < 0 && t.sma20 < 0 && t.sma50 < 0) bearishSignals++;

    // ボリンジャーバンドシグナル
    if (t.bbPosition < 20) bullishSignals++;
    else if (t.bbPosition > 80) bearishSignals++;

    // ボリュームシグナル
    if (t.volumeTrend === 'INCREASING' && bullishSignals > bearishSignals) score += 1;
    if (t.volumeTrend === 'INCREASING' && bearishSignals > bullishSignals) score -= 1;

    score += (bullishSignals - bearishSignals) * 1.5;

    const prediction = score;
    const confidence = Math.min(95, 50 + Math.abs(bullishSignals - bearishSignals) * 8);

    return {
      modelType: 'TECHNICAL',
      prediction,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * マクロ経済・センチメントによる調整を適用
   */
  private applyMacroSentimentAdjustment(
    predictions: ModelPrediction[],
    macroData?: MacroEconomicFeatures,
    sentimentData?: SentimentFeatures
  ): ModelPrediction[] {
    return predictions.map((p) => {
      let adjustedPrediction = p.prediction;
      let adjustedConfidence = p.confidence;

      // マクロ経済調整
      if (macroData) {
        const macroAdjustment = macroData.macroScore * 2;
        adjustedPrediction += macroAdjustment;

        if (Math.abs(macroData.macroScore) > 0.5) {
          adjustedConfidence = Math.min(95, adjustedConfidence + 5);
        }
      }

      // センチメント調整
      if (sentimentData) {
        const sentimentAdjustment = sentimentData.sentimentScore * 1.5;
        adjustedPrediction += sentimentAdjustment;

        if (Math.abs(sentimentData.sentimentScore) > 0.5) {
          adjustedConfidence = Math.min(95, adjustedConfidence + 3);
        }
      }

      return {
        ...p,
        prediction: adjustedPrediction,
        confidence: adjustedConfidence,
      };
    });
  }

  /**
   * アンサンブル予測を計算
   */
  private calculateEnsemblePrediction(
    predictions: ModelPrediction[],
    weights: EnsembleWeights
  ): number {
    return (
      predictions.find((p) => p.modelType === 'RF')!.prediction * weights.RF +
      predictions.find((p) => p.modelType === 'XGB')!.prediction * weights.XGB +
      predictions.find((p) => p.modelType === 'LSTM')!.prediction * weights.LSTM +
      predictions.find((p) => p.modelType === 'TECHNICAL')!.prediction * weights.TECHNICAL
    );
  }

  /**
   * アンサンブル信頼度を計算
   */
  private calculateEnsembleConfidence(
    predictions: ModelPrediction[],
    weights: EnsembleWeights,
    regime: MarketRegime
  ): number {
    // 重み付け信頼度
    const weightedConfidence =
      predictions.find((p) => p.modelType === 'RF')!.confidence * weights.RF +
      predictions.find((p) => p.modelType === 'XGB')!.confidence * weights.XGB +
      predictions.find((p) => p.modelType === 'LSTM')!.confidence * weights.LSTM +
      predictions.find((p) => p.modelType === 'TECHNICAL')!.confidence * weights.TECHNICAL;

    // 予測のばらつきを考慮
    const variance =
      predictions.reduce((sum, p) => sum + Math.pow(p.prediction, 2), 0) / predictions.length -
      Math.pow(predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length, 2);

    const agreementBonus = Math.max(0, 20 - variance * 2);

    // レジーム信頼度によるボーナス
    const regimeBonus = regime.confidence / 10;

    return Math.min(
      95,
      Math.max(50, weightedConfidence + agreementBonus + regimeBonus)
    );
  }

  /**
   * 予測の根拠を生成
   */
  private generateReasoning(
    predictions: ModelPrediction[],
    weights: EnsembleWeights,
    regime: MarketRegime,
    confidence: number
  ): string {
    const parts: string[] = [];

    // 市場レジーム
    parts.push(`市場状態: ${regime.regime} (${regime.trendDirection} トレンド, ボラティリティ: ${regime.volatilityLevel})`);

    // 最も重みが高いモデル
    const maxWeightModel = Object.entries(weights).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as ModelType;
    parts.push(`主要モデル: ${maxWeightModel} (重み: ${(weights[maxWeightModel] * 100).toFixed(1)}%)`);

    // 予測の方向性
    const avgPrediction =
      predictions.reduce((sum, p) => sum + p.prediction, 0) / predictions.length;
    parts.push(
      `予測方向: ${avgPrediction > 0 ? '強気' : avgPrediction < 0 ? '弱気' : '中立'} (${avgPrediction.toFixed(2)}%)`
    );

    // 信頼度
    parts.push(`信頼度: ${confidence.toFixed(0)}%`);

    return parts.join(' | ');
  }

  /**
   * ADXを計算
   */
  private calculateADX(data: OHLCV[], period: number): number {
    if (data.length < period * 2) return 20; // デフォルト値

    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const closes = data.map((d) => d.close);

    // +DMと-DMを計算
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // ATRを計算
    const atr = this.calculateATR(data, period);

    // +DIと-DIを計算
    const plusDI: number[] = [];
    const minusDI: number[] = [];
    for (let i = 0; i < plusDM.length; i++) {
      const atrValue = atr[i + 1] || atr[atr.length - 1];
      plusDI.push((plusDM[i] / atrValue) * 100);
      minusDI.push((minusDM[i] / atrValue) * 100);
    }

    // DXを計算
    const dx: number[] = [];
    for (let i = 0; i < plusDI.length; i++) {
      const sum = plusDI[i] + minusDI[i];
      dx.push(sum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100 : 0);
    }

    // ADXを計算（DXの移動平均）
    const recentDX = dx.slice(-period);
    return recentDX.reduce((sum, d) => sum + d, 0) / recentDX.length;
  }

  /**
   * ATRを計算
   */
  private calculateATR(data: OHLCV[], period: number): number[] {
    return calculateATR(data, period);
  }

  /**
   * レジームの予想持続期間を推定
   */
  private estimateRegimeDuration(regime: string): number {
    switch (regime) {
      case 'TRENDING':
        return 20; // トレンドは平均20日持続
      case 'RANGING':
        return 15; // レンジは平均15日持続
      case 'VOLATILE':
        return 5; // ボラティリティは短期間
      case 'QUIET':
        return 10; // 静かな市場は平均10日持続
      default:
        return 10;
    }
  }

  /**
   * 精度を計算
   */
  private calculatePrecision(actual: number, predicted: number): number {
    // 簡略化された精度計算
    const actualSign = Math.sign(actual);
    const predictedSign = Math.sign(predicted);
    return actualSign === predictedSign ? 1 : 0;
  }

  /**
   * 再現率を計算
   */
  private calculateRecall(actual: number, predicted: number): number {
    // 簡略化された再現率計算
    return this.calculatePrecision(actual, predicted);
  }

  /**
   * F1スコアを計算
   */
  private calculateF1Score(actual: number, predicted: number): number {
    const precision = this.calculatePrecision(actual, predicted);
    const recall = this.calculateRecall(actual, predicted);
    return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  }

  /**
   * シャープレシオを計算
   */
  private calculateSharpeRatio(actual: number, predicted: number): number {
    // 簡略化されたシャープレシオ計算
    const returns = actual * predicted > 0 ? Math.abs(actual) : -Math.abs(actual);
    return returns;
  }

  /**
   * 現在の重みを取得
   */
  getCurrentWeights(): EnsembleWeights {
    return { ...this.currentWeights };
  }

  /**
   * 各モデルのパフォーマンス統計を取得
   */
  getModelPerformanceStats(): Map<ModelType, ModelPerformance> {
    const stats = new Map<ModelType, ModelPerformance>();

    for (const [modelType, history] of this.performanceHistory.entries()) {
      if (history.length === 0) continue;

      const avgPerformance: ModelPerformance = {
        modelType,
        accuracy: history.reduce((sum, p) => sum + p.accuracy, 0) / history.length,
        precision: history.reduce((sum, p) => sum + p.precision, 0) / history.length,
        recall: history.reduce((sum, p) => sum + p.recall, 0) / history.length,
        f1Score: history.reduce((sum, p) => sum + p.f1Score, 0) / history.length,
        sharpeRatio: history.reduce((sum, p) => sum + p.sharpeRatio, 0) / history.length,
        lastUpdate: history[history.length - 1].lastUpdate,
        totalPredictions: history.reduce((sum, p) => sum + p.totalPredictions, 0),
        correctPredictions: history.reduce((sum, p) => sum + p.correctPredictions, 0),
      };

      stats.set(modelType, avgPerformance);
    }

    return stats;
  }

  /**
   * ベース重みにリセット
   */
  resetWeights(): void {
    this.currentWeights = { ...this.baseWeights };
    this.performanceHistory.clear();
  }
}

export const ensembleModel = new EnsembleModel();
