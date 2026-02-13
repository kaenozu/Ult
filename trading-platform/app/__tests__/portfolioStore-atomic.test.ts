/**
 * tradingStore-atomic.test.ts
 * 
 * tradingStoreのアトミック注文実行機能のテスト
 * 競合状態（Race Condition）の防止を検証
 *
 * 注意: このテストはexecuteOrderを使用してアトミック注文実行を検証
 */

import { usePortfolioStore } from '../store/portfolioStore';
import { act, renderHook } from '@testing-library/react';
import { OrderRequest, OrderResult } from '../types/order';

// リスク管理サービスをモック化して、テストの純粋性を保つ
jest.mock('../lib/services/RiskManagementService', () => ({
  getRiskManagementService: jest.fn(() => ({
    validateOrder: jest.fn((_order) => ({
      allowed: true,
      reasons: [],
      violations: [],
      // adjustedQuantityを含めないことで、自動リサイズを防ぐ
    })),
  })),
}));

describe('TradingStore Atomic Order Execution', () => {
  beforeEach(() => {
    // ストアの状態を完全リセット
    act(() => {
      usePortfolioStore.setState({
        portfolio: {
          positions: [],
          orders: [],
          totalValue: 0,
          totalProfit: 0,
          dailyPnL: 0,
          cash: 1000000,
        }
      });
    });
  });

  describe('executeOrder', () => {
    it('should execute buy order atomically', () => {
      const { result } = renderHook(() => usePortfolioStore());
      
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 150,
        orderType: 'MARKET',
      };

      let executionResult: OrderResult | undefined = undefined;

      act(() => {
        executionResult = result.current.executeOrder(order);
      });

      // 注文が成功したことを確認
      expect(executionResult?.success).toBe(true);

      // ポジションが追加されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(1);
      expect(result.current.portfolio.positions[0].symbol).toBe('AAPL');
      expect(result.current.portfolio.positions[0].quantity).toBe(10);
      
      // 現金が正しく減少したことを確認
      const expectedCash = 1000000 - (150 * 10);
      expect(result.current.portfolio.cash).toBe(expectedCash);
    });

    it('should reject order with insufficient funds', () => {
      const { result } = renderHook(() => usePortfolioStore());
      
      const order: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10000, // 十分な資金がない数量
        price: 150,
        orderType: 'MARKET',
      };

      let executionResult: OrderResult | undefined = undefined;

      act(() => {
        executionResult = result.current.executeOrder(order);
      });

      // 注文が拒否されたことを確認
      expect(executionResult?.success).toBe(false);
      expect(executionResult?.error).toContain('Insufficient Funds');

      // ポジションが追加されていないことを確認
      expect(result.current.portfolio.positions).toHaveLength(0);
      
      // 現金が変わっていないことを確認
      expect(result.current.portfolio.cash).toBe(1000000);
    });

    it('should handle concurrent orders atomically', () => {
      const { result } = renderHook(() => usePortfolioStore());
      
      // 同時に複数の注文を実行
      const orders: OrderRequest[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'usa',
          side: 'LONG',
          quantity: 100,
          price: 100,
          orderType: 'MARKET',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          market: 'usa',
          side: 'LONG',
          quantity: 100,
          price: 200,
          orderType: 'MARKET',
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          market: 'usa',
          side: 'LONG',
          quantity: 100,
          price: 300,
          orderType: 'MARKET',
        },
      ];

      // 同時に注文を実行
      const results: OrderResult[] = [];

      act(() => {
        orders.forEach(order => {
          results.push(result.current.executeOrder(order));
        });
      });

      // すべての注文が成功したことを確認
      expect(results.every(r => r.success)).toBe(true);

      // ポジションが3つ追加されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(3);
      
      // 現金が正しく減少したことを確認
      const totalCost = (100 * 100) + (100 * 200) + (100 * 300);
      const expectedCash = 1000000 - totalCost;
      expect(result.current.portfolio.cash).toBe(expectedCash);
    });

    it('should prevent double spending with concurrent orders', () => {
      const { result } = renderHook(() => usePortfolioStore());
      
      // 残高を超える注文を同時に実行
      const orders: OrderRequest[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          market: 'usa',
          side: 'LONG',
          quantity: 6000, // 6000 * 100 = 600,000
          price: 100,
          orderType: 'MARKET',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          market: 'usa',
          side: 'LONG',
          quantity: 6000, // 6000 * 100 = 600,000
          price: 100,
          orderType: 'MARKET',
        },
      ];

      // 合計で1,200,000必要だが、残高は1,000,000

      const results: OrderResult[] = [];

      act(() => {
        orders.forEach(order => {
          results.push(result.current.executeOrder(order));
        });
      });

      // 最大1つだけ成功するはず
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeLessThanOrEqual(1);
      
      // 現金がマイナスになっていないことを確認
      expect(result.current.portfolio.cash).toBeGreaterThanOrEqual(0);
    });

    it('should average existing position when adding to same side', () => {
      const { result } = renderHook(() => usePortfolioStore());
      
      // 最初の注文
      const order1: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 100,
        orderType: 'MARKET',
      };

      act(() => {
        result.current.executeOrder(order1);
      });

      // 同じ銘柄への追加注文
      const order2: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 10,
        price: 150,
        orderType: 'MARKET',
      };

      act(() => {
        result.current.executeOrder(order2);
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
      const { result } = renderHook(() => usePortfolioStore());
      
      // 複数の注文と決済を実行
      const order1: OrderRequest = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        market: 'usa',
        side: 'LONG',
        quantity: 100,
        price: 100,
        orderType: 'MARKET',
      };

      act(() => {
        result.current.executeOrder(order1);
      });

      const position = result.current.portfolio.positions[0];
      const positionValue = position.avgPrice * position.quantity;

      // ポジションを決済
      act(() => {
        result.current.closePosition('AAPL', 150);
      });

      // 決済後の現金を確認
      // 初期現金 - ポジション価値 + 売却額（元本 + 利益）
      // 1,000,000 - 10,000 + 15,000 = 1,005,000
      const expectedCash = 1000000 - positionValue + (150 * 100);
      expect(result.current.portfolio.cash).toBe(expectedCash);
      
      // ポジションが削除されたことを確認
      expect(result.current.portfolio.positions).toHaveLength(0);
    });
  });
});
