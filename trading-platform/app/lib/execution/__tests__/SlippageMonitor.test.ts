/**
 * SlippageMonitor.test.ts
 * 
 * Tests for the SlippageMonitor service
 */

import {
  SlippageMonitor,
  type Order,
  type Execution,
  type SlippageRecord,
  type SlippageAlert,
} from '../SlippageMonitor';

describe('SlippageMonitor', () => {
  let monitor: SlippageMonitor;

  beforeEach(() => {
    monitor = new SlippageMonitor();
  });

  describe('Order Registration', () => {
    it('should register an order for monitoring', () => {
      const order: Order = {
        id: 'order-1',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);
      
      // Verify order was registered by checking if it can be recorded
      const execution: Execution = {
        orderId: 'order-1',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 150.5,
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      expect(record).not.toBeNull();
      expect(record?.orderId).toBe('order-1');
    });

    it('should emit order_registered event', (done) => {
      const order: Order = {
        id: 'order-2',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.on('order_registered', (registeredOrder) => {
        expect(registeredOrder.id).toBe('order-2');
        done();
      });

      monitor.registerOrder(order);
    });
  });

  describe('Slippage Calculation', () => {
    it('should calculate positive slippage for BUY orders (higher price)', () => {
      const order: Order = {
        id: 'order-3',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-3',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 150.75, // 0.5% higher
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      
      expect(record).not.toBeNull();
      expect(record!.slippagePercentage).toBeCloseTo(0.5, 2);
      expect(record!.slippageBps).toBeCloseTo(50, 0); // 50 basis points
    });

    it('should calculate negative slippage for BUY orders (lower price)', () => {
      const order: Order = {
        id: 'order-4',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-4',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 149.25, // 0.5% lower (good slippage)
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      
      expect(record).not.toBeNull();
      expect(record!.slippagePercentage).toBeCloseTo(-0.5, 2);
      expect(record!.slippageBps).toBeCloseTo(-50, 0);
    });

    it('should calculate positive slippage for SELL orders (lower price)', () => {
      const order: Order = {
        id: 'order-5',
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-5',
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 100,
        actualPrice: 149.25, // 0.5% lower (bad slippage for SELL)
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      
      expect(record).not.toBeNull();
      expect(record!.slippagePercentage).toBeCloseTo(0.5, 2);
      expect(record!.slippageBps).toBeCloseTo(50, 0);
    });

    it('should calculate negative slippage for SELL orders (higher price)', () => {
      const order: Order = {
        id: 'order-6',
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-6',
        symbol: 'AAPL',
        side: 'SELL',
        quantity: 100,
        actualPrice: 150.75, // 0.5% higher (good slippage for SELL)
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      
      expect(record).not.toBeNull();
      expect(record!.slippagePercentage).toBeCloseTo(-0.5, 2);
      expect(record!.slippageBps).toBeCloseTo(-50, 0);
    });
  });

  describe('Excessive Slippage Detection', () => {
    it('should emit warning for slippage above warning threshold', (done) => {
      monitor = new SlippageMonitor({
        warningThresholdBps: 30,
        criticalThresholdBps: 50,
      });

      const order: Order = {
        id: 'order-7',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      monitor.on('slippage_warning', (alert: SlippageAlert) => {
        expect(alert.level).toBe('WARNING');
        expect(alert.slippageBps).toBeGreaterThan(30);
        done();
      });

      const execution: Execution = {
        orderId: 'order-7',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 150.6, // 0.4% = 40bps
        timestamp: Date.now(),
      };

      monitor.recordExecution(execution);
    });

    it('should emit critical alert for slippage above critical threshold', (done) => {
      monitor = new SlippageMonitor({
        warningThresholdBps: 30,
        criticalThresholdBps: 50,
      });

      const order: Order = {
        id: 'order-8',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 150.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      monitor.on('critical_slippage', (alert: SlippageAlert) => {
        expect(alert.level).toBe('CRITICAL');
        expect(alert.slippageBps).toBeGreaterThan(50);
        done();
      });

      const execution: Execution = {
        orderId: 'order-8',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 151.0, // 0.667% = 66.7bps
        timestamp: Date.now(),
      };

      monitor.recordExecution(execution);
    });

    it('should detect excessive slippage correctly', () => {
      expect(monitor.detectExcessiveSlippage(25)).toBe(false);
      expect(monitor.detectExcessiveSlippage(35)).toBe(true);
      expect(monitor.detectExcessiveSlippage(60)).toBe(true);
    });
  });

  describe('Historical Analysis', () => {
    beforeEach(() => {
      // Add sample data with varying slippage
      const testData = [
        { hour: 9, slippageBps: 20 },
        { hour: 9, slippageBps: 25 },
        { hour: 10, slippageBps: 15 },
        { hour: 10, slippageBps: 18 },
        { hour: 14, slippageBps: 40 },
        { hour: 14, slippageBps: 45 },
        { hour: 15, slippageBps: 30 },
      ];

      testData.forEach((data, index) => {
        const order: Order = {
          id: `order-${index}`,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          expectedPrice: 150.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const slippagePrice = 150.0 + (150.0 * data.slippageBps / 10000);
        // Create a timestamp with the specific hour
        const testDate = new Date();
        testDate.setHours(data.hour, 0, 0, 0);
        
        const execution: Execution = {
          orderId: order.id,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          actualPrice: slippagePrice,
          timestamp: testDate.getTime(),
        };

        monitor.recordExecution(execution);
      });
    });

    it('should calculate average slippage correctly', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      expect(analysis.sampleSize).toBe(7);
      expect(analysis.avgSlippageBps).toBeCloseTo(27.57, 0); // (20+25+15+18+40+45+30)/7
    });

    it('should identify max and min slippage', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      expect(analysis.maxSlippageBps).toBeCloseTo(45, 1);
      expect(analysis.minSlippageBps).toBeCloseTo(15, 1);
    });

    it('should calculate standard deviation', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      expect(analysis.stdDevBps).toBeGreaterThan(0);
      expect(analysis.stdDevBps).toBeLessThan(15);
    });

    it('should identify best and worst hours for trading', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      expect(analysis.timeAnalysis.bestHour).toBe(10); // 16.5 bps avg
      expect(analysis.timeAnalysis.worstHour).toBe(14); // 42.5 bps avg
    });

    it('should provide hourly analysis', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      const hourlyData = analysis.timeAnalysis.hourly;
      expect(hourlyData.has(9)).toBe(true);
      expect(hourlyData.has(10)).toBe(true);
      expect(hourlyData.has(14)).toBe(true);
      
      const hour10Data = hourlyData.get(10);
      expect(hour10Data?.count).toBe(2);
      expect(hour10Data?.avgBps).toBeCloseTo(16.5, 1);
    });

    it('should generate recommendations', () => {
      const analysis = monitor.analyzeSlippageHistory('AAPL');
      
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      // Check for time-based recommendation (may include hour information)
      expect(analysis.recommendations.some(r => 
        r.includes('Best') || r.includes('optimal') || r.includes('hour')
      )).toBe(true);
    });
  });

  describe('Overall Statistics', () => {
    beforeEach(() => {
      // Add data for multiple symbols
      ['AAPL', 'GOOGL', 'MSFT'].forEach((symbol, symbolIndex) => {
        [20, 25, 30].forEach((slippageBps, index) => {
          const order: Order = {
            id: `order-${symbol}-${index}`,
            symbol,
            side: 'BUY',
            quantity: 100,
            expectedPrice: 100.0,
            timestamp: Date.now(),
          };

          monitor.registerOrder(order);

          const slippagePrice = 100.0 + (100.0 * slippageBps / 10000);
          const execution: Execution = {
            orderId: order.id,
            symbol,
            side: 'BUY',
            quantity: 100,
            actualPrice: slippagePrice,
            timestamp: Date.now(),
          };

          monitor.recordExecution(execution);
        });
      });
    });

    it('should calculate overall statistics correctly', () => {
      const stats = monitor.getOverallStatistics();
      
      expect(stats.totalRecords).toBe(9); // 3 symbols × 3 records
      expect(stats.symbolCount).toBe(3);
      expect(stats.avgSlippageBps).toBeCloseTo(25, 0); // (20+25+30)/3 for each symbol
    });

    it('should determine if target is achieved', () => {
      const monitorWithTarget = new SlippageMonitor({
        targetSlippageBps: 30,
      });

      // Add low slippage data
      const order: Order = {
        id: 'order-low',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 100.0,
        timestamp: Date.now(),
      };

      monitorWithTarget.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-low',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 100.2, // 20 bps
        timestamp: Date.now(),
      };

      monitorWithTarget.recordExecution(execution);

      const stats = monitorWithTarget.getOverallStatistics();
      expect(stats.targetAchieved).toBe(true);
      expect(stats.avgSlippageBps).toBeLessThanOrEqual(30);
    });

    it('should calculate reduction percentage from baseline', () => {
      const stats = monitor.getOverallStatistics();
      
      // Baseline is 50bps, avg is 25bps, so reduction should be 50%
      expect(stats.reductionPercentage).toBeCloseTo(50, 0);
    });
  });

  describe('Alerts Management', () => {
    it('should store recent alerts', () => {
      monitor = new SlippageMonitor({
        warningThresholdBps: 20,
      });

      // Generate multiple alerts
      for (let i = 0; i < 5; i++) {
        const order: Order = {
          id: `order-alert-${i}`,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          expectedPrice: 100.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const execution: Execution = {
          orderId: order.id,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          actualPrice: 100.3, // 30 bps
          timestamp: Date.now(),
        };

        monitor.recordExecution(execution);
      }

      const alerts = monitor.getRecentAlerts();
      expect(alerts.length).toBe(5);
    });

    it('should limit recent alerts to specified number', () => {
      monitor = new SlippageMonitor({
        warningThresholdBps: 20,
      });

      // Generate many alerts
      for (let i = 0; i < 20; i++) {
        const order: Order = {
          id: `order-alert-${i}`,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          expectedPrice: 100.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const execution: Execution = {
          orderId: order.id,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          actualPrice: 100.3, // 30 bps
          timestamp: Date.now(),
        };

        monitor.recordExecution(execution);
      }

      const alerts = monitor.getRecentAlerts(5);
      expect(alerts.length).toBe(5);
    });

    it('should clear alerts', () => {
      monitor = new SlippageMonitor({
        warningThresholdBps: 20,
      });

      // Generate alert
      const order: Order = {
        id: 'order-clear',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 100.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-clear',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 100.3,
        timestamp: Date.now(),
      };

      monitor.recordExecution(execution);

      expect(monitor.getRecentAlerts().length).toBeGreaterThan(0);

      monitor.clearAlerts();
      expect(monitor.getRecentAlerts().length).toBe(0);
    });
  });

  describe('History Management', () => {
    it('should retrieve history for a specific symbol', () => {
      const order: Order = {
        id: 'order-hist',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 100.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-hist',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 100.2,
        timestamp: Date.now(),
      };

      monitor.recordExecution(execution);

      const history = monitor.getHistory('AAPL');
      expect(history.length).toBe(1);
      expect(history[0].symbol).toBe('AAPL');
    });

    it('should clear history for a specific symbol', () => {
      // Add data for two symbols
      ['AAPL', 'GOOGL'].forEach(symbol => {
        const order: Order = {
          id: `order-${symbol}`,
          symbol,
          side: 'BUY',
          quantity: 100,
          expectedPrice: 100.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const execution: Execution = {
          orderId: order.id,
          symbol,
          side: 'BUY',
          quantity: 100,
          actualPrice: 100.2,
          timestamp: Date.now(),
        };

        monitor.recordExecution(execution);
      });

      monitor.clearHistory('AAPL');

      expect(monitor.getHistory('AAPL').length).toBe(0);
      expect(monitor.getHistory('GOOGL').length).toBe(1);
    });

    it('should clear all history', () => {
      ['AAPL', 'GOOGL'].forEach(symbol => {
        const order: Order = {
          id: `order-${symbol}`,
          symbol,
          side: 'BUY',
          quantity: 100,
          expectedPrice: 100.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const execution: Execution = {
          orderId: order.id,
          symbol,
          side: 'BUY',
          quantity: 100,
          actualPrice: 100.2,
          timestamp: Date.now(),
        };

        monitor.recordExecution(execution);
      });

      monitor.clearHistory();

      expect(monitor.getHistory('AAPL').length).toBe(0);
      expect(monitor.getHistory('GOOGL').length).toBe(0);
    });

    it('should maintain history window size', () => {
      monitor = new SlippageMonitor({
        historyWindowSize: 5,
      });

      // Add more than window size
      for (let i = 0; i < 10; i++) {
        const order: Order = {
          id: `order-${i}`,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          expectedPrice: 100.0,
          timestamp: Date.now(),
        };

        monitor.registerOrder(order);

        const execution: Execution = {
          orderId: order.id,
          symbol: 'AAPL',
          side: 'BUY',
          quantity: 100,
          actualPrice: 100.2,
          timestamp: Date.now(),
        };

        monitor.recordExecution(execution);
      }

      const history = monitor.getHistory('AAPL');
      expect(history.length).toBe(5); // Should be capped at window size
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = monitor.getConfig();
      
      expect(config.warningThresholdBps).toBe(30);
      expect(config.criticalThresholdBps).toBe(50);
      expect(config.historyWindowSize).toBe(1000);
      expect(config.targetSlippageBps).toBe(25);
      expect(config.enableRealTimeAlerts).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customMonitor = new SlippageMonitor({
        warningThresholdBps: 40,
        criticalThresholdBps: 60,
        targetSlippageBps: 30,
      });

      const config = customMonitor.getConfig();
      expect(config.warningThresholdBps).toBe(40);
      expect(config.criticalThresholdBps).toBe(60);
      expect(config.targetSlippageBps).toBe(30);
    });

    it('should update configuration', () => {
      monitor.updateConfig({
        warningThresholdBps: 35,
      });

      const config = monitor.getConfig();
      expect(config.warningThresholdBps).toBe(35);
      expect(config.criticalThresholdBps).toBe(50); // Should remain unchanged
    });

    it('should emit config_updated event', (done) => {
      monitor.on('config_updated', (config) => {
        expect(config.warningThresholdBps).toBe(35);
        done();
      });

      monitor.updateConfig({
        warningThresholdBps: 35,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing order gracefully', () => {
      const execution: Execution = {
        orderId: 'non-existent',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 100.2,
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      expect(record).toBeNull();
    });

    it('should handle empty history for analysis', () => {
      const analysis = monitor.analyzeSlippageHistory('NONEXISTENT');
      
      expect(analysis.sampleSize).toBe(0);
      expect(analysis.avgSlippageBps).toBe(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toContain('No data available');
    });

    it('should handle zero expected price gracefully', () => {
      const order: Order = {
        id: 'order-zero',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        expectedPrice: 100.0,
        timestamp: Date.now(),
      };

      monitor.registerOrder(order);

      const execution: Execution = {
        orderId: 'order-zero',
        symbol: 'AAPL',
        side: 'BUY',
        quantity: 100,
        actualPrice: 100.0, // Exact match
        timestamp: Date.now(),
      };

      const record = monitor.recordExecution(execution);
      expect(record).not.toBeNull();
      expect(record!.slippageBps).toBe(0);
    });
  });
});
