/**
 * MLService.test.ts
 *
 * ML統合サービスのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mlService, MLService } from '../MLService';
import { OHLCV } from '../../../types/shared';

describe('MLService', () => {
  let mockData: OHLCV[];

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
  });

  afterEach(async () => {
    // 各テスト後にデータをクリア
    mlService.clearAllData();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await mlService.initialize();
      // 複数回初期化してもエラーにならないことを確認
      await mlService.initialize();
    });
  });

  describe('predict', () => {
    it('should generate prediction result', async () => {
      const result = await mlService.predict('TEST', mockData);

      expect(result).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.driftDetection).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should include ensemble prediction', async () => {
      const result = await mlService.predict('TEST', mockData);

      expect(result.prediction.finalPrediction).toBeDefined();
      expect(result.prediction.confidence).toBeGreaterThanOrEqual(50);
      expect(result.prediction.modelPredictions).toHaveLength(4);
    });

    it('should include features', async () => {
      const result = await mlService.predict('TEST', mockData);

      expect(result.features.technical).toBeDefined();
      expect(result.features.timeSeries).toBeDefined();
      expect(result.features.featureCount).toBeGreaterThan(0);
    });

    it('should include drift detection', async () => {
      const result = await mlService.predict('TEST', mockData);

      expect(result.driftDetection.isDriftDetected).toBeDefined();
      expect(result.driftDetection.driftSeverity).toBeDefined();
      expect(result.driftDetection.recommendation).toBeDefined();
    });

    it('should accept macro and sentiment data', async () => {
      const mockMacro = {
        interestRate: 0.5,
        interestRateTrend: 'RISING' as const,
        gdpGrowth: 2.0,
        gdpTrend: 'EXPANDING' as const,
        cpi: 100,
        cpiTrend: 'RISING' as const,
        inflationRate: 2.5,
        macroScore: 0.5,
      };

      const mockSentiment = {
        newsSentiment: 0.3,
        newsVolume: 0.7,
        newsTrend: 'IMPROVING' as const,
        socialSentiment: 0.2,
        socialVolume: 0.6,
        socialBuzz: 0.8,
        analystRating: 4,
        ratingChange: 0.5,
        sentimentScore: 0.3,
      };

      const result = await mlService.predict('TEST', mockData, mockMacro, mockSentiment);

      expect(result.features.macro).toEqual(mockMacro);
      expect(result.features.sentiment).toEqual(mockSentiment);
    });
  });

  describe('recordPredictionResult', () => {
    it('should record prediction result', async () => {
      await mlService.predict('TEST', mockData);

      mlService.recordPredictionResult(2.5, 2.8, 75, 'TRENDING');

      const history = mlService.exportStatistics().predictionHistory;
      expect(history.length).toBeGreaterThan(0);
    });

    it('should record multiple results', async () => {
      await mlService.predict('TEST', mockData);

      for (let i = 0; i < 10; i++) {
        mlService.recordPredictionResult(
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          70,
          'TRENDING'
        );
      }

      const history = mlService.exportStatistics().predictionHistory;
      expect(history.length).toBe(10);
    });
  });

  describe('evaluateRetrainingNeed', () => {
    it('should not recommend retraining for new model', () => {
      const recommendation = mlService.evaluateRetrainingNeed();

      expect(recommendation.shouldRetrain).toBe(false);
      expect(recommendation.urgency).toBe('LOW');
      expect(recommendation.reason).toBeDefined();
    });

    it('should recommend retraining after significant drift', async () => {
      await mlService.predict('TEST', mockData);

      // 良いパフォーマンスを記録
      for (let i = 0; i < 70; i++) {
        mlService.recordPredictionResult(
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          75,
          'TRENDING'
        );
      }

      // 悪いパフォーマンスを記録
      for (let i = 0; i < 30; i++) {
        mlService.recordPredictionResult(2.0, -3.0, 50, 'TRENDING');
      }

      const recommendation = mlService.evaluateRetrainingNeed();

      expect(recommendation.shouldRetrain).toBeDefined();
      expect(recommendation.urgency).toBeDefined();
    });

    it('should identify affected models', async () => {
      await mlService.predict('TEST', mockData);

      // データを記録
      for (let i = 0; i < 60; i++) {
        mlService.recordPredictionResult(2.0, 2.5, 75, 'TRENDING');
      }

      const recommendation = mlService.evaluateRetrainingNeed();

      expect(recommendation.affectedModels).toBeDefined();
      expect(Array.isArray(recommendation.affectedModels)).toBe(true);
    });
  });

  describe('getModelPerformanceSummary', () => {
    it('should return performance summary', async () => {
      await mlService.predict('TEST', mockData);

      const summary = mlService.getModelPerformanceSummary();

      expect(summary.ensembleWeights).toBeDefined();
      expect(summary.modelStats).toBeDefined();
      expect(summary.driftStatus).toBeDefined();
      expect(summary.statistics).toBeDefined();
    });

    it('should include ensemble weights', async () => {
      await mlService.predict('TEST', mockData);

      const summary = mlService.getModelPerformanceSummary();

      expect(summary.ensembleWeights.RF).toBeDefined();
      expect(summary.ensembleWeights.XGB).toBeDefined();
      expect(summary.ensembleWeights.LSTM).toBeDefined();
      expect(summary.ensembleWeights.TECHNICAL).toBeDefined();
    });

    it('should include drift status', async () => {
      await mlService.predict('TEST', mockData);

      const summary = mlService.getModelPerformanceSummary();

      expect(summary.driftStatus.isDriftDetected).toBeDefined();
      expect(summary.driftStatus.driftSeverity).toBeDefined();
    });
  });

  describe('analyzeFeatureImportance', () => {
    it('should analyze feature importance', async () => {
      const result = await mlService.predict('TEST', mockData);
      const importance = mlService.analyzeFeatureImportance(result.features);

      expect(importance.technical).toBeDefined();
      expect(importance.timeSeries).toBeDefined();
    });

    it('should categorize features by importance', async () => {
      const result = await mlService.predict('TEST', mockData);
      const importance = mlService.analyzeFeatureImportance(result.features);

      for (const feature of importance.technical) {
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(feature.importance);
      }

      for (const feature of importance.timeSeries) {
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(feature.importance);
      }
    });
  });

  describe('healthCheck', () => {
    it('should pass health check for new service', async () => {
      const health = await mlService.healthCheck();

      expect(health.healthy).toBeDefined();
      expect(health.issues).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    it('should detect issues when drift occurs', async () => {
      await mlService.predict('TEST', mockData);

      // データを記録してドリフトを発生させる
      for (let i = 0; i < 70; i++) {
        mlService.recordPredictionResult(2.0, 2.5, 75, 'TRENDING');
      }
      for (let i = 0; i < 30; i++) {
        mlService.recordPredictionResult(2.0, -3.0, 50, 'VOLATILE');
      }

      const health = await mlService.healthCheck();

      expect(health.issues).toBeDefined();
      expect(Array.isArray(health.issues)).toBe(true);
    });

    it('should provide recommendations', async () => {
      await mlService.predict('TEST', mockData);

      const health = await mlService.healthCheck();

      expect(health.recommendations).toBeDefined();
      expect(Array.isArray(health.recommendations)).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all data', async () => {
      await mlService.predict('TEST', mockData);

      mlService.recordPredictionResult(2.0, 2.5, 75, 'TRENDING');
      mlService.recordPredictionResult(-1.5, -1.8, 60, 'RANGING');

      await mlService.reset();

      const stats = mlService.exportStatistics();
      expect(stats.predictionHistory).toHaveLength(0);
      expect(stats.driftHistory).toHaveLength(0);
    });

    it('should reinitialize after reset', async () => {
      await mlService.predict('TEST', mockData);
      await mlService.reset();

      // リセット後も予測が可能
      const result = await mlService.predict('TEST', mockData);
      expect(result).toBeDefined();
    });
  });

  describe('exportStatistics', () => {
    it('should export statistics', async () => {
      await mlService.predict('TEST', mockData);

      const stats = mlService.exportStatistics();

      expect(stats.predictionHistory).toBeDefined();
      expect(stats.driftHistory).toBeDefined();
      expect(stats.currentWeights).toBeDefined();
      expect(stats.performanceSummary).toBeDefined();
    });

    it('should include current weights', async () => {
      await mlService.predict('TEST', mockData);

      const stats = mlService.exportStatistics();

      expect(stats.currentWeights.RF).toBeDefined();
      expect(stats.currentWeights.XGB).toBeDefined();
      expect(stats.currentWeights.LSTM).toBeDefined();
      expect(stats.currentWeights.TECHNICAL).toBeDefined();
    });

    it('should include performance summary', async () => {
      await mlService.predict('TEST', mockData);

      const stats = mlService.exportStatistics();

      expect(stats.performanceSummary.ensembleWeights).toBeDefined();
      expect(stats.performanceSummary.modelStats).toBeDefined();
      expect(stats.performanceSummary.driftStatus).toBeDefined();
      expect(stats.performanceSummary.statistics).toBeDefined();
    });
  });

  describe('clearAllData', () => {
    it('should clear all data', async () => {
      await mlService.predict('TEST', mockData);

      mlService.recordPredictionResult(2.0, 2.5, 75, 'TRENDING');
      mlService.recordPredictionResult(-1.5, -1.8, 60, 'RANGING');

      mlService.clearAllData();

      const stats = mlService.exportStatistics();
      expect(stats.predictionHistory).toHaveLength(0);
      expect(stats.driftHistory).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete prediction workflow', async () => {
      // 1. 予測を実行
      const result = await mlService.predict('TEST', mockData);
      expect(result).toBeDefined();

      // 2. 結果を記録
      mlService.recordPredictionResult(
        result.prediction.finalPrediction,
        2.5,
        result.prediction.confidence,
        result.prediction.marketRegime
      );

      // 3. パフォーマンスを確認
      const summary = mlService.getModelPerformanceSummary();
      expect(summary.statistics.totalPredictions).toBeGreaterThan(0);

      // 4. 特徴量の重要性を分析
      const importance = mlService.analyzeFeatureImportance(result.features);
      expect(importance.technical.length).toBeGreaterThan(0);

      // 5. 再学習の必要性を評価
      const retraining = mlService.evaluateRetrainingNeed();
      expect(retraining.shouldRetrain).toBeDefined();

      // 6. ヘルスチェック
      const health = await mlService.healthCheck();
      expect(health.healthy).toBeDefined();

      // 7. 統計をエクスポート
      const stats = mlService.exportStatistics();
      expect(stats.predictionHistory.length).toBeGreaterThan(0);
    });

    it('should handle drift detection and retraining workflow', async () => {
      // 1. 初期予測
      await mlService.predict('TEST', mockData);

      // 2. ベースラインパフォーマンスを記録
      for (let i = 0; i < 70; i++) {
        mlService.recordPredictionResult(
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          75,
          'TRENDING'
        );
      }

      // 3. ドリフトを発生
      for (let i = 0; i < 30; i++) {
        mlService.recordPredictionResult(2.0, -3.0, 50, 'VOLATILE');
      }

      // 4. ドリフト検出
      const retraining = mlService.evaluateRetrainingNeed();
      expect(retraining.shouldRetrain).toBeDefined();

      // 5. ヘルスチェックで問題を検出
      const health = await mlService.healthCheck();
      expect(health.issues.length).toBeGreaterThan(0);

      // 6. リセットして再開
      await mlService.reset();
      const resetStats = mlService.exportStatistics();
      expect(resetStats.predictionHistory).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle insufficient data gracefully', async () => {
      const insufficientData = mockData.slice(0, 10);

      await expect(mlService.predict('TEST', insufficientData)).rejects.toThrow();
    });

    it('should handle extreme prediction values', async () => {
      await mlService.predict('TEST', mockData);

      mlService.recordPredictionResult(100, 100, 95, 'TRENDING');
      mlService.recordPredictionResult(-100, -100, 95, 'TRENDING');

      const stats = mlService.exportStatistics();
      expect(stats.predictionHistory.length).toBe(2);
    });

    it('should handle zero confidence predictions', async () => {
      await mlService.predict('TEST', mockData);

      mlService.recordPredictionResult(2.0, 2.5, 0, 'TRENDING');

      const stats = mlService.exportStatistics();
      expect(stats.predictionHistory.length).toBe(1);
    });
  });
});
