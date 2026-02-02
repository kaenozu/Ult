/**
 * AutomaticRiskController.test.ts
 * 
 * Unit tests for AutomaticRiskController
 */

import { AutomaticRiskController, DEFAULT_CONTROL_CONFIG } from '../AutomaticRiskController';
import { RealTimeRiskMetrics } from '../RealTimeRiskCalculator';
import { Portfolio, Position } from '@/app/types';

describe('AutomaticRiskController', () => {
  let controller: AutomaticRiskController;
  let mockPortfolio: Portfolio;
  let mockRiskMetrics: RealTimeRiskMetrics;

  beforeEach(() => {
    controller = new AutomaticRiskController();
    
    mockPortfolio = {
      cash: 100000,
      positions: [],
      totalValue: 0,
      dailyPnL: 0,
      totalProfit: 0,
      orders: [],
    };

    mockRiskMetrics = {
      totalRiskPercent: 10,
      usedCapitalPercent: 50,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      currentDrawdown: 5,
      maxDrawdown: 5,
      peakValue: 100000,
      var95: 5000,
      var99: 7000,
      cvar95: 6000,
      portfolioVolatility: 15,
      weightedVolatility: 15,
      concentrationRisk: 0.3,
      largestPositionPercent: 25,
      correlationRisk: 0.4,
      avgCorrelation: 0.4,
      dailyLoss: 0,
      dailyLossPercent: 0,
      riskLevel: 'safe',
      alerts: [],
    };
  });

  describe('Daily Loss Limit Check', () => {
    it('should block orders when daily loss limit is exceeded', () => {
      mockRiskMetrics.dailyLossPercent = 6; // Exceeds 5% limit
      
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('block_orders');
      expect(actions[0].severity).toBe('critical');
      expect(controller.shouldBlockNewOrders()).toBe(true);
    });

    it('should not block orders when daily loss is within limit', () => {
      mockRiskMetrics.dailyLossPercent = 3; // Within 5% limit
      
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const blockActions = actions.filter(a => a.type === 'block_orders');
      expect(blockActions.length).toBe(0);
    });
  });

  describe('Drawdown Limit Check', () => {
    it('should recommend position reduction at max drawdown', () => {
      mockRiskMetrics.currentDrawdown = 21; // Exceeds 20% limit
      
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      expect(actions.length).toBeGreaterThan(0);
      const reductionAction = actions.find(a => a.type === 'reduce_position');
      expect(reductionAction).toBeDefined();
      expect(reductionAction?.severity).toBe('critical');
    });

    it('should issue warning near max drawdown', () => {
      mockRiskMetrics.currentDrawdown = 17; // 85% of 20% limit
      
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const warningAction = actions.find(a => a.type === 'warning');
      expect(warningAction).toBeDefined();
      expect(warningAction?.severity).toBe('high');
    });
  });

  describe('Consecutive Losses Check', () => {
    it('should block orders after max consecutive losses', () => {
      // Simulate 3 consecutive losses
      mockPortfolio.dailyPnL = -1000;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      mockPortfolio.dailyPnL = -1500;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      mockPortfolio.dailyPnL = -2000;
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const blockAction = actions.find(a => a.type === 'block_orders');
      expect(blockAction).toBeDefined();
      expect(blockAction?.reason).toContain('連続損失');
    });

    it('should reset consecutive losses on profit', () => {
      // Simulate 2 losses then a profit
      mockPortfolio.dailyPnL = -1000;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      mockPortfolio.dailyPnL = -1500;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      mockPortfolio.dailyPnL = 2000; // Profit
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      // Should not have consecutive loss warning
      const blockAction = actions.find(a => a.reason.includes('連続損失'));
      expect(blockAction).toBeUndefined();
    });
  });

  describe('Emergency Conditions', () => {
    it('should halt trading on emergency drawdown', () => {
      const emergencyController = new AutomaticRiskController({
        enableEmergencyHalt: true,
      });
      
      mockRiskMetrics.currentDrawdown = 26; // Exceeds 25% emergency limit
      
      const actions = emergencyController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const haltAction = actions.find(a => a.type === 'emergency_halt');
      expect(haltAction).toBeDefined();
      expect(haltAction?.severity).toBe('critical');
      expect(emergencyController.isTradingHaltActive()).toBe(true);
    });

    it('should halt trading on emergency risk level', () => {
      const emergencyController = new AutomaticRiskController({
        enableEmergencyHalt: true,
      });
      
      mockRiskMetrics.totalRiskPercent = 55; // Exceeds 50% emergency limit
      
      const actions = emergencyController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const haltAction = actions.find(a => a.type === 'emergency_halt');
      expect(haltAction).toBeDefined();
    });
  });

  describe('Position Reduction', () => {
    it('should recommend position reduction at critical risk level', () => {
      const reductionController = new AutomaticRiskController({
        enableAutoPositionReduction: true,
      });
      
      mockRiskMetrics.riskLevel = 'critical';
      
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 900,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: -100,
        changePercent: -10,
      };
      
      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 90000;
      
      const actions = reductionController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const reductionAction = actions.find(a => a.type === 'reduce_position');
      expect(reductionAction).toBeDefined();
    });
  });

  describe('Market Crash Detection', () => {
    it('should detect market crash on rapid price drop', () => {
      const symbol = 'TEST';
      
      // Initial price
      controller.detectMarketCrash(symbol, 1000);
      
      // Simulate crash: -6% in 10 minutes
      const crashData = controller.detectMarketCrash(symbol, 940);
      
      expect(crashData.priceChange).toBeLessThan(-5);
      expect(crashData.isMarketCrash).toBe(true);
    });

    it('should not detect crash on gradual decline', () => {
      const symbol = 'TEST';
      
      controller.detectMarketCrash(symbol, 1000);
      
      // Wait 20 minutes (simulated)
      const twentyMinutes = 20 * 60 * 1000;
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + twentyMinutes);
      
      const data = controller.detectMarketCrash(symbol, 940);
      
      expect(data.isMarketCrash).toBe(false);
      
      jest.restoreAllMocks();
    });
  });

  describe('Position Reduction Proposals', () => {
    it('should generate proposals for oversized positions', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 300,
        avgPrice: 100,
        currentPrice: 100,
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: 0,
        changePercent: 0,
      };
      
      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 30000;
      mockPortfolio.cash = 70000;
      
      const proposals = controller.generatePositionReductionProposals(
        mockPortfolio,
        mockRiskMetrics
      );
      
      expect(proposals.length).toBeGreaterThan(0);
      expect(proposals[0].symbol).toBe('TEST');
      expect(proposals[0].currentSize).toBe(300);
      expect(proposals[0].recommendedSize).toBeLessThan(300);
    });

    it('should generate urgent proposals for losing positions', () => {
      const position: Position = {
        symbol: 'TEST',
        quantity: 100,
        avgPrice: 1000,
        currentPrice: 800, // -20% loss
        side: 'LONG',
        entryDate: Date.now(),
        market: 'JP',
        change: -200,
        changePercent: -20,
      };
      
      mockPortfolio.positions = [position];
      mockPortfolio.totalValue = 80000;
      
      const proposals = controller.generatePositionReductionProposals(
        mockPortfolio,
        mockRiskMetrics
      );
      
      expect(proposals.length).toBeGreaterThan(0);
      // -20% loss triggers high urgency (>-15%)
      expect(proposals[0].urgency).toBe('high');
      expect(proposals[0].reductionPercent).toBe(50);
    });
  });

  describe('Control Methods', () => {
    it('should unblock orders when requested', () => {
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      expect(controller.shouldBlockNewOrders()).toBe(true);
      
      controller.unblockOrders();
      
      expect(controller.shouldBlockNewOrders()).toBe(false);
    });

    it('should resume trading after halt', () => {
      const emergencyController = new AutomaticRiskController({
        enableEmergencyHalt: true,
      });
      
      mockRiskMetrics.currentDrawdown = 26;
      emergencyController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      expect(emergencyController.isTradingHaltActive()).toBe(true);
      
      emergencyController.resumeTrading();
      
      expect(emergencyController.isTradingHaltActive()).toBe(false);
    });

    it('should reset consecutive losses', () => {
      mockPortfolio.dailyPnL = -1000;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      controller.resetConsecutiveLosses();
      
      // Should not trigger consecutive loss warning
      mockPortfolio.dailyPnL = -1500;
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const blockAction = actions.find(a => a.reason.includes('連続損失'));
      expect(blockAction).toBeUndefined();
    });
  });

  describe('Action History', () => {
    it('should track action history', () => {
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const history = controller.getActionHistory();
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe('block_orders');
    });

    it('should limit action history', () => {
      // Generate many actions
      for (let i = 0; i < 60; i++) {
        mockRiskMetrics.dailyLossPercent = 6;
        controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      }
      
      const history = controller.getActionHistory(50);
      
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should get active actions only', () => {
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      const activeActions = controller.getActiveActions();
      
      expect(activeActions.length).toBeGreaterThan(0);
      expect(activeActions.every(a => !a.executed)).toBe(true);
    });

    it('should mark actions as executed', () => {
      mockRiskMetrics.dailyLossPercent = 6;
      const actions = controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      controller.markActionExecuted(actions[0].timestamp);
      
      const activeActions = controller.getActiveActions();
      expect(activeActions.length).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customController = new AutomaticRiskController({
        maxDailyLossPercent: 3,
      });
      
      mockRiskMetrics.dailyLossPercent = 4;
      const actions = customController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should update configuration', () => {
      controller.updateConfig({
        maxDailyLossPercent: 3,
      });
      
      const config = controller.getConfig();
      
      expect(config.maxDailyLossPercent).toBe(3);
    });
  });

  describe('Event Emission', () => {
    it('should emit events on actions', (done) => {
      controller.on('action', (action) => {
        expect(action.type).toBe('block_orders');
        done();
      });
      
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
    });

    it('should emit orders_blocked event', (done) => {
      controller.on('orders_blocked', (action) => {
        expect(action.type).toBe('block_orders');
        done();
      });
      
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
    });

    it('should emit trading_halted event', (done) => {
      const emergencyController = new AutomaticRiskController({
        enableEmergencyHalt: true,
      });
      
      emergencyController.on('trading_halted', (action) => {
        expect(action.type).toBe('emergency_halt');
        done();
      });
      
      mockRiskMetrics.currentDrawdown = 26;
      emergencyController.evaluateAndAct(mockRiskMetrics, mockPortfolio);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      mockRiskMetrics.dailyLossPercent = 6;
      controller.evaluateAndAct(mockRiskMetrics, mockPortfolio);
      
      controller.reset();
      
      expect(controller.getActionHistory().length).toBe(0);
      expect(controller.shouldBlockNewOrders()).toBe(false);
      expect(controller.isTradingHaltActive()).toBe(false);
    });
  });
});
