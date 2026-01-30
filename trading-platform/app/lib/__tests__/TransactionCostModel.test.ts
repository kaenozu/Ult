/**
 * Unit tests for TransactionCostModel
 * TDD Approach: Tests first, then implementation
 */

import {
  transactionCostModel,
  TransactionCostModel,
  BrokerType,
  TradeType,
  FeeStructure,
  TransactionCostResult
} from '../TransactionCostModel';

describe('TransactionCostModel', () => {
  beforeEach(() => {
    transactionCostModel.reset();
  });

  describe('SBI Securities Fee Calculation', () => {
    it('should calculate SBI fees for same-day settlement (0.495%)', () => {
      const result = transactionCostModel.calculateSBIFees(100000, 1, 'same-day');
      
      expect(result.broker).toBe('SBI');
      expect(result.feeRate).toBe(0.00495);
      expect(result.tradingFee).toBeCloseTo(495, 0); // 100000 * 0.00495
      expect(result.settlementType).toBe('same-day');
    });

    it('should calculate SBI fees for 4-day settlement (0.99%)', () => {
      const result = transactionCostModel.calculateSBIFees(100000, 1, '4-day');
      
      expect(result.broker).toBe('SBI');
      expect(result.feeRate).toBe(0.0099);
      expect(result.tradingFee).toBeCloseTo(990, 0);
      expect(result.settlementType).toBe('4-day');
    });

    it('should apply minimum fee of 275 yen for small trades', () => {
      const result = transactionCostModel.calculateRakutenFees(10000, 1);
      
      // 10000 * 0.00495 = 49.5, but minimum is 275
      expect(result.tradingFee).toBe(275);
    });

    it('should handle large volume discounts', () => {
      // SBI offers discounts for monthly trading volume > 5M yen
      const result = transactionCostModel.calculateSBIFees(10000000, 1, 'same-day', { monthlyVolume: 6000000 });
      
      // Discounted rate: 0.00495 * 0.9 = 0.004455
      expect(result.feeRate).toBeCloseTo(0.004455, 6);
    });
  });

  describe('Rakuten Securities Fee Calculation', () => {
    it('should calculate Rakuten fees for same-day settlement (0.539%)', () => {
      const result = transactionCostModel.calculateRakutenFees(100000, 1);
      
      expect(result.broker).toBe('Rakuten');
      expect(result.feeRate).toBe(0.00539);
      expect(result.tradingFee).toBeCloseTo(539, 0);
    });

    it('should apply minimum fee of 275 yen for small trades', () => {
      const result = transactionCostModel.calculateRakutenFees(10000, 1);
      
      expect(result.tradingFee).toBe(275);
    });

    it('should handle Rakuten points rebate', () => {
      const result = transactionCostModel.calculateRakutenFees(100000, 1, { usePoints: true, pointRate: 0.01 });
      
      // 539 yen fee with 1% point rebate = 5.39 yen rebate
      expect(result.pointRebate).toBeCloseTo(5.39, 2);
      expect(result.netCost).toBeCloseTo(533.61, 2);
    });
  });

  describe('Slippage Estimation', () => {
    it('should estimate slippage for normal market conditions', () => {
      const result = transactionCostModel.estimateSlippage(
        100000,
        'normal',
        1000000 // 1M yen daily volume
      );
      
      expect(result.slippageRate).toBeGreaterThanOrEqual(0.001); // 0.1%
      expect(result.slippageRate).toBeLessThanOrEqual(0.003); // 0.3%
      expect(result.slippageAmount).toBeGreaterThan(0);
    });

    it('should estimate higher slippage for volatile markets', () => {
      const result = transactionCostModel.estimateSlippage(
        100000,
        'volatile',
        500000 // Low volume
      );
      
      expect(result.slippageRate).toBeGreaterThanOrEqual(0.005); // 0.5%
      expect(result.slippageRate).toBeLessThanOrEqual(0.01); // 1.0%
    });

    it('should estimate lower slippage for liquid stocks', () => {
      const result = transactionCostModel.estimateSlippage(
        100000,
        'normal',
        100000000 // High volume (100M yen)
      );
      
      expect(result.slippageRate).toBeLessThanOrEqual(0.001); // < 0.1%
    });

    it('should consider order size relative to average volume', () => {
      // Large order relative to volume should have higher slippage
      const smallOrder = transactionCostModel.estimateSlippage(10000, 'normal', 1000000);
      const largeOrder = transactionCostModel.estimateSlippage(500000, 'normal', 1000000);
      
      expect(largeOrder.slippageRate).toBeGreaterThan(smallOrder.slippageRate);
    });
  });

  describe('Total Transaction Cost Calculation', () => {
    it('should calculate total cost including fees and slippage (SBI)', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 100000,
        shares: 10,
        broker: 'SBI',
        marketCondition: 'normal',
        dailyVolume: 1000000,
        settlementType: 'same-day'
      });
      
      expect(result.broker).toBe('SBI');
      expect(result.tradingFee).toBeGreaterThan(0);
      expect(result.slippage).toBeGreaterThan(0);
      expect(result.totalCost).toBe(result.tradingFee + result.slippage);
      expect(result.netAmount).toBe(100000 - result.totalCost);
    });

    it('should calculate total cost for Rakuten', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 100000,
        shares: 10,
        broker: 'Rakuten',
        marketCondition: 'normal',
        dailyVolume: 1000000
      });
      
      expect(result.broker).toBe('Rakuten');
      expect(result.feeRate).toBe(0.00539);
    });

    it('should calculate round-trip cost (entry + exit)', () => {
      const result = transactionCostModel.calculateRoundTripCost({
        entryAmount: 100000,
        exitAmount: 110000, // 10% profit
        shares: 10,
        broker: 'SBI',
        marketCondition: 'normal',
        dailyVolume: 1000000,
        holdingDays: 3
      });
      
      // Entry cost
      expect(result.entryCost).toBeGreaterThan(0);
      // Exit cost (should be similar to entry)
      expect(result.exitCost).toBeGreaterThan(0);
      // Total round-trip cost
      expect(result.totalRoundTripCost).toBe(result.entryCost + result.exitCost);
      // Break-even price
      expect(result.breakEvenPrice).toBeGreaterThan(100000);
    });

    it('should calculate required profit for break-even', () => {
      const result = transactionCostModel.calculateRoundTripCost({
        entryAmount: 100000,
        exitAmount: 100000, // No profit
        shares: 10,
        broker: 'SBI',
        marketCondition: 'normal',
        dailyVolume: 1000000
      });
      
      // With no profit, net result should be negative (loss due to costs)
      expect(result.netResult).toBeLessThan(0);
      // Required profit percentage should be > 0
      expect(result.requiredProfitPercent).toBeGreaterThan(0);
    });
  });

  describe('Fee Comparison', () => {
    it('should compare fees between different brokers', () => {
      const comparison = transactionCostModel.compareBrokers(100000, 10, 'same-day');
      
      expect(comparison.SBI).toBeDefined();
      expect(comparison.Rakuten).toBeDefined();
      expect(comparison.recommended).toBeDefined();
      
      // SBI should be cheaper for same-day
      expect(comparison.SBI.tradingFee).toBeLessThan(comparison.Rakuten.tradingFee);
      expect(comparison.recommended.broker).toBe('SBI');
    });

    it('should recommend broker based on trading pattern', () => {
      // High frequency trader
      const highFreq = transactionCostModel.recommendBroker({
        monthlyVolume: 10000000,
        avgTradeSize: 500000,
        tradesPerMonth: 20,
        preferredSettlement: 'same-day'
      });
      
      expect(highFreq.broker).toBeDefined();
      expect(highFreq.reason).toContain('volume');
    });
  });

  describe('Cost Tracking and Statistics', () => {
    it('should track transaction history', () => {
      transactionCostModel.recordTransaction({
        symbol: 'AAPL',
        tradeAmount: 100000,
        tradingFee: 495,
        slippage: 200,
        timestamp: new Date().toISOString()
      });

      const history = transactionCostModel.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].symbol).toBe('AAPL');
    });

    it('should calculate monthly cost statistics', () => {
      // Record some transactions
      for (let i = 0; i < 5; i++) {
        transactionCostModel.recordTransaction({
          symbol: 'AAPL',
          tradeAmount: 100000,
          tradingFee: 495,
          slippage: 200,
          timestamp: new Date().toISOString()
        });
      }

      const stats = transactionCostModel.getMonthlyStatistics();
      expect(stats.totalTrades).toBe(5);
      expect(stats.totalFees).toBe(495 * 5);
      expect(stats.totalSlippage).toBe(200 * 5);
      expect(stats.averageCostPerTrade).toBe((495 + 200));
    });

    it('should calculate cost impact on returns', () => {
      const trades = [
        { entry: 100000, exit: 110000, grossProfit: 10000 }, // 10% profit
        { entry: 100000, exit: 95000, grossProfit: -5000 }   // 5% loss
      ];

      const impact = transactionCostModel.calculateCostImpact(trades, 'SBI');
      
      expect(impact.totalGrossProfit).toBe(5000);
      expect(impact.totalCosts).toBeGreaterThan(0);
      expect(impact.netProfit).toBeLessThan(impact.totalGrossProfit);
      expect(impact.costImpactPercent).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero trade amount gracefully', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 0,
        shares: 0,
        broker: 'SBI',
        marketCondition: 'normal',
        dailyVolume: 1000000
      });

      expect(result.tradingFee).toBe(0);
      expect(result.slippage).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it('should handle extremely large trades', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 100000000, // 100M yen
        shares: 1000,
        broker: 'SBI',
        marketCondition: 'normal',
        dailyVolume: 1000000000
      });

      expect(result.tradingFee).toBeGreaterThan(0);
      expect(result.feeRate).toBeDefined();
    });

    it('should handle negative slippage (favorable)', () => {
      // Sometimes you get a better price than expected
      const result = transactionCostModel.estimateSlippage(
        100000,
        'favorable',
        100000000,
        { priceImprovement: true }
      );

      expect(result.slippageRate).toBeLessThanOrEqual(0);
      expect(result.slippageAmount).toBeLessThanOrEqual(0);
    });

    it('should handle invalid broker type', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 100000,
        shares: 10,
        broker: 'InvalidBroker' as BrokerType,
        marketCondition: 'normal',
        dailyVolume: 1000000
      });

      expect(result.error).toBeDefined();
      expect(result.tradingFee).toBe(0);
    });

    it('should handle missing daily volume data', () => {
      const result = transactionCostModel.calculateTotalCost({
        tradeAmount: 100000,
        shares: 10,
        broker: 'SBI',
        marketCondition: 'normal'
        // dailyVolume not provided
      });

      // Should use default/estimated volume
      expect(result.slippage).toBeGreaterThanOrEqual(0);
    });
  });
});
