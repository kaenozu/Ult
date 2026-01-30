/**
 * ML予測サービス（統合版）
 * 
 * このモジュールは、分割されたサービスを統合し、以前のmlPredictionServiceと互換性を持つAPIを提供します。
 */

import { Stock, OHLCV, Signal } from '../types';
import { technicalIndicatorService } from './services/technical-indicator-service';
import { mlModelService } from './services/ml-model-service';
import { signalGenerationService } from './services/signal-generation-service';
import { featureCalculationService } from './services/feature-calculation-service';

class MLPredictionService {
  /**
   * 予測に必要な全てのテクニカル指標を一括計算
   */
  calculateIndicators(data: OHLCV[]) {
    return technicalIndicatorService.calculateIndicators(data);
  }

  /**
   * MLモデル群（RF, XGB, LSTM）による統合予測
   */
  predict(stock: Stock, data: OHLCV[], indicators: any) {
    const features = featureCalculationService.calculateFeatures(data, indicators);
    return mlModelService.predict(features);
  }

  /**
   * 最終的なシグナルを生成（市場相関と自己矯正を含む）
   */
  generateSignal(stock: Stock, data: OHLCV[], prediction: any, indicators: any, indexData?: OHLCV[]) {
    return signalGenerationService.generateSignal(stock, data, prediction, indicators, indexData);
  }
}

export const mlPredictionService = new MLPredictionService();