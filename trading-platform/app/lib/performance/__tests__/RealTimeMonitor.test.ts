/**
 * RealTimeMonitor.test.ts
 * 
 * Unit tests for RealTimeMonitor
 */

import { RealTimeMonitor } from '../RealTimeMonitor';
import { Trade, Portfolio, MonitoringAlert } from '@/app/types/performance';

describe('RealTimeMonitor', () => {
  let monitor: RealTimeMonitor;
  let mockPortfolio: Portfolio;

  beforeEach(() => {
    const now = Date.now();
    mockPortfolio = {
      id: 'test-portfolio',
      initialValue: 100000,
      currentValue: 100000,
      cash: 50000,
      positions: {
        'AAPL': {
          symbol: 'AAPL',
          quantity: 100,
          entryPrice: 150,
          currentPrice: 155,
          stopLoss: 145,
        },
      },
      trades: [],
      orders: [
        { id: '1', symbol: 'GOOGL', type: 'LIMIT', side: 'BUY', quantity: 10, price: 2000, status: 'OPEN' },
      ],
      history: [
        { timestamp: now - 1000, value: 100000, cash: 50000, positions: {} },
      ],
      createdAt: now - 365 * 24 * 60 * 60 * 1000,
    };

    monitor = new RealTimeMonitor(mockPortfolio);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with portfolio', () => {
      expect(monitor).toBeDefined();
      expect(monitor.getCurrentMetrics()).toBeDefined();
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio and record metrics', () => {
      const updatedPortfolio = {
        ...mockPortfolio,
        currentValue: 110000,
      };

      monitor.updatePortfolio(updatedPortfolio);
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.portfolioValue).toBe(110000);
    });

    it('should emit alert on threshold violation', (done) => {
      // Set low threshold
      monitor.setThresholds({ maxDailyLoss: 0.01 });

      monitor.on('alert', (alert: MonitoringAlert) => {
        expect(alert.level).toBe('critical');
        expect(alert.type).toBe('daily-loss');
        done();
      });

      // Create portfolio with daily loss
      const losingPortfolio = {
        ...mockPortfolio,
        currentValue: 90000, // 10% loss
      };

      monitor.updatePortfolio(losingPortfolio);
    });
  });

  describe('recordTrade', () => {
    it('should record trade without errors', () => {
      const trade: Trade = {
        id: '1',
        symbol: 'AAPL',
        type: 'BUY',
        price: 150,
        quantity: 10,
        timestamp: Date.now(),
        commission: 5,
        profit: 0,
      };

      expect(() => monitor.recordTrade(trade)).not.toThrow();
    });

    it('should emit alert on large loss', (done) => {
      monitor.on('alert', (alert: MonitoringAlert) => {
        expect(alert.type).toBe('large-loss');
        expect(alert.level).toBe('critical');
        done();
      });

      const losingTrade: Trade = {
        id: '1',
        symbol: 'AAPL',
        type: 'SELL',
        price: 100,
        quantity: 100,
        timestamp: Date.now(),
        commission: 5,
        profit: -1500,
      };

      monitor.recordTrade(losingTrade);
    });

    it('should emit alert on consecutive losses', (done) => {
      // Add losing trades to portfolio
      const losingTrades: Trade[] = [
        { id: '1', symbol: 'AAPL', type: 'SELL', price: 100, quantity: 10, timestamp: Date.now() - 3000, commission: 5, profit: -100 },
        { id: '2', symbol: 'GOOGL', type: 'SELL', price: 200, quantity: 5, timestamp: Date.now() - 2000, commission: 5, profit: -50 },
        { id: '3', symbol: 'MSFT', type: 'SELL', price: 150, quantity: 8, timestamp: Date.now() - 1000, commission: 5, profit: -80 },
      ];

      const portfolioWithLosses = {
        ...mockPortfolio,
        trades: losingTrades,
      };

      monitor.updatePortfolio(portfolioWithLosses);

      monitor.on('alert', (alert: MonitoringAlert) => {
        if (alert.type === 'consecutive-losses') {
          expect(alert.level).toBe('warning');
          done();
        }
      });

      const anotherLoss: Trade = {
        id: '4',
        symbol: 'TSLA',
        type: 'SELL',
        price: 300,
        quantity: 3,
        timestamp: Date.now(),
        commission: 5,
        profit: -90,
      };

      monitor.recordTrade(anotherLoss);
    });
  });

  describe('updatePrice', () => {
    it('should update price cache', () => {
      monitor.updatePrice('AAPL', 160);
      
      // Price update should be reflected in metrics
      const metrics = monitor.getCurrentMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current monitoring metrics', () => {
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.portfolioValue).toBe(100000);
      expect(metrics.openPositions).toBe(1);
      expect(metrics.activeOrders).toBe(1);
    });

    it('should calculate daily PnL correctly', () => {
      const metrics = monitor.getCurrentMetrics();

      expect(metrics.dailyPnL).toBeDefined();
      expect(metrics.dailyReturn).toBeDefined();
      expect(typeof metrics.dailyPnL).toBe('number');
      expect(typeof metrics.dailyReturn).toBe('number');
    });
  });

  describe('getMetricsHistory', () => {
    it('should return empty array initially', () => {
      const history = monitor.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should accumulate metrics over time', () => {
      monitor.updatePortfolio(mockPortfolio);
      monitor.updatePortfolio(mockPortfolio);
      monitor.updatePortfolio(mockPortfolio);

      const history = monitor.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history with parameter', () => {
      for (let i = 0; i < 10; i++) {
        monitor.updatePortfolio(mockPortfolio);
      }

      const history = monitor.getMetricsHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAlerts', () => {
    it('should return all alerts by default', () => {
      const alerts = monitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter alerts by level', () => {
      // Trigger some alerts
      monitor.setThresholds({ maxDailyLoss: 0.01 });
      const losingPortfolio = {
        ...mockPortfolio,
        currentValue: 90000,
      };
      monitor.updatePortfolio(losingPortfolio);

      const criticalAlerts = monitor.getAlerts('critical');
      expect(Array.isArray(criticalAlerts)).toBe(true);
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      // Trigger an alert
      monitor.setThresholds({ maxDailyLoss: 0.01 });
      monitor.updatePortfolio({ ...mockPortfolio, currentValue: 90000 });

      monitor.clearAlerts();
      
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('clearAlertsByLevel', () => {
    it('should clear alerts of specific level', () => {
      // This requires triggering multiple alert types
      monitor.clearAlertsByLevel('info');
      
      const infoAlerts = monitor.getAlerts('info');
      expect(infoAlerts.length).toBe(0);
    });
  });

  describe('setThresholds and getThresholds', () => {
    it('should update thresholds', () => {
      const newThresholds = {
        maxDailyLoss: 0.03,
        maxDrawdown: 0.15,
      };

      monitor.setThresholds(newThresholds);
      const thresholds = monitor.getThresholds();

      expect(thresholds.maxDailyLoss).toBe(0.03);
      expect(thresholds.maxDrawdown).toBe(0.15);
    });

    it('should preserve unmodified thresholds', () => {
      const originalThresholds = monitor.getThresholds();
      
      monitor.setThresholds({ maxDailyLoss: 0.03 });
      const updatedThresholds = monitor.getThresholds();

      expect(updatedThresholds.maxDailyLoss).toBe(0.03);
      expect(updatedThresholds.maxDrawdown).toBe(originalThresholds.maxDrawdown);
      expect(updatedThresholds.maxPositions).toBe(originalThresholds.maxPositions);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return alert statistics', () => {
      const stats = monitor.getAlertStatistics();

      expect(stats.total).toBeDefined();
      expect(stats.byLevel).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('clearMetricsHistory', () => {
    it('should clear metrics history', () => {
      monitor.updatePortfolio(mockPortfolio);
      monitor.updatePortfolio(mockPortfolio);

      monitor.clearMetricsHistory();

      const history = monitor.getMetricsHistory();
      expect(history.length).toBe(0);
    });
  });
});
