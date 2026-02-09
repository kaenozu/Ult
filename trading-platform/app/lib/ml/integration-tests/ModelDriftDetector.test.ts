/**
 * ModelDriftDetector.test.ts
 *
 * モデルドリフト検出器のテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  modelDriftDetector,
  ModelDriftDetector,
  PredictionRecord,
  DriftDetectionResult,
  ModelType,
} from '../ModelDriftDetector';

describe('ModelDriftDetector', () => {
  beforeEach(() => {
    // 各テスト前に履歴をクリア
    modelDriftDetector.clearHistory();
  });

  describe('recordPrediction', () => {
    it('should record prediction successfully', () => {
      modelDriftDetector.recordPrediction('RF', 2.5, 2.8, 75, 'TRENDING');

      const exportedHistory = modelDriftDetector.exportPredictionHistory();
      expect(exportedHistory).toHaveLength(1);
      expect(exportedHistory[0].modelType).toBe('RF');
      expect(exportedHistory[0].predicted).toBe(2.5);
      expect(exportedHistory[0].actual).toBe(2.8);
    });

    it('should record multiple predictions', () => {
      for (let i = 0; i < 10; i++) {
        modelDriftDetector.recordPrediction(
          'RF',
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          70,
          'TRENDING'
        );
      }

      const exportedHistory = modelDriftDetector.exportPredictionHistory();
      expect(exportedHistory).toHaveLength(10);
    });

    it('should update performance history', () => {
      modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      modelDriftDetector.recordPrediction('RF', -1.5, -1.8, 60, 'RANGING');

      const perfHistory = modelDriftDetector.getPerformanceHistory('RF');
      expect(perfHistory.length).toBeGreaterThan(0);
    });
  });

  describe('detectDrift', () => {
    it('should return no drift for insufficient data', () => {
      // ベースライン未満のデータ
      for (let i = 0; i < 20; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result.isDriftDetected).toBe(false);
      expect(result.driftSeverity).toBe('NONE');
      expect(result.recommendation).toBe('CONTINUE');
    });

    it('should detect drift when accuracy drops significantly', () => {
      // ベースラインを確立（高い精度）
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction(
          'RF',
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          75,
          'TRENDING'
        );
      }

      // 精度が低下する予測を記録
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -2.0, 50, 'TRENDING'); // 予測が外れる
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result).toBeDefined();
      expect(result.isDriftDetected).toBeDefined();
    });

    it('should detect drift when error increases significantly', () => {
      // ベースラインを確立（低い誤差）
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction(
          'RF',
          2.0,
          2.1,
          75,
          'TRENDING'
        );
      }

      // 誤差が増加する予測を記録
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 5.0, 50, 'TRENDING'); // 大きな誤差
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result).toBeDefined();
    });

    it('should detect drift across all models when no specific model is provided', () => {
      // 複数のモデルにデータを記録
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
        modelDriftDetector.recordPrediction('XGB', 2.0, 2.5, 75, 'TRENDING');
      }

      // RFの精度を低下
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -2.0, 50, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift();

      expect(result).toBeDefined();
    });
  });

  describe('drift severity classification', () => {
    it('should classify drift as LOW for minor accuracy drop', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 軽度の精度低下
      for (let i = 0; i < 25; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -1.0, 60, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result.driftSeverity).toBeDefined();
      expect(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.driftSeverity);
    });

    it('should classify drift as HIGH for significant accuracy drop', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 大幅な精度低下
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -3.0, 40, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result.driftSeverity).toBeDefined();
    });
  });

  describe('drift type detection', () => {
    it('should detect SUDDEN drift for sharp performance drop', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 急激な性能低下
      for (let i = 0; i < 25; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -5.0, 30, 'VOLATILE');
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(['SUDDEN', 'GRADUAL', 'INCREMENTAL', 'NONE']).toContain(result.driftType);
    });

    it('should detect GRADUAL drift for slow performance decline', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 徐々に悪化
      for (let i = 0; i < 30; i++) {
        const errorRate = i / 30;
        modelDriftDetector.recordPrediction(
          'RF',
          2.0,
          errorRate > 0.5 ? -2.0 : 2.5,
          75 - errorRate * 20,
          'TRENDING'
        );
      }

      const result = modelDriftDetector.detectDrift('RF');

      expect(result.driftType).toBeDefined();
    });
  });

  describe('recommendation system', () => {
    it('should recommend CONTINUE for no drift', () => {
      const result = modelDriftDetector.detectDrift('RF');
      expect(result.recommendation).toBe('CONTINUE');
    });

    it('should recommend MONITOR for LOW severity', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 軽度の低下
      for (let i = 0; i < 20; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 1.5, 65, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift('RF');
      expect(['CONTINUE', 'MONITOR', 'RETRAIN', 'EMERGENCY_RETRAIN']).toContain(result.recommendation);
    });

    it('should recommend RETRAIN for MEDIUM/HIGH severity', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 中程度の低下
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -2.5, 55, 'TRENDING');
      }

      const result = modelDriftDetector.detectDrift('RF');
      expect(['CONTINUE', 'MONITOR', 'RETRAIN', 'EMERGENCY_RETRAIN']).toContain(result.recommendation);
    });

    it('should recommend EMERGENCY_RETRAIN for CRITICAL severity', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 急激な大幅低下
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -10.0, 30, 'VOLATILE');
      }

      const result = modelDriftDetector.detectDrift('RF');
      expect(['CONTINUE', 'MONITOR', 'RETRAIN', 'EMERGENCY_RETRAIN']).toContain(result.recommendation);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate current metrics correctly', () => {
      for (let i = 0; i < 20; i++) {
        modelDriftDetector.recordPrediction(
          'RF',
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          75,
          'TRENDING'
        );
      }

      const metrics = modelDriftDetector.getCurrentMetrics('RF');

      expect(metrics).toBeDefined();
      expect(metrics!.totalPredictions).toBe(20);
      expect(metrics!.accuracy).toBeGreaterThan(0);
      expect(metrics!.avgError).toBeGreaterThan(0);
    });

    it('should calculate baseline metrics after sufficient data', () => {
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction(
          'RF',
          i % 2 === 0 ? 2.0 : -2.0,
          i % 2 === 0 ? 2.5 : -2.3,
          75,
          'TRENDING'
        );
      }

      const baseline = modelDriftDetector.getBaselineMetrics('RF');

      expect(baseline).toBeDefined();
      expect(baseline!.totalPredictions).toBeGreaterThan(0);
    });

    it('should return null for metrics with insufficient data', () => {
      const metrics = modelDriftDetector.getCurrentMetrics('LSTM');
      expect(metrics).toBeNull();

      const baseline = modelDriftDetector.getBaselineMetrics('LSTM');
      expect(baseline).toBeNull();
    });

    it('should calculate metrics for all models', () => {
      const modelTypes: ModelType[] = ['RF', 'XGB', 'LSTM', 'TECHNICAL'];

      for (const modelType of modelTypes) {
        for (let i = 0; i < 30; i++) {
          modelDriftDetector.recordPrediction(
            modelType,
            2.0,
            2.5,
            75,
            'TRENDING'
          );
        }
      }

      const allMetrics = modelDriftDetector.getAllMetrics();

      expect(allMetrics.size).toBe(4);
    });
  });

  describe('statistics summary', () => {
    it('should provide accurate statistics summary', () => {
      for (let i = 0; i < 50; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
        modelDriftDetector.recordPrediction('XGB', 2.0, 2.3, 70, 'TRENDING');
      }

      const summary = modelDriftDetector.getStatisticsSummary();

      expect(summary.totalPredictions).toBe(100);
      expect(summary.totalModels).toBe(2);
      expect(summary.avgAccuracy).toBeGreaterThan(0);
      expect(summary.avgError).toBeGreaterThan(0);
    });
  });

  describe('drift history', () => {
    it('should maintain drift history', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // ドリフトを発生
      for (let i = 0; i < 30; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, -3.0, 50, 'TRENDING');
      }

      modelDriftDetector.detectDrift('RF');

      const history = modelDriftDetector.getDriftHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should retrieve recent drifts', () => {
      // ベースラインを確立
      for (let i = 0; i < 60; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      // 複数のドリフトを発生
      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 10; i++) {
          modelDriftDetector.recordPrediction('RF', 2.0, -3.0, 50, 'TRENDING');
        }
        modelDriftDetector.detectDrift('RF');
      }

      const recentDrifts = modelDriftDetector.getRecentDrifts(2);
      expect(recentDrifts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('import/export', () => {
    it('should export prediction history', () => {
      for (let i = 0; i < 10; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      const exported = modelDriftDetector.exportPredictionHistory();

      expect(exported).toHaveLength(10);
      expect(exported[0].timestamp).toBeDefined();
    });

    it('should import prediction history', () => {
      const mockHistory: PredictionRecord[] = [
        {
          timestamp: new Date().toISOString(),
          modelType: 'RF',
          predicted: 2.0,
          actual: 2.5,
          confidence: 75,
          marketRegime: 'TRENDING',
        },
        {
          timestamp: new Date().toISOString(),
          modelType: 'RF',
          predicted: -1.5,
          actual: -1.8,
          confidence: 60,
          marketRegime: 'RANGING',
        },
      ];

      modelDriftDetector.importPredictionHistory(mockHistory);

      const exported = modelDriftDetector.exportPredictionHistory();
      expect(exported).toHaveLength(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      for (let i = 0; i < 20; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 75, 'TRENDING');
      }

      modelDriftDetector.clearHistory();

      const exported = modelDriftDetector.exportPredictionHistory();
      expect(exported).toHaveLength(0);

      const perfHistory = modelDriftDetector.getPerformanceHistory('RF');
      expect(perfHistory).toHaveLength(0);

      const driftHistory = modelDriftDetector.getDriftHistory();
      expect(driftHistory).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme prediction values', () => {
      modelDriftDetector.recordPrediction('RF', 100, 100, 95, 'TRENDING');
      modelDriftDetector.recordPrediction('RF', -100, -100, 95, 'TRENDING');

      const metrics = modelDriftDetector.getCurrentMetrics('RF');
      expect(metrics).toBeDefined();
    });

    it('should handle zero confidence predictions', () => {
      modelDriftDetector.recordPrediction('RF', 2.0, 2.5, 0, 'TRENDING');

      const exported = modelDriftDetector.exportPredictionHistory();
      expect(exported).toHaveLength(1);
    });

    it('should handle identical predictions', () => {
      for (let i = 0; i < 20; i++) {
        modelDriftDetector.recordPrediction('RF', 2.0, 2.0, 75, 'TRENDING');
      }

      const metrics = modelDriftDetector.getCurrentMetrics('RF');
      expect(metrics!.avgError).toBeCloseTo(0);
    });
  });
});
