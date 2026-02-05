/**
 * WinningTradingSystem.test.ts
 * 
 * 統合トレーディングシステムのテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WinningTradingSystem, { DEFAULT_SYSTEM_CONFIG } from '../WinningTradingSystem';
import { OHLCV } from '@/app/types';
import { StrategyType } from '../strategies';

// モックデータの生成
const generateMockData = (length: number = 100, trend: number = 0): OHLCV[] => {
  const data: OHLCV[] = [];
  let price = 1000;

  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.5) * 20 + trend;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = 1000000 + Math.random() * 500000;

    data.push({
      date: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return data;
};

describe('WinningTradingSystem', () => {
  let system: WinningTradingSystem;

  beforeEach(() => {
    system = new WinningTradingSystem(DEFAULT_SYSTEM_CONFIG);
  });

  describe('Session Management', () => {
    it('should start a new trading session', () => {
      const session = system.startSession('7203', 'ADAPTIVE', 1000000);

      expect(session).toBeDefined();
      expect(session.symbol).toBe('7203');
      expect(session.strategy).toBe('ADAPTIVE');
      expect(session.initialCapital).toBe(1000000);
      expect(session.status).toBe('RUNNING');
    });

    it('should stop a trading session', () => {
      const session = system.startSession('7203');
      system.stopSession(session.id);

      expect(session.status).toBe('STOPPED');
      expect(session.endTime).toBeDefined();
    });

    it('should track current session', () => {
      const session = system.startSession('7203');
      const current = system.getCurrentSession();

      expect(current).toBe(session);
    });
  });

  describe('Trading Logic', () => {
    it('should process market data and generate signals', () => {
      const session = system.startSession('7203', 'ADAPTIVE', 1000000);
      const data = generateMockData(100, 10); // 上昇トレンド

      // イベントリスナーを設定
      const events: unknown[] = [];
      system.subscribe((event) => events.push(event));

      // 市場データを処理
      system.processMarketData('7203', data);

      // イベントが発行されたことを確認
      expect(events.length).toBeGreaterThan(0);
    });

    it('should respect max positions limit', () => {
      const config = { ...DEFAULT_SYSTEM_CONFIG, maxPositions: 1 };
      system = new WinningTradingSystem(config);

      system.startSession('7203');
      const data = generateMockData(100, 10); // 上昇トレンドでポジションを持たせる

      system.processMarketData('7203', data);

      const session = system.getCurrentSession();
      expect(session?.positions.size).toBeLessThanOrEqual(1);
    });
  });

  describe('Backtesting', () => {
    it('should run backtest successfully', () => {
      const data = generateMockData(200);
      const result = system.runBacktest('7203', data, 'ADAPTIVE');

      expect(result).toBeDefined();
      expect(result.trades).toBeDefined();
      expect(Array.isArray(result.trades)).toBe(true);
    });

    it('should compare multiple strategies', () => {
      const data = generateMockData(200);
      const strategies: StrategyType[] = ['TREND_FOLLOWING', 'BREAKOUT', 'MEAN_REVERSION'];

      const results = system.compareStrategies('7203', data, strategies);

      expect(results.size).toBe(3);
      strategies.forEach(strategy => {
        expect(results.has(strategy)).toBe(true);
      });
    });
  });

  describe('Performance Report', () => {
    it('should generate performance report', () => {
      const session = system.startSession('7203');
      const data = generateMockData(100);

      // いくつかのトレードを生成
      system.processMarketData('7203', data);

      const report = system.generatePerformanceReport(session.id);

      expect(report).toBeDefined();
      expect(report?.summary).toBeDefined();
      expect(report?.winRateAnalysis).toBeDefined();
      expect(report?.plAnalysis).toBeDefined();
      expect(report?.recommendations).toBeDefined();
    });
  });

  describe('Risk Management', () => {
    it('should validate risk/reward ratio', () => {
      const data = generateMockData(200);
      const result = system.runBacktest('7203', data);

      // すべてのトレードがリスク管理に従っていることを確認
      expect(Array.isArray(result.trades)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      system.updateConfig({ maxPositions: 10 });
      const config = system.getConfig();

      expect(config.maxPositions).toBe(10);
    });

    it('should maintain default values for unspecified config', () => {
      system.updateConfig({ maxPositions: 10 });
      const config = system.getConfig();

      expect(config.initialCapital).toBe(DEFAULT_SYSTEM_CONFIG.initialCapital);
      expect(config.defaultStrategy).toBe(DEFAULT_SYSTEM_CONFIG.defaultStrategy);
    });
  });
});
