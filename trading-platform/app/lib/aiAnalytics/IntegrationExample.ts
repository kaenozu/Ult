/**
 * Enhanced ML Integration Example
 * 
 * このファイルは、新しい機械学習強化機能の使用方法を示すサンプルコードです。
 */

import { OHLCV } from '../../types/shared';
import { featureEngineering, ExtendedTechnicalFeatures } from './FeatureEngineering';
import { ensembleModel } from './EnsembleModel';
import { modelValidation, TrainingData } from './ModelValidation';
import { modelMonitor } from './ModelMonitor';

/**
 * 使用例1: 拡張特徴量の計算
 * 
 * 従来の基本的な特徴量に加えて、21個の拡張特徴量を計算します。
 */
export function calculateEnhancedFeatures(
  ohlcvData: OHLCV[],
  currentPrice: number,
  averageVolume: number
): ExtendedTechnicalFeatures {
  try {
    // 拡張特徴量の計算
    const features = featureEngineering.calculateExtendedFeatures(
      ohlcvData,
      currentPrice,
      averageVolume
    );

    // 特徴量の重要性分析
    const importance = featureEngineering.analyzeFeatureImportance(features);

    // 最も重要な特徴量トップ5を表示
    importance.slice(0, 5).forEach(item => {
      console.log(`${item.name}: ${item.score.toFixed(4)}`);
    });

    return features;
  } catch (error) {
    console.error('Error calculating features:', error);
    throw error;
  }
}

/**
 * 使用例2: アンサンブル予測の実行
 * 
 * 3つの異なる戦略（重み付き平均、スタッキング、投票）で予測を行います。
 */
export function performEnsemblePrediction(
  features: ExtendedTechnicalFeatures,
  ohlcvData: OHLCV[]
) {
  // 重み付き平均による予測
  const weightedPrediction = ensembleModel.predict(features, ohlcvData, 'weighted_average');
<<<<<<< HEAD
  console.log(`(Score: ${weightedPrediction.score.toFixed(2)}, Confidence: ${(weightedPrediction.confidence * 100).toFixed(1)}%)`);

  // スタッキングによる予測
  const stackingPrediction = ensembleModel.predict(features, ohlcvData, 'stacking');
  console.log(`(Score: ${stackingPrediction.score.toFixed(2)}, Confidence: ${(stackingPrediction.confidence * 100).toFixed(1)}%)`);

  // 投票による予測
  const votingPrediction = ensembleModel.predict(features, ohlcvData, 'voting');
  console.log(`(Score: ${votingPrediction.score.toFixed(2)}, Confidence: ${(votingPrediction.confidence * 100).toFixed(1)}%)`);

=======
              console.log(`(Score: ${weightedPrediction.score.toFixed(2)}, Confidence: ${(weightedPrediction.confidence * 100).toFixed(1)}%)`);
  // スタッキングによる予測
  const stackingPrediction = ensembleModel.predict(features, ohlcvData, 'stacking');
              console.log(`(Score: ${stackingPrediction.score.toFixed(2)}, Confidence: ${(stackingPrediction.confidence * 100).toFixed(1)}%)`);
  // 投票による予測
  const votingPrediction = ensembleModel.predict(features, ohlcvData, 'voting');
              console.log(`(Score: ${votingPrediction.score.toFixed(2)}, Confidence: ${(votingPrediction.confidence * 100).toFixed(1)}%)`);
>>>>>>> refactoring/major-codebase-cleanup
  // モデル間の合意度を確認

  // 個別モデルの予測を確認
  weightedPrediction.individualPredictions.forEach(pred => {
    console.log(`Model: ${pred.model}, Value: ${pred.value.toFixed(2)}, Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
  });

  return weightedPrediction;
}

/**
 * 使用例3: モデルの検証と最適化
 * 
 * 交差検証を使用してモデルの性能を評価し、過学習を検知します。
 */
export function validateModel(
  trainingData: TrainingData,
  predictFn: (features: number[][]) => number[]
) {
  // K-分割交差検証
  const cvResult = modelValidation.crossValidate(trainingData, predictFn, 5);
  
  
  if (cvResult.isOverfitting) {
    console.warn(`Overfitting Score: ${(cvResult.overfittingScore * 100).toFixed(1)}%`);
  }

  // 各フォールドの結果
  cvResult.results.forEach(result => {
<<<<<<< HEAD
    console.log(`F1 Score ${(result.f1Score * 100).toFixed(1)}%`);
=======
                console.log(`F1 Score ${(result.f1Score * 100).toFixed(1)}%`);
>>>>>>> refactoring/major-codebase-cleanup
  });

  return cvResult;
}

/**
 * 使用例4: 時系列交差検証
 * 
 * 実際のトレーディング環境を模擬して、Walk-forward検証を行います。
 */
export function performTimeSeriesValidation(
  trainingData: TrainingData,
  predictFn: (features: number[][]) => number[]
) {
  const windowSize = 252; // 1年分の取引日
  
  const tsResult = modelValidation.timeSeriesCrossValidate(
    trainingData,
    predictFn,
    windowSize
  );


  return tsResult;
}

/**
 * 使用例5: パラメータの最適化
 * 
 * グリッドサーチを使用して最適なモデルパラメータを見つけます。
 */
export function optimizeModelParameters(
  trainingData: TrainingData,
  predictFnWithParams: (features: number[][], params: Record<string, number>) => number[]
) {
  const paramRanges = [
    { name: 'rsiPeriod', min: 10, max: 20, step: 2 },
    { name: 'smaPeriod', min: 15, max: 25, step: 5 },
  ];

  const optimalParams = modelValidation.optimizeParameters(
    trainingData,
    predictFnWithParams,
    paramRanges
  );


  return optimalParams;
}

/**
 * 使用例6: 予測のモニタリング
 * 
 * 予測結果を追跡し、モデルのドリフトを検知します。
 */
export function monitorPredictions(
  symbol: string,
  prediction: number,
  confidence: number,
  signalType: 'BUY' | 'SELL' | 'HOLD'
) {
  // ベースライン精度を設定（初回のみ）
  if (modelMonitor.getBaselineAccuracy() === 0.75) {
    modelMonitor.setBaselineAccuracy(0.78); // 78%を目標精度とする
  }

  // 予測を記録
  modelMonitor.trackPrediction({
    timestamp: new Date(),
    symbol,
    prediction,
    actual: null, // 実際の値は後で更新
    confidence,
    signalType,
  });

  // 統計情報を取得
  const stats = modelMonitor.getStats();
  
  if (stats.recentAccuracy !== null) {
  }

  // ドリフトの検知
  if (stats.driftStatus) {
    console.warn('MODEL DRIFT DETECTED:');
    console.warn(`Type: ${stats.driftStatus.type}`);
    console.warn(`Severity: ${stats.driftStatus.severity}`);
    console.warn(`Drift: ${(stats.driftStatus.drift * 100).toFixed(1)}%`);
    console.warn(`Recommended Action: ${stats.driftStatus.recommendedAction}`);
  }

  // 再学習トリガーの確認
  const trigger = modelMonitor.getRetrainingTrigger();
  if (trigger) {
    console.warn('RETRAINING RECOMMENDED:');
    console.warn(`Reason: ${trigger.reason}`);
    console.warn(`Urgency: ${trigger.urgency}`);
    console.warn(`Current Accuracy: ${(trigger.metrics.currentAccuracy * 100).toFixed(1)}%`);
    console.warn(`Performance Drop: ${trigger.metrics.performanceDropPercent.toFixed(1)}%`);
  }
}

/**
 * 使用例7: 実際の値で予測精度を更新
 * 
 * トレード結果が確定したら、実際の値を記録して精度を追跡します。
 */
export function updatePredictionActual(
  symbol: string,
  timestamp: Date,
  actualValue: number
) {
  modelMonitor.updateActual(symbol, timestamp, actualValue);

  // パフォーマンスメトリクスを取得
  const metrics = modelMonitor.getPerformanceMetrics();
  
  
  if (metrics.belowThreshold) {
    console.warn('Performance is below threshold!');
  }
}

/**
 * 使用例8: モデルパフォーマンスの記録と動的重み調整
 * 
 * 各モデルのパフォーマンスを記録して、アンサンブルの重みを自動調整します。
 */
export function recordModelPerformance(
  rfAccuracy: number,
  xgbAccuracy: number,
  lstmAccuracy: number
) {
  // 各モデルのパフォーマンスを記録
  ensembleModel.recordPerformance('RF', rfAccuracy);
  ensembleModel.recordPerformance('XGB', xgbAccuracy);
  ensembleModel.recordPerformance('LSTM', lstmAccuracy);

  // 現在の重みを表示
  const weights = ensembleModel.getWeights();

  // パフォーマンスサマリーを表示
  const summary = ensembleModel.getPerformanceSummary();
  summary.forEach(s => {
    console.log(`Model: ${s.model}, Accuracy: ${(s.accuracy * 100).toFixed(1)}%, Weight: ${(s.weight * 100).toFixed(1)}%`);
  });
}

/**
 * 使用例9: 完全なワークフローの統合
 * 
 * 全ての機能を統合した完全な予測・モニタリングワークフローです。
 */
export async function completeMLWorkflow(
  symbol: string,
  ohlcvData: OHLCV[]
) {

  // 1. 特徴量の計算
  const currentPrice = ohlcvData[ohlcvData.length - 1].close;
  const averageVolume = ohlcvData.reduce((sum, d) => sum + d.volume, 0) / ohlcvData.length;
  
  const features = calculateEnhancedFeatures(ohlcvData, currentPrice, averageVolume);

  // 2. アンサンブル予測
  const prediction = performEnsemblePrediction(features, ohlcvData);

  // 3. 予測のモニタリング
  monitorPredictions(
    symbol,
    prediction.score,
    prediction.confidence,
    prediction.direction
  );

  // 4. 結果を返す
  return {
    symbol,
    features,
    prediction,
    timestamp: new Date(),
  };
}

/**
 * 使用例10: カスタム重みの設定
 * 
 * 特定の状況に応じて、モデルの重みを手動で調整します。
 */
export function setCustomWeights(scenario: 'conservative' | 'aggressive' | 'balanced') {
  let weights;

  switch (scenario) {
    case 'conservative':
      // 安定性を重視してRFの重みを増やす
      weights = { RF: 0.50, XGB: 0.30, LSTM: 0.20 };
      break;
    case 'aggressive':
      // トレンド追従を重視してLSTMの重みを増やす
      weights = { RF: 0.25, XGB: 0.35, LSTM: 0.40 };
      break;
    case 'balanced':
    default:
      // バランス重視
      weights = { RF: 0.35, XGB: 0.35, LSTM: 0.30 };
      break;
  }

  ensembleModel.setWeights(weights);
}
