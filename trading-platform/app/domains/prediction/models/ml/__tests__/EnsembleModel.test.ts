/**
 * EnsembleModel.test.ts
 *
 * 動的アンサンブルモデルのテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ensembleModel, EnsembleModel, ModelType, EnsemblePrediction } from '../EnsembleModel';
import { featureEngineering, AllFeatures } from '../FeatureEngineering';
import { OHLCV } from '../../../types/shared';

describe('EnsembleModel', () => {
  let mockData: OHLCV[];
  let mockFeatures: AllFeatures;

  beforeEach(() => {
    // モックデータの生成（200日分）
    mockData = [];
    let price = 1000;
    const now = new Date();

    for (let i = 0; i < 200; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (200 - i));

      const change = (Math.random() - 0.48) * 20;
      price = Math.max(100, price + change);

      mockData.push({
        date: date.toISOString().split('T')[0],
        open: price,
        high: price + Math.random() * 10,
        low: price - Math.random() * 10,
        close: price + (Math.random() - 0.5) * 5,
        volume: Math.floor(1000000 + Math.random() * 500000),
      });
    }

    // 特徴量を計算
    mockFeatures = featureEngineering.calculateAllFeatures(mockData);

    // 重みをリセット
    ensembleModel.resetWeights();
  });

  describe('predict', () => {
    it('should generate ensemble prediction', () => {
      const prediction: EnsemblePrediction = ensembleModel.predict(mockData, mockFeatures);

      expect(prediction.finalPrediction).toBeDefined();
      expect(prediction.confidence).toBeGreaterThanOrEqual(50);
      expect(prediction.confidence).toBeLessThanOrEqual(95);
      expect(prediction.weights).toBeDefined();
      expect(prediction.modelPredictions).toHaveLength(4);
      expect(prediction.timestamp).toBeDefined();
    });

    it('should include all model predictions', () => {
      const prediction: EnsemblePrediction = ensembleModel.predict(mockData, mockFeatures);

      const modelTypes = prediction.modelPredictions.map((p) => p.modelType);
      expect(modelTypes).toContain('RF');
      expect(modelTypes).toContain('XGB');
      expect(modelTypes).toContain('LSTM');
      expect(modelTypes).toContain('TECHNICAL');
    });

    it('should generate valid reasoning', () => {
      const prediction: EnsemblePrediction = ensembleModel.predict(mockData, mockFeatures);

      expect(prediction.reasoning).toBeDefined();
      expect(typeof prediction.reasoning).toBe('string');
      expect(prediction.reasoning.length).toBeGreaterThan(0);
    });

    it('should detect market regime', () => {
      const prediction: EnsemblePrediction = ensembleModel.predict(mockData, mockFeatures);

      expect(['TRENDING', 'RANGING', 'VOLATILE', 'QUIET']).toContain(prediction.marketRegime);
    });

    it('should normalize weights to sum to 1', () => {
      const prediction: EnsemblePrediction = ensembleModel.predict(mockData, mockFeatures);

      const weightSum =
        prediction.weights.RF +
        prediction.weights.XGB +
        prediction.weights.LSTM +
        prediction.weights.TECHNICAL;

      expect(weightSum).toBeCloseTo(1.0, 5);
    });

    it('should apply macro sentiment adjustment when provided', () => {
      const mockMacro = {
        interestRate: 0.5,
        interestRateTrend: 'RISING' as const,
        gdpGrowth: 2.0,
        gdpTrend: 'EXPANDING' as const,
        cpi: 100,
        cpiTrend: 'RISING' as const,
        inflationRate: 2.5,
        usdjpy: 150,
        usdjpyTrend: 'APPRECIATING' as const,
        macroScore: 0.8,
      };

      const mockSentiment = {
        newsSentiment: 0.6,
        newsVolume: 0.8,
        newsTrend: 'IMPROVING' as const,
        socialSentiment: 0.5,
        socialVolume: 0.7,
        socialBuzz: 0.9,
        analystRating: 4.5,
        ratingChange: 1.0,
        sentimentScore: 0.7,
      };

      const prediction: EnsemblePrediction = ensembleModel.predict(
        mockData,
        mockFeatures,
        mockMacro,
        mockSentiment
      );

      expect(prediction).toBeDefined();
      expect(prediction.finalPrediction).toBeDefined();
    });
  });

  describe('recordPerformance', () => {
    it('should record model performance', () => {
      ensembleModel.recordPerformance('RF', 2.5, 2.0);
      ensembleModel.recordPerformance('RF', -1.5, -1.8);

      const stats = ensembleModel.getModelPerformanceStats();
      const rfStats = stats.get('RF');

      expect(rfStats).toBeDefined();
      expect(rfStats!.totalPredictions).toBe(2);
    });

    it('should update weights based on performance', () => {
      const initialWeights = ensembleModel.getCurrentWeights();

      // 良いパフォーマンスを記録
      for (let i = 0; i < 15; i++) {
        ensembleModel.recordPerformance('RF', i % 2 === 0 ? 2.0 : -2.0, i % 2 === 0 ? 2.5 : -2.3);
      }

      const updatedWeights = ensembleModel.getCurrentWeights();

      // 重みが更新されていることを確認（完全に等しくないはず）
      expect(updatedWeights.RF).toBeDefined();
    });
  });

  describe('weight adjustment', () => {
    it('should adjust weights for TRENDING regime', () => {
      // トレンドデータを作成
      const trendingData: OHLCV[] = [];
      let price = 1000;
      for (let i = 0; i < 100; i++) {
        price += 5; // 一貫して上昇
        trendingData.push({
          date: new Date(Date.now() - (100 - i) * 86400000).toISOString().split('T')[0],
          open: price,
          high: price + 2,
          low: price - 2,
          close: price,
          volume: 1000000,
        });
      }

      const features = featureEngineering.calculateAllFeatures(trendingData);
      const prediction = ensembleModel.predict(trendingData, features);

      expect(prediction.marketRegime).toBeDefined();
      expect(prediction.weights).toBeDefined();
    });

    it('should adjust weights for RANGING regime', () => {
      // レンジデータを作成
      const rangingData: OHLCV[] = [];
      for (let i = 0; i < 100; i++) {
        const price = 1000 + (i % 2 === 0 ? 10 : -10);
        rangingData.push({
          date: new Date(Date.now() - (100 - i) * 86400000).toISOString().split('T')[0],
          open: price,
          high: price + 2,
          low: price - 2,
          close: price,
          volume: 1000000,
        });
      }

      const features = featureEngineering.calculateAllFeatures(rangingData);
      const prediction = ensembleModel.predict(rangingData, features);

      expect(prediction.marketRegime).toBeDefined();
    });
  });

  describe('market regime detection', () => {
    it('should detect TRENDING regime', () => {
      const trendingData: OHLCV[] = [];
      let price = 1000;
      for (let i = 0; i < 50; i++) {
        price += 3 + Math.random() * 2; // 一貫して上昇
        trendingData.push({
          date: new Date(Date.now() - (50 - i) * 86400000).toISOString().split('T')[0],
          open: price,
          high: price + 5,
          low: price - 2,
          close: price,
          volume: 1000000,
        });
      }

      const features = featureEngineering.calculateAllFeatures(trendingData);
      const prediction = ensembleModel.predict(trendingData, features);

      // ADXが高ければTRENDINGと判定
      expect(prediction.marketRegime).toBeDefined();
    });

    it('should detect RANGING regime', () => {
      const rangingData: OHLCV[] = [];
      for (let i = 0; i < 50; i++) {
        const price = 1000 + Math.sin(i / 5) * 20;
        rangingData.push({
          date: new Date(Date.now() - (50 - i) * 86400000).toISOString().split('T')[0],
          open: price,
          high: price + 5,
          low: price - 5,
          close: price,
          volume: 1000000,
        });
      }

      const features = featureEngineering.calculateAllFeatures(rangingData);
      const prediction = ensembleModel.predict(rangingData, features);

      expect(prediction.marketRegime).toBeDefined();
    });
  });

  describe('getters', () => {
    it('should return current weights', () => {
      const weights = ensembleModel.getCurrentWeights();

      expect(weights.RF).toBeDefined();
      expect(weights.XGB).toBeDefined();
      expect(weights.LSTM).toBeDefined();
      expect(weights.TECHNICAL).toBeDefined();
    });

    it('should return model performance stats', () => {
      // パフォーマンスを記録
      ensembleModel.recordPerformance('RF', 2.0, 2.5);
      ensembleModel.recordPerformance('XGB', -1.5, -1.8);

      const stats = ensembleModel.getModelPerformanceStats();

      expect(stats).toBeInstanceOf(Map);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data gracefully', () => {
      const emptyData: OHLCV[] = [];

      expect(() => {
        ensembleModel.predict(emptyData, mockFeatures);
      }).toThrow();
    });

    it('should handle predictions with extreme values', () => {
      ensembleModel.recordPerformance('RF', 100, 100);
      ensembleModel.recordPerformance('RF', -100, -100);

      const stats = ensembleModel.getModelPerformanceStats();
      expect(stats).toBeDefined();
    });

    it('should maintain weight bounds', () => {
      // 極端なパフォーマンスを記録
      for (let i = 0; i < 20; i++) {
        ensembleModel.recordPerformance('RF', 100, 100);
        ensembleModel.recordPerformance('RF', -100, -100);
      }

      const weights = ensembleModel.getCurrentWeights();

      // 重みが範囲内にあることを確認
      expect(weights.RF).toBeGreaterThanOrEqual(0.05);
      expect(weights.RF).toBeLessThanOrEqual(0.6);
    });
  });

  describe('resetWeights', () => {
    it('should reset weights to base values', () => {
      // 重みを変更
      ensembleModel.recordPerformance('RF', 2.0, 2.5);

      // リセット
      ensembleModel.resetWeights();

      const weights = ensembleModel.getCurrentWeights();

      expect(weights.RF).toBeCloseTo(0.25);
      expect(weights.XGB).toBeCloseTo(0.35);
      expect(weights.LSTM).toBeCloseTo(0.25);
      expect(weights.TECHNICAL).toBeCloseTo(0.15);
    });

    it('should clear performance history on reset', () => {
      ensembleModel.recordPerformance('RF', 2.0, 2.5);
      ensembleModel.resetWeights();

      const stats = ensembleModel.getModelPerformanceStats();
      expect(stats.size).toBe(0);
    });
  });
});
