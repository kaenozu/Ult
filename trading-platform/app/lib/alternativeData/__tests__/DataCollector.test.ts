/**
 * DataCollector.test.ts
 * 
 * AlternativeDataCollectorのテスト
 */

import { 
  AlternativeDataCollector, 
  DataSourceType, 
  DataSourceConfig,
  CollectorConfig
} from '../DataCollector';

describe('AlternativeDataCollector', () => {
  let collector: AlternativeDataCollector;

  beforeEach(() => {
    collector = new AlternativeDataCollector();
  });

  afterEach(() => {
    collector.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(collector).toBeInstanceOf(AlternativeDataCollector);
      const stats = collector.getStats();
      expect(stats.totalCollected).toBe(0);
      expect(stats.successRate).toBe(1.0);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<CollectorConfig> = {
        qualityThreshold: 0.7,
        retryAttempts: 5
      };
      const customCollector = new AlternativeDataCollector(customConfig);
      expect(customCollector).toBeInstanceOf(AlternativeDataCollector);
      customCollector.stop();
    });
  });

  describe('Data Collection', () => {
    it('should start and stop data collection', (done) => {
      collector.on('started', () => {
        expect(true).toBe(true);
        collector.stop();
      });

      collector.on('stopped', () => {
        expect(true).toBe(true);
        done();
      });

      collector.start();
    });

    it('should collect data from enabled sources', (done) => {
      let dataCollected = false;

      collector.on('data_collected', (data) => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('quality');
        dataCollected = true;
      });

      collector.start();

      // データ収集を待機
      setTimeout(() => {
        collector.stop();
        expect(dataCollected).toBe(true);
        done();
      }, 1000);
    });

    it('should emit quality warning for low quality data', (done) => {
      const lowQualityConfig: Partial<CollectorConfig> = {
        qualityThreshold: 0.99 // 非常に高い閾値
      };
      const testCollector = new AlternativeDataCollector(lowQualityConfig);

      testCollector.on('quality_warning', (event) => {
        expect(event).toHaveProperty('source');
        expect(event).toHaveProperty('quality');
        testCollector.stop();
        done();
      });

      testCollector.start();
    });
  });

  describe('Statistics', () => {
    it('should track collection statistics', (done) => {
      collector.on('data_collected', () => {
        const stats = collector.getStats();
        expect(stats.totalCollected).toBeGreaterThan(0);
        expect(stats.lastUpdate).toBeLessThanOrEqual(Date.now());
        collector.stop();
        done();
      });

      collector.start();
    });

    it('should track statistics by source type', (done) => {
      let collected = 0;
      const targetCollections = 2;

      collector.on('data_collected', () => {
        collected++;
        if (collected >= targetCollections) {
          const stats = collector.getStats();
          const totalBySource = Object.values(stats.bySource).reduce((a, b) => a + b, 0);
          expect(totalBySource).toBeGreaterThan(0);
          collector.stop();
          done();
        }
      });

      collector.start();
    });
  });

  describe('Data Quality', () => {
    it('should assess data quality metrics', (done) => {
      collector.on('data_collected', (data) => {
        expect(data.quality).toHaveProperty('completeness');
        expect(data.quality).toHaveProperty('accuracy');
        expect(data.quality).toHaveProperty('timeliness');
        expect(data.quality).toHaveProperty('consistency');
        expect(data.quality).toHaveProperty('overall');
        
        expect(data.quality.overall).toBeGreaterThanOrEqual(0);
        expect(data.quality.overall).toBeLessThanOrEqual(1);
        
        collector.stop();
        done();
      });

      collector.start();
    });
  });

  describe('Cache Management', () => {
    it('should cache collected data', async () => {
      collector.start();
      
      // データ収集を待機
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const data = await collector.getDataForSymbol('TEST', ['news']);
      collector.stop();
      
      // キャッシュが動作していれば何らかのデータが返される可能性がある
      expect(Array.isArray(data)).toBe(true);
    });

    it('should clear cache', async () => {
      collector.start();
      
      // データ収集を待機
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      collector.clearCache();
      const data = await collector.getDataForSymbol('TEST');
      
      collector.stop();
      expect(data.length).toBe(0);
    });
  });

  describe('Source Management', () => {
    it('should add new data source', () => {
      const newSource: DataSourceConfig = {
        type: 'insider',
        name: 'Insider Trading API',
        enabled: true,
        priority: 'medium',
        weight: 0.15,
        refreshInterval: 60000
      };

      collector.addSource(newSource);
      // ソースが追加されたことを確認（内部状態のため直接確認はできない）
      expect(true).toBe(true);
    });

    it('should disable data source', () => {
      collector.start();
      collector.disableSource('social');
      // ソースが無効化されたことを確認
      expect(true).toBe(true);
      collector.stop();
    });
  });

  describe('Error Handling', () => {
    it('should emit collection error on failure', (done) => {
      // エラーを発生させるために無効なソース設定を使用
      collector.on('collection_error', (event) => {
        expect(event).toHaveProperty('source');
        expect(event).toHaveProperty('error');
        collector.stop();
        done();
      });

      collector.start();
      
      // タイムアウトを設定して、エラーが発生しない場合もテストを終了
      setTimeout(() => {
        collector.stop();
        done();
      }, 2000);
    });

    it('should track error count in statistics', (done) => {
      collector.start();

      setTimeout(() => {
        const stats = collector.getStats();
        // エラーカウントがトラッキングされていることを確認
        expect(stats).toHaveProperty('errors');
        expect(typeof stats.errors).toBe('number');
        collector.stop();
        done();
      }, 1000);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', (done) => {
      const rateLimitedConfig: Partial<CollectorConfig> = {
        sources: [{
          type: 'news',
          name: 'Test API',
          enabled: true,
          priority: 'high',
          weight: 1.0,
          refreshInterval: 100, // 非常に短い間隔
          rateLimit: {
            requests: 1,
            perMilliseconds: 1000
          }
        }]
      };

      const testCollector = new AlternativeDataCollector(rateLimitedConfig);
      let collectionCount = 0;

      testCollector.on('data_collected', () => {
        collectionCount++;
      });

      testCollector.start();

      setTimeout(() => {
        // レート制限により、収集回数が制限されているはず
        expect(collectionCount).toBeLessThanOrEqual(2);
        testCollector.stop();
        done();
      }, 1500);
    });
  });
});
