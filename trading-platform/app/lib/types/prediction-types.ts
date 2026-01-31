/**
 * 予測関連の型定義
 */

import { TechnicalIndicator } from '@/app/types';

export interface PredictionFeatures {
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

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}

// 拡張されたTechnicalIndicator型
export interface ExtendedTechnicalIndicator extends TechnicalIndicator {
  atr: number[];
}