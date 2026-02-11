/**
 * riskManagement.test.ts
 * 
 * リスク管理機能のテスト
 * ATR計算、ポジションサイジング、ストップロス計算のテスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateATR,
  getLatestATR,
  calculatePositionSize,
  calculateStopLossPrice,
  calculateTakeProfitPrice,
  DEFAULT_RISK_SETTINGS,
} from '../riskManagement';
import type { OHLCV, RiskManagementSettings } from '@/app/types';

describe('riskManagement', () => {
  const mockData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
    open: 100 + i * 0.5,
    high: 105 + i * 0.5,
    low: 95 + i * 0.5,
    close: 102 + i * 0.5,
    volume: 1000 + i * 10,
    date: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
    symbol: 'AAPL',
  }));

  const defaultSettings: RiskManagementSettings = DEFAULT_RISK_SETTINGS;

  describe('calculateATR', () => {
    it('ATRを正しく計算する', () => {
      const atr = calculateATR(mockData, 14);

      expect(atr).toBeDefined();
      expect(atr.length).toBeGreaterThan(0);
      expect(atr[0]).toBeGreaterThan(0);
    });

    it('デフォルト期間14を使用する', () => {
      const atr = calculateATR(mockData);

      expect(atr).toBeDefined();
      expect(atr.length).toBe(mockData.length - 14);
    });

    it('カスタム期間を使用する', () => {
      const atr = calculateATR(mockData, 7);

      expect(atr).toBeDefined();
      expect(atr.length).toBe(mockData.length - 7);
    });

    it('データが不足している場合は空配列を返す', () => {
      const shortData: OHLCV[] = mockData.slice(0, 10);
      const atr = calculateATR(shortData, 14);

      expect(atr).toEqual([]);
    });

    it('ATR値は正の数である', () => {
      const atr = calculateATR(mockData, 14);

      atr.forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('getLatestATR', () => {
    it('最新のATR値を取得する', () => {
      const latestATR = getLatestATR(mockData, 14);

      expect(latestATR).toBeDefined();
      expect(latestATR).toBeGreaterThan(0);
    });

    it('データが不足している場合はundefinedを返す', () => {
      const shortData: OHLCV[] = mockData.slice(0, 10);
      const latestATR = getLatestATR(shortData, 14);

      expect(latestATR).toBeUndefined();
    });

    it('計算されたATRの最後の値と一致する', () => {
      const atr = calculateATR(mockData, 14);
      const latestATR = getLatestATR(mockData, 14);

      expect(latestATR).toBe(atr[atr.length - 1]);
    });
  });

  describe('calculatePositionSize', () => {
    it('固定比率法でポジションサイズを計算する', () => {
      const settings: RiskManagementSettings = {
        ...defaultSettings,
        sizingMethod: 'fixed_ratio',
        fixedRatio: 0.1,
      };
      const result = calculatePositionSize(1000000, 100, 95, 110, settings);

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(5);
    });

    it('ケリー基準法でポジションサイズを計算する', () => {
      const settings: RiskManagementSettings = {
        ...defaultSettings,
        sizingMethod: 'kelly_criterion',
        kellyFraction: 0.25,
      };
      const result = calculatePositionSize(1000000, 100, 95, 110, settings);

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('ATRベースでポジションサイズを計算する', () => {
      const atr = getLatestATR(mockData, 14);
      const settings: RiskManagementSettings = {
        ...defaultSettings,
        sizingMethod: 'volatility_based',
        atrMultiplier: 2,
      };
      const result = calculatePositionSize(1000000, 100, 95, 110, settings, atr || 5);

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('ゼロリスクでも最小サイズを返す', () => {
      const result = calculatePositionSize(1000000, 100, 100, 110, defaultSettings);

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateStopLossPrice', () => {
    it('パーセンテージベースでストップロスを計算する（LONG）', () => {
      const config = {
        enabled: true,
        type: 'percentage' as const,
        value: 5,
        trailing: false,
      };
      const stopLoss = calculateStopLossPrice(100, 'LONG', config);

      expect(stopLoss).toBe(95);
    });

    it('パーセンテージベースでストップロスを計算する（SHORT）', () => {
      const config = {
        enabled: true,
        type: 'percentage' as const,
        value: 5,
        trailing: false,
      };
      const stopLoss = calculateStopLossPrice(100, 'SHORT', config);

      expect(stopLoss).toBe(105);
    });

    it('ATRベースでストップロスを計算する', () => {
      const config = {
        enabled: true,
        type: 'atr' as const,
        value: 2,
        trailing: false,
      };
      const stopLoss = calculateStopLossPrice(100, 'LONG', config, 5);

      expect(stopLoss).toBe(90);
    });

    it('無効な場合はエントリー価格を返す', () => {
      const config = {
        enabled: false,
        type: 'percentage' as const,
        value: 5,
        trailing: false,
      };
      const stopLoss = calculateStopLossPrice(100, 'LONG', config);

      expect(stopLoss).toBe(100);
    });
  });

  describe('calculateTakeProfitPrice', () => {
    it('パーセンテージベースで利益確定を計算する（LONG）', () => {
      const config = {
        enabled: true,
        type: 'percentage' as const,
        value: 10,
        partials: false,
      };
      const takeProfit = calculateTakeProfitPrice(100, 'LONG', 95, config);

      expect(takeProfit).toBeCloseTo(110, 1);
    });

    it('パーセンテージベースで利益確定を計算する（SHORT）', () => {
      const config = {
        enabled: true,
        type: 'percentage' as const,
        value: 10,
        partials: false,
      };
      const takeProfit = calculateTakeProfitPrice(100, 'SHORT', 105, config);

      expect(takeProfit).toBe(90);
    });

    it('リスク報酬比ベースで利益確定を計算する', () => {
      const config = {
        enabled: true,
        type: 'risk_reward_ratio' as const,
        value: 2,
        partials: false,
      };
      const takeProfit = calculateTakeProfitPrice(100, 'LONG', 95, config);

      expect(takeProfit).toBe(110);
    });

    it('無効な場合はエントリー価格を返す', () => {
      const config = {
        enabled: false,
        type: 'percentage' as const,
        value: 10,
        partials: false,
      };
      const takeProfit = calculateTakeProfitPrice(100, 'LONG', 95, config);

      expect(takeProfit).toBe(100);
    });
  });
});
