/**
 * ConsensusSignalService.test.ts
 * 
 * コンセンサスシグナルサービスのテスト
 * 複数のテクニカル指標を組み合わせたシグナル生成のテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { consensusSignalService } from '../ConsensusSignalService';
import type { OHLCV } from '@/app/types';

describe('ConsensusSignalService', () => {
  const mockData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
    open: 100 + i * 0.5,
    high: 105 + i * 0.5,
    low: 95 + i * 0.5,
    close: 102 + i * 0.5,
    volume: 1000 + i * 10,
    date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
    symbol: 'AAPL',
  }));

  describe('シグナル生成', () => {
    it('コンセンサスシグナルを生成できる', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.type);
      expect(signal.probability).toBeGreaterThanOrEqual(0);
      expect(signal.probability).toBeLessThanOrEqual(1);
      expect(['WEAK', 'MODERATE', 'STRONG']).toContain(signal.strength);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
    });

    it('BUYシグナルを正しく生成する', () => {
      // 上昇トレンドのデータを生成
      const uptrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(uptrendData);

      expect(signal.type).toBe('BUY');
      expect(signal.probability).toBeGreaterThan(0.5);
    });

    it('SELLシグナルを正しく生成する', () => {
      // 下降トレンドのデータを生成
      const downtrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 - i,
        high: 105 - i,
        low: 95 - i,
        close: 102 - i,
        volume: 1000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(downtrendData);

      expect(signal.type).toBe('SELL');
      expect(signal.probability).toBeGreaterThan(0.5);
    });

    it('HOLDシグナルを正しく生成する', () => {
      // 横ばいのデータを生成
      const sidewaysData: OHLCV[] = Array.from({ length: 50 }, () => ({
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
        date: '2024-01-01',
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(sidewaysData);

      expect(signal.type).toBe('HOLD');
      expect(signal.probability).toBeLessThan(0.6);
    });
  });

  describe('シグナル強度', () => {
    it('強いシグナルを正しく識別する', () => {
      // 強い上昇トレンド
      const strongUptrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 + i * 2,
        high: 105 + i * 2,
        low: 95 + i * 2,
        close: 102 + i * 2,
        volume: 1000 + i * 100,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(strongUptrendData);

      expect(signal.strength).toBe('STRONG');
    });

    it('中程度のシグナルを正しく識別する', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(['MODERATE', 'WEAK']).toContain(signal.strength);
    });

    it('弱いシグナルを正しく識別する', () => {
      // 弱いトレンド
      const weakTrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 + i * 0.1,
        high: 105 + i * 0.1,
        low: 95 + i * 0.1,
        close: 102 + i * 0.1,
        volume: 1000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(weakTrendData);

      expect(signal.strength).toBe('WEAK');
    });
  });

  describe('信頼度', () => {
    it('高信頼度のシグナルを生成する', () => {
      const strongTrendData: OHLCV[] = Array.from({ length: 100 }, (_, i) => ({
        open: 100 + i * 2,
        high: 105 + i * 2,
        low: 95 + i * 2,
        close: 102 + i * 2,
        volume: 1000 + i * 100,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(strongTrendData);

      expect(signal.confidence).toBeGreaterThanOrEqual(80);
    });

    it('中程度の信頼度のシグナルを生成する', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal.confidence).toBeGreaterThanOrEqual(50);
      expect(signal.confidence).toBeLessThan(80);
    });

    it('低信頼度のシグナルを生成する', () => {
      const shortData: OHLCV[] = mockData.slice(0, 20);

      const signal = consensusSignalService.generateConsensus(shortData);

      expect(signal.confidence).toBeLessThan(50);
    });
  });

  describe('個別指標シグナル', () => {
    it('RSIシグナルを含める', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal.signals.rsi).toBeDefined();
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(signal.signals.rsi.type);
      expect(signal.signals.rsi.strength).toBeGreaterThanOrEqual(0);
      expect(signal.signals.rsi.strength).toBeLessThanOrEqual(1);
    });

    it('MACDシグナルを含める', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal.signals.macd).toBeDefined();
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(signal.signals.macd.type);
      expect(signal.signals.macd.strength).toBeGreaterThanOrEqual(0);
      expect(signal.signals.macd.strength).toBeLessThanOrEqual(1);
    });

    it('ボリンジャーバンドシグナルを含める', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal.signals.bollinger).toBeDefined();
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(signal.signals.bollinger.type);
      expect(signal.signals.bollinger.strength).toBeGreaterThanOrEqual(0);
      expect(signal.signals.bollinger.strength).toBeLessThanOrEqual(1);
    });
  });

  describe('重み付け', () => {
    it('カスタム重みを使用できる', () => {
      const customWeights = {
        rsi: 0.5,
        macd: 0.3,
        bollinger: 0.2,
      };

      const signal = consensusSignalService.generateConsensus(mockData, customWeights);

      expect(signal).toBeDefined();
      expect(signal.probability).toBeGreaterThanOrEqual(0);
      expect(signal.probability).toBeLessThanOrEqual(1);
    });

    it('重みの合計が1でない場合は正規化する', () => {
      const invalidWeights = {
        rsi: 0.5,
        macd: 0.5,
        bollinger: 0.5,
      };

      const signal = consensusSignalService.generateConsensus(mockData, invalidWeights);

      expect(signal).toBeDefined();
      // 重みが正規化されているため、確率は有効な範囲内にある
      expect(signal.probability).toBeGreaterThanOrEqual(0);
      expect(signal.probability).toBeLessThanOrEqual(1);
    });
  });

  describe('理由の生成', () => {
    it('シグナルの理由を含める', () => {
      const signal = consensusSignalService.generateConsensus(mockData);

      expect(signal.reason).toBeDefined();
      expect(signal.reason.length).toBeGreaterThan(0);
    });

    it('BUYシグナルの理由を適切に生成する', () => {
      const uptrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(uptrendData);

      expect(signal.reason).toBeDefined();
      expect(signal.reason.toLowerCase()).toContain('buy');
    });

    it('SELLシグナルの理由を適切に生成する', () => {
      const downtrendData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
        open: 100 - i,
        high: 105 - i,
        low: 95 - i,
        close: 102 - i,
        volume: 1000,
        date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        symbol: 'AAPL',
      }));

      const signal = consensusSignalService.generateConsensus(downtrendData);

      expect(signal.reason).toBeDefined();
      expect(signal.reason.toLowerCase()).toContain('sell');
    });
  });

  describe('エラーハンドリング', () => {
    it('空のデータを適切に処理する', () => {
      const signal = consensusSignalService.generateConsensus([]);

      expect(signal).toBeDefined();
      expect(signal.type).toBe('HOLD');
      expect(signal.confidence).toBe(0);
    });

    it('不足したデータを適切に処理する', () => {
      const shortData: OHLCV[] = mockData.slice(0, 5);

      const signal = consensusSignalService.generateConsensus(shortData);

      expect(signal).toBeDefined();
      expect(signal.type).toBe('HOLD');
      expect(signal.confidence).toBeLessThan(50);
    });
  });
});
