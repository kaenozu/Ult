/**
 * analysis.ts - 互換性維持のためのプロキシ
 * 全心的なロジックは AnalysisService / AccuracyService / TechnicalIndicatorService に移行しました。
 */

import { OHLCV, Signal } from '../types';
import { analysisService } from './AnalysisService';
import { accuracyService } from './AccuracyService';
import { volumeAnalysisService } from './VolumeAnalysis';

export const analyzeStock = analysisService.analyzeStock.bind(analysisService);
export const optimizeParameters = analysisService.optimizeParameters.bind(analysisService);
export const calculateAIHitRate = accuracyService.calculateAIHitRate.bind(accuracyService);
export const calculatePredictionError = accuracyService.calculatePredictionError.bind(accuracyService);

// 互換性のために残す
export function calculateVolumeProfile(data: OHLCV[]) {
  return volumeAnalysisService.calculateVolumeProfile(data);
}

// 内部計算用だった関数をラップ
export function calculateRealTimeAccuracy(symbol: string, data: OHLCV[]) {
  return accuracyService.calculateRealTimeAccuracy(symbol, data);
}