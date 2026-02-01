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
  calculateStopLoss,
  calculateTakeProfit,
  calculateRiskRewardRatio,
} from '../riskManagement';
import type { OHLCV, PositionSizingMethod, StopLossType } from '@/app/types';

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
    it('固定金額法でポジションサイズを計算する', () => {
      const result = calculatePositionSize({
        method: 'fixed-amount' as PositionSizingMethod,
        accountBalance: 1000000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopLossPrice: 95,
        fixedAmount: 100000,
      });

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(100000);
    });

    it('リスクパーセンテージ法でポジションサイズを計算する', () => {
      const result = calculatePositionSize({
        method: 'risk-percentage' as PositionSizingMethod,
        accountBalance: 1000000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopLossPrice: 95,
      });

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(20000); // 1,000,000 * 0.02
    });

    it('ケリーフォーミュラ法でポジションサイズを計算する', () => {
      const result = calculatePositionSize({
        method: 'kelly' as PositionSizingMethod,
        accountBalance: 1000000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopLossPrice: 95,
        winRate: 0.6,
        avgWin: 10,
        avgLoss: 5,
      });

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('ATRベースでポジションサイズを計算する', () => {
      const atr = getLatestATR(mockData, 14);
      const result = calculatePositionSize({
        method: 'atr-based' as PositionSizingMethod,
        accountBalance: 1000000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        atr: atr || 5,
        atrMultiplier: 2,
      });

      expect(result).toBeDefined();
      expect(result.positionSize).toBeGreaterThan(0);
    });

    it('ゼロ除算を防ぐ', () => {
      const result = calculatePositionSize({
        method: 'risk-percentage' as PositionSizingMethod,
        accountBalance: 1000000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopLossPrice: 100, // エントリー価格と同じ
      });

      expect(result).toBeDefined();
      expect(result.positionSize).toBe(0);
    });
  });

  describe('calculateStopLoss', () => {
    it('固定価格でストップロスを計算する', () => {
      const stopLoss = calculateStopLoss({
        type: 'fixed' as StopLossType,
        entryPrice: 100,
        fixedPrice: 95,
      });

      expect(stopLoss).toBe(95);
    });

    it('パーセンテージベースでストップロスを計算する', () => {
      const stopLoss = calculateStopLoss({
        type: 'percentage' as StopLossType,
        entryPrice: 100,
        percentage: 0.05,
      });

      expect(stopLoss).toBe(95); // 100 * (1 - 0.05)
    });

    it('ATRベースでストップロスを計算する', () => {
      const atr = getLatestATR(mockData, 14);
      const stopLoss = calculateStopLoss({
        type: 'atr' as StopLossType,
        entryPrice: 100,
        atr: atr || 5,
        atrMultiplier: 2,
      });

      expect(stopLoss).toBeDefined();
      expect(stopLoss).toBeLessThan(100);
    });

    it('サポートラインベースでストップロスを計算する', () => {
      const stopLoss = calculateStopLoss({
        type: 'support' as StopLossType,
        entryPrice: 100,
        supportLevel: 95,
      });

      expect(stopLoss).toBe(95);
    });

    it('ロングポジションでストップロスがエントリー価格より低い', () => {
      const stopLoss = calculateStopLoss({
        type: 'percentage' as StopLossType,
        entryPrice: 100,
        percentage: 0.05,
        isLong: true,
      });

      expect(stopLoss).toBeLessThan(100);
    });

    it('ショートポジションでストップロスがエントリー価格より高い', () => {
      const stopLoss = calculateStopLoss({
        type: 'percentage' as StopLossType,
        entryPrice: 100,
        percentage: 0.05,
        isLong: false,
      });

      expect(stopLoss).toBeGreaterThan(100);
    });
  });

  describe('calculateTakeProfit', () => {
    it('固定価格で利益確定を計算する', () => {
      const takeProfit = calculateTakeProfit({
        type: 'fixed',
        entryPrice: 100,
        fixedPrice: 110,
      });

      expect(takeProfit).toBe(110);
    });

    it('パーセンテージベースで利益確定を計算する', () => {
      const takeProfit = calculateTakeProfit({
        type: 'percentage',
        entryPrice: 100,
        percentage: 0.10,
      });

      expect(takeProfit).toBe(110); // 100 * (1 + 0.10)
    });

    it('リスク報酬比ベースで利益確定を計算する', () => {
      const takeProfit = calculateTakeProfit({
        type: 'risk-reward',
        entryPrice: 100,
        stopLossPrice: 95,
        riskRewardRatio: 2,
      });

      expect(takeProfit).toBe(110); // 100 + (100 - 95) * 2
    });

    it('ロングポジションで利益確定がエントリー価格より高い', () => {
      const takeProfit = calculateTakeProfit({
        type: 'percentage',
        entryPrice: 100,
        percentage: 0.10,
        isLong: true,
      });

      expect(takeProfit).toBeGreaterThan(100);
    });

    it('ショートポジションで利益確定がエントリー価格より低い', () => {
      const takeProfit = calculateTakeProfit({
        type: 'percentage',
        entryPrice: 100,
        percentage: 0.10,
        isLong: false,
      });

      expect(takeProfit).toBeLessThan(100);
    });
  });

  describe('calculateRiskRewardRatio', () => {
    it('リスク報酬比を正しく計算する', () => {
      const ratio = calculateRiskRewardRatio(100, 95, 110);

      expect(ratio).toBe(2); // (110 - 100) / (100 - 95)
    });

    it('リスクがゼロの場合はinfinityを返す', () => {
      const ratio = calculateRiskRewardRatio(100, 100, 110);

      expect(ratio).toBe(Infinity);
    });

    it('負のリスク報酬比を計算する', () => {
      const ratio = calculateRiskRewardRatio(100, 105, 95);

      expect(ratio).toBeLessThan(0);
    });

    it('等しいリスクと報酬で1を返す', () => {
      const ratio = calculateRiskRewardRatio(100, 95, 105);

      expect(ratio).toBe(1);
    });
  });
});
