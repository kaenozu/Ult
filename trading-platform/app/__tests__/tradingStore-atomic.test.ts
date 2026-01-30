/**
 * tradingStore-atomic.test.ts
 * 
 * tradingStoreのアトミック注文実行機能のテスト
 * 競合状態（Race Condition）の防止を検証
 */

import { useTradingStore, OrderExecutionResult } from '../store/tradingStore';
import { act, renderHook } from '@testing-library/react';

describe('TradingStore Atomic Order Execution', () => {
  beforeEach(() => {
    // ストアの状態をリセット
    const { result } = renderHook(() => useTradingStore());
    act(() => {
      result.current.setCash(1000000); // 初期資金設定
    });
  });

  describe('executeOrderAtomic', () => {
    it('should execute buy order atomically', () => {
      const { result } = renderHook(() => useTradingStore());
      
      const order = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 10,
        price: 150,
        type: 'MARKET' as const,
      };

      act(() => {
        result.current.executeOrderAtomic(order);
      });

      // ポジションが追加されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(1);
      expect(result.current.portfolio.positions[0].symbol).toBe('AAPL');
      expect(result.current.portfolio.positions[0].quantity).toBe(10);
      
      // 現金が正しく減少したことを確認
      const expectedCash = 1000000 - (150 * 10);
      expect(result.current.portfolio.cash).toBe(expectedCash);
    });

    it('should reject order with insufficient funds', () => {
      const { result } = renderHook(() => useTradingStore());
      
      // Set up a scenario where we're not in a concurrent execution state
      act(() => {
        result.current.setCash(1000); // Low cash to trigger INSUFFICIENT_FUNDS
      });
      
      const order = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 100, // Large quantity to exceed cash
        price: 50,
        type: 'MARKET' as const,
      };

      act(() => {
        const executionResult = result.current.executeOrderAtomic(order);
        // 結果が失敗であることを確認
        expect(executionResult.success).toBe(false);
        expect(executionResult.errorCode).toBe('INSUFFICIENT_FUNDS');
      });

      // ポジションが追加されていないことを確認（資金不足で注文は実行されない）
      expect(result.current.portfolio.positions).toHaveLength(0);
      
      // 現金が変わっていないことを確認
      expect(result.current.portfolio.cash).toBe(1000);
    });

    it('should handle concurrent orders atomically', async () => {
      const { result } = renderHook(() => useTradingStore());
      
      // 同時に複数の注文を実行
      const orders = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'usa' as const,
          side: 'LONG' as const,
          quantity: 100,
          price: 100,
          type: 'MARKET' as const,
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          market: 'usa' as const,
          side: 'LONG' as const,
          quantity: 100,
          price: 200,
          type: 'MARKET' as const,
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          market: 'usa' as const,
          side: 'LONG' as const,
          quantity: 100,
          price: 300,
          type: 'MARKET' as const,
        },
      ];

      // 同時に注文を実行
      act(() => {
        orders.forEach(order => {
          result.current.executeOrderAtomic(order);
        });
      });

      // ポジションが3つ追加されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(3);
      
      // 現金が正しく減少したことを確認
      const totalCost = (100 * 100) + (100 * 200) + (100 * 300);
      const expectedCash = 1000000 - totalCost;
      expect(result.current.portfolio.cash).toBe(expectedCash);
    });

    it('should prevent double spending with concurrent orders', () => {
      const { result } = renderHook(() => useTradingStore());
      
      // 残高を超える注文を同時に実行
      const orders = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'usa' as const,
          side: 'LONG' as const,
          quantity: 6000, // 6000 * 100 = 600,000
          price: 100,
          type: 'MARKET' as const,
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          market: 'usa' as const,
          side: 'LONG' as const,
          quantity: 6000, // 6000 * 100 = 600,000
          price: 100,
          type: 'MARKET' as const,
        },
      ];

      // 合計で1,200,000必要だが、残高は1,000,000

      act(() => {
        orders.forEach(order => {
          result.current.executeOrderAtomic(order);
        });
      });

      // 最大1つだけ成功するはず（ポジションが1つ以下）
      expect(result.current.portfolio.positions.length).toBeLessThanOrEqual(1);
      
      // 現金がマイナスになっていないことを確認
      expect(result.current.portfolio.cash).toBeGreaterThanOrEqual(0);
    });

    it('should average existing position when adding to same side', () => {
      const { result } = renderHook(() => useTradingStore());
      
      // 最初の注文
      const order1 = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 10,
        price: 100,
        type: 'MARKET' as const,
      };

      act(() => {
        result.current.executeOrderAtomic(order1);
      });

      // 同じ銘柄への追加注文
      const order2 = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 10,
        price: 150,
        type: 'MARKET' as const,
      };

      act(() => {
        result.current.executeOrderAtomic(order2);
      });

      // ポジションが1つだけであることを確認
      expect(result.current.portfolio.positions).toHaveLength(1);
      
      // 数量が合算されていることを確認
      expect(result.current.portfolio.positions[0].quantity).toBe(20);
      
      // 平均取得価格が正しく計算されていることを確認
      // (10 * 100 + 10 * 150) / 20 = 125
      expect(result.current.portfolio.positions[0].avgPrice).toBe(125);
    });

    it('should maintain data consistency after multiple operations', () => {
      const { result } = renderHook(() => useTradingStore());
      
      // 複数の注文と決済を実行
      const order1 = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 100,
        price: 100,
        type: 'MARKET' as const,
      };

      act(() => {
        result.current.executeOrderAtomic(order1);
      });

      const initialCash = result.current.portfolio.cash;
      const position = result.current.portfolio.positions[0];
      const positionValue = position.avgPrice * position.quantity;

      // ポジションを決済
      act(() => {
        result.current.closePosition('AAPL', 150);
      });

      // 決済後の現金を確認
      // 初期現金 - ポジション価値 + 利益
      // 1,000,000 - 10,000 + (150 - 100) * 100 = 1,000,000 - 10,000 + 5,000 = 995,000
      const expectedCash = 1000000 - positionValue + (150 - 100) * 100;
      expect(result.current.portfolio.cash).toBe(expectedCash);
      
      // ポジションが削除されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(0);
      
      // ジャーナルに決済記録が追加されたことを確認
      const closedEntry = result.current.journal.find(j => j.symbol === 'AAPL' && j.status === 'CLOSED');
      expect(closedEntry).toBeDefined();
      expect(closedEntry?.profit).toBe(5000); // (150 - 100) * 100
    });
    
    it('should return proper error codes for invalid orders', () => {
      const { result } = renderHook(() => useTradingStore());
      
      // Set up a scenario where we're not in a concurrent execution state
      act(() => {
        result.current.setCash(1000000);
      });
      
      const invalidOrder = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: -10, // Invalid quantity
        price: 100,
        type: 'MARKET' as const,
      };

      act(() => {
        const resultObj = result.current.executeOrderAtomic(invalidOrder);
        expect(resultObj.success).toBe(false);
        expect(resultObj.errorCode).toBe('INVALID_ORDER');
        expect(resultObj.error).toContain('Quantity must be greater than 0');
      });
    });
    
    it('should return proper error codes for insufficient funds', () => {
      const { result } = renderHook(() => useTradingStore());
      
      const expensiveOrder = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa' as const,
        side: 'LONG' as const,
        quantity: 100000, // Way too much for initial balance
        price: 100,
        type: 'MARKET' as const,
      };

      act(() => {
        const resultObj = result.current.executeOrderAtomic(expensiveOrder);
        expect(resultObj.success).toBe(false);
        expect(resultObj.errorCode).toBe('INSUFFICIENT_FUNDS');
        expect(resultObj.error).toContain('Insufficient funds');
      });
    });
  });
});
