/**
 * 注文処理のアトミック性と競合状態のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTradingStore } from '../store/tradingStore';
import { OrderRequest } from '../types/order';

describe('Order Execution - Atomic Operations', () => {
  beforeEach(() => {
    // テスト前にストアをリセット
    const { setCash, updatePortfolio } = useTradingStore.getState();
    setCash(1000000); // 1,000,000円の初期資金
    updatePortfolio([]);
  });

  describe('executeOrderAtomicV2', () => {
    it('LONG注文を正しく実行する', () => {
      const { executeOrderAtomicV2, portfolio } = useTradingStore.getState();
      
      const order: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };

      const result = executeOrderAtomicV2(order);

      // 注文が成功したことを確認
      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.remainingCash).toBe(800000); // 1,000,000 - (100 * 2000)
      expect(result.newPosition).toBeDefined();
      
      // ポジションが追加されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(1);
      expect(newPortfolio.positions[0].symbol).toBe('7203');
      expect(newPortfolio.positions[0].quantity).toBe(100);
      expect(newPortfolio.positions[0].avgPrice).toBe(2000);
    });

    it('SHORT注文を正しく実行する', () => {
      const { executeOrderAtomicV2, portfolio } = useTradingStore.getState();
      
      const order: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'SHORT',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };

      const result = executeOrderAtomicV2(order);

      // 注文が成功したことを確認
      expect(result.success).toBe(true);
      expect(result.remainingCash).toBe(1200000); // 1,000,000 + (100 * 2000)
      
      // ポジションが追加されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions[0].side).toBe('SHORT');
    });

    it('資金不足の場合に注文を拒否する', () => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      const order: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 1000,
        price: 2000,
        orderType: 'MARKET',
      };

      const result = executeOrderAtomicV2(order);

      // 注文が失敗したことを確認
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient funds');
      
      // ポジションが追加されていないことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(0);
      expect(newPortfolio.cash).toBe(1000000); // 資金が変わっていない
    });

    it('既存のポジションを正しく更新する', () => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      // 最初の注文
      const order1: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };
      executeOrderAtomicV2(order1);

      // 追加の注文
      const order2: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2100,
        orderType: 'MARKET',
      };
      const result = executeOrderAtomicV2(order2);

      // 注文が成功したことを確認
      expect(result.success).toBe(true);
      
      // ポジションが更新されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(1);
      expect(newPortfolio.positions[0].quantity).toBe(200);
      expect(newPortfolio.positions[0].avgPrice).toBe(2050); // (100*2000 + 100*2100) / 200
    });

    it('注文履歴を正しく記録する', () => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      const order: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };
      const result = executeOrderAtomicV2(order);

      // 注文が成功したことを確認
      expect(result.success).toBe(true);
      
      // 注文履歴が記録されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.orders.length).toBe(1);
      expect(newPortfolio.orders[0].id).toBe(result.orderId);
      expect(newPortfolio.orders[0].symbol).toBe('7203');
      expect(newPortfolio.orders[0].status).toBe('FILLED');
    });
  });

  describe('closePosition', () => {
    beforeEach(() => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      // ポジションを作成
      const order: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };
      executeOrderAtomicV2(order);
    });

    it('LONGポジションを正しく決済する', () => {
      const { closePosition } = useTradingStore.getState();
      
      const result = closePosition('7203', 2100);

      // 決済が成功したことを確認
      expect(result.success).toBe(true);
      expect(result.remainingCash).toBe(1020000); // 800,000 + (100 * 2000) + (100 * (2100 - 2000))
      
      // ポジションが削除されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(0);
    });

    it('SHORTポジションを正しく決済する', () => {
      const { closePosition, executeOrderAtomicV2 } = useTradingStore.getState();
      
      // SHORTポジションを作成
      const shortOrder: OrderRequest = {
        symbol: '6758',
        name: 'ソニーグループ',
        market: 'japan',
        side: 'SHORT',
        quantity: 100,
        price: 10000,
        orderType: 'MARKET',
      };
      executeOrderAtomicV2(shortOrder);

      const result = closePosition('6758', 9500);

      // 決済が成功したことを確認
      expect(result.success).toBe(true);
      
      // ポジションが削除されたことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      const sonyPosition = newPortfolio.positions.find(p => p.symbol === '6758');
      expect(sonyPosition).toBeUndefined();
    });

    it('存在しないポジションの決済を拒否する', () => {
      const { closePosition } = useTradingStore.getState();
      
      const result = closePosition('9999', 2100);

      // 決済が失敗したことを確認
      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
      
      // ポジションが削除されていないことを確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(1);
    });
  });

  describe('Race Condition Prevention', () => {
    it('複数の注文を同時に実行しても整合性を保つ', () => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      const orders: OrderRequest[] = [
        {
          symbol: '7203',
          name: 'トヨタ自動車',
          market: 'japan',
          side: 'LONG',
          quantity: 100,
          price: 2000,
          orderType: 'MARKET',
        },
        {
          symbol: '6758',
          name: 'ソニーグループ',
          market: 'japan',
          side: 'LONG',
          quantity: 50,
          price: 10000,
          orderType: 'MARKET',
        },
        {
          symbol: '8306',
          name: '三菱UFJ',
          market: 'japan',
          side: 'LONG',
          quantity: 200,
          price: 1000,
          orderType: 'MARKET',
        },
      ];

      // すべての注文を実行
      const results = orders.map(order => executeOrderAtomicV2(order));

      // すべての注文が成功したことを確認
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // ポートフォリオの整合性を確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(3);
      expect(newPortfolio.cash).toBe(700000); // 1,000,000 - (100*2000 + 50*10000 + 200*1000)
      
      // ポジションの合計価値と現金の合計が初期資金と一致することを確認
      const totalPositionValue = newPortfolio.positions.reduce(
        (sum, p) => sum + p.currentPrice * p.quantity,
        0
      );
      expect(totalPositionValue + newPortfolio.cash).toBe(1000000);
    });

    it('資金不足の注文が他の注文に影響を与えない', () => {
      const { executeOrderAtomicV2 } = useTradingStore.getState();
      
      const validOrder: OrderRequest = {
        symbol: '7203',
        name: 'トヨタ自動車',
        market: 'japan',
        side: 'LONG',
        quantity: 100,
        price: 2000,
        orderType: 'MARKET',
      };
      
      const invalidOrder: OrderRequest = {
        symbol: '6758',
        name: 'ソニーグループ',
        market: 'japan',
        side: 'LONG',
        quantity: 1000,
        price: 10000,
        orderType: 'MARKET',
      };

      // 有効な注文を実行
      const validResult = executeOrderAtomicV2(validOrder);
      
      // 無効な注文を実行
      const invalidResult = executeOrderAtomicV2(invalidOrder);

      // 有効な注文が成功したことを確認
      expect(validResult.success).toBe(true);
      
      // 無効な注文が失敗したことを確認
      expect(invalidResult.success).toBe(false);
      
      // ポートフォリオの整合性を確認
      const { portfolio: newPortfolio } = useTradingStore.getState();
      expect(newPortfolio.positions.length).toBe(1);
      expect(newPortfolio.cash).toBe(800000); // 1,000,000 - (100 * 2000)
    });
  });
});
