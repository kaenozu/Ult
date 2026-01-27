/**
 * analysis.ts - 互換性維持のためのプロキシ
 * 全心的なロジックは AnalysisService / AccuracyService / TechnicalIndicatorService に移行しました。
 */

import { OHLCV, Signal } from '../types';
import { analysisService } from './AnalysisService';
import { accuracyService } from './AccuracyService';

export const analyzeStock = analysisService.analyzeStock.bind(analysisService);
export const optimizeParameters = analysisService.optimizeParameters.bind(analysisService);
export const calculateAIHitRate = accuracyService.calculateAIHitRate.bind(accuracyService);
export const calculatePredictionError = accuracyService.calculatePredictionError.bind(accuracyService);

// 互換性のために残す（将来的には削除検討）
export function calculateVolumeProfile(data: OHLCV[]) {
  return analysisService.calculateForecastCone(data); // 実際には volumeResistance が analysisService で使われているので不要かもしれないが、一部で直接呼ばれている可能性あり
}

// 内部計算用だった関数をラップ
export function calculateRealTimeAccuracy(symbol: string, data: OHLCV[]) {
  return accuracyService.calculateRealTimeAccuracy(symbol, data);
}