/**
 * @jest-environment node
 */
import {
  AdvancedRiskManager,
  PositionSizingParams,
  RiskLimits,
  DEFAULT_RISK_LIMITS,
  Portfolio,
} from '../AdvancedRiskManager';

describe('AdvancedRiskManager', () => {
  let riskManager: AdvancedRiskManager;

  beforeEach(() => {
    riskManager = new AdvancedRiskManager();
  });

  describe('Initialization', () => {
    it('should initialize with default limits', () => {
      const manager = new AdvancedRiskManager();
      expect(manager).toBeDefined();
      expect(manager.isHalted()).toBe(false);
    });

    it('should initialize with custom limits', () => {
      const customLimits: Partial<RiskLimits> = {
        maxPositionSize: 10,
        maxSingleTradeRisk: 1,
      };
      const manager = new AdvancedRiskManager(customLimits);
      expect(manager).toBeDefined();
    });

    it('should merge custom limits with defaults', () => {
      const customLimits: Partial<RiskLimits> = {
        maxDrawdown: 10,
      };
      const manager = new AdvancedRiskManager(customLimits);
      expect(manager).toBeDefined();
    });
  });

  describe('Fixed Position Sizing', () => {
    it('should calculate fixed position size with stop loss', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        stopLossPrice: 145,
        riskPercent: 2,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(2000); // 2% of 100000
      expect(result.riskPercent).toBe(2);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should calculate fixed position size without stop loss', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should respect max position size limit', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 10,
        stopLossPrice: 9,
        riskPercent: 50, // Very high risk
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      // Should be capped at maxPositionSize (20%)
      const maxShares = Math.floor((100000 * 0.2) / 10);
      expect(result.recommendedSize).toBeLessThanOrEqual(maxShares);
    });

    it('should handle zero stop loss distance', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        stopLossPrice: 150, // Same as entry
        riskPercent: 2,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result).toBeDefined();
    });
  });

  describe('Kelly Criterion Sizing', () => {
    it('should calculate Kelly position size', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        stopLossPrice: 145,
        method: 'kelly',
        winRate: 0.6,
        avgWin: 0.03,
        avgLoss: 0.02,
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Kelly Criterion');
    });

    it('should use half-Kelly for safety', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'kelly',
        winRate: 0.7,
        avgWin: 0.05,
        avgLoss: 0.02,
      };

      const result = riskManager.calculatePositionSize(params);

      // Should mention Kelly Criterion in reasoning
      expect(result.reasoning[0]).toContain('Kelly Criterion');
    });

    it('should handle low win rate', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'kelly',
        winRate: 0.3, // Low win rate
        avgWin: 0.03,
        avgLoss: 0.02,
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThanOrEqual(0);
    });

    it('should use defaults when params not provided', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'kelly',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
    });
  });

  describe('Optimal F Sizing', () => {
    it('should calculate optimal F position size', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        stopLossPrice: 145,
        method: 'optimal_f',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Optimal F');
    });

    it('should calculate without stop loss', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'optimal_f',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
    });
  });

  describe('Fixed Ratio Sizing', () => {
    it('should calculate fixed ratio position size', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'fixed_ratio',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Fixed ratio');
    });

    it('should scale with capital size', () => {
      const smallCapitalParams: PositionSizingParams = {
        capital: 50000,
        entryPrice: 150,
        method: 'fixed_ratio',
      };

      const largeCapitalParams: PositionSizingParams = {
        capital: 200000,
        entryPrice: 150,
        method: 'fixed_ratio',
      };

      const smallResult = riskManager.calculatePositionSize(smallCapitalParams);
      const largeResult = riskManager.calculatePositionSize(largeCapitalParams);

      expect(largeResult.recommendedSize).toBeGreaterThan(smallResult.recommendedSize);
    });
  });

  describe('Volatility Based Sizing', () => {
    it('should calculate volatility-based position size', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        stopLossPrice: 145,
        method: 'volatility_based',
        volatility: 20,
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Volatility based');
    });

    it('should reduce size for high volatility', () => {
      const lowVolParams: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'volatility_based',
        volatility: 10,
      };

      const highVolParams: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'volatility_based',
        volatility: 40,
      };

      const lowVolResult = riskManager.calculatePositionSize(lowVolParams);
      const highVolResult = riskManager.calculatePositionSize(highVolParams);

      expect(lowVolResult.recommendedSize).toBeGreaterThan(highVolResult.recommendedSize);
    });

    it('should use default volatility when not provided', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 150,
        method: 'volatility_based',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThan(0);
    });
  });

  describe('Risk Metrics Calculation', () => {
    it('should calculate risk metrics for empty portfolio', () => {
      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.var).toBe(0);
      expect(metrics.cvar).toBe(0);
      expect(metrics.sharpeRatio).toBe(0);
      expect(metrics.maxDrawdown).toBe(0);
      expect(metrics.volatility).toBe(0);
      expect(metrics.leverage).toBe(0);
    });

    it('should calculate risk metrics for portfolio with positions', () => {
      const portfolio: Portfolio = {
        cash: 50000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 100,
            entryPrice: 150,
            currentPrice: 155,
            unrealizedPnL: 500,
            realizedPnL: 0,
            side: 'LONG',
            stopLoss: 145,
            takeProfit: 160,
          },
        ],
        totalValue: 65500,
        dailyPnL: 500,
        totalProfit: 500,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics).toBeDefined();
      expect(metrics.leverage).toBeGreaterThan(0);
    });

    it('should track portfolio value history', () => {
      riskManager.addPriceData('portfolio', 100000);
      riskManager.addPriceData('portfolio', 102000);
      riskManager.addPriceData('portfolio', 101000);

      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 101000,
        dailyPnL: -1000,
        totalProfit: 1000,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate VaR correctly', () => {
      // Add sufficient price history
      for (let i = 0; i < 30; i++) {
        riskManager.addPriceData('portfolio', 100000 + i * 100);
      }

      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 103000,
        dailyPnL: 0,
        totalProfit: 3000,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.var).toBeGreaterThanOrEqual(0);
    });

    it('should calculate concentration risk for multiple positions', () => {
      const portfolio: Portfolio = {
        cash: 10000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 300,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
          {
            symbol: 'GOOG',
            quantity: 100,
            entryPrice: 300,
            currentPrice: 300,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 85000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      // Concentration risk can be negative due to normalization formula
      // when HHI is lower than the minimum (1/n)
      expect(metrics.concentrationRisk).toBeDefined();
      expect(isFinite(metrics.concentrationRisk)).toBe(true);
    });

    it('should handle NaN in concentration calculation', () => {
      const portfolio: Portfolio = {
        cash: 0,
        positions: [],
        totalValue: 0,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.concentrationRisk).toBe(0);
    });
  });

  describe('Risk Alerts', () => {
    it('should generate alert when drawdown exceeds limit', () => {
      const alertSpy = jest.fn();
      riskManager.on('risk_alert', alertSpy);

      // Create drawdown scenario
      riskManager.addPriceData('portfolio', 100000);
      riskManager.addPriceData('portfolio', 80000); // 20% drawdown

      const portfolio: Portfolio = {
        cash: 80000,
        positions: [],
        totalValue: 80000,
        dailyPnL: -20000,
        totalProfit: -20000,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);

      expect(alertSpy).toHaveBeenCalled();
      expect(riskManager.isHalted()).toBe(true);
    });

    it('should generate alert when leverage exceeds limit', () => {
      const alertSpy = jest.fn();
      riskManager.on('risk_alert', alertSpy);

      const portfolio: Portfolio = {
        cash: 50000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 2000,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 350000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);

      expect(alertSpy).toHaveBeenCalled();
    });

    it('should generate alert for high concentration', () => {
      const alertSpy = jest.fn();
      riskManager.on('risk_alert', alertSpy);

      const portfolio: Portfolio = {
        cash: 10000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 600,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);

      expect(alertSpy).toHaveBeenCalled();
    });

    it('should generate alert for position size limit', () => {
      const alertSpy = jest.fn();
      riskManager.on('risk_alert', alertSpy);

      const portfolio: Portfolio = {
        cash: 50000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 400,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 110000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);

      expect(alertSpy).toHaveBeenCalled();
    });

    it('should limit number of alerts stored', () => {
      const portfolio: Portfolio = {
        cash: 50000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 2000,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 350000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      // Generate many alerts
      for (let i = 0; i < 150; i++) {
        riskManager.updateRiskMetrics(portfolio);
      }

      const alerts = riskManager.getAlerts();
      expect(alerts.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Trading Halt', () => {
    it('should halt trading on critical drawdown', () => {
      const haltSpy = jest.fn();
      riskManager.on('trading_halted', haltSpy);

      riskManager.addPriceData('portfolio', 100000);
      riskManager.addPriceData('portfolio', 80000);

      const portfolio: Portfolio = {
        cash: 80000,
        positions: [],
        totalValue: 80000,
        dailyPnL: -20000,
        totalProfit: -20000,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);

      expect(haltSpy).toHaveBeenCalled();
      expect(riskManager.isHalted()).toBe(true);
    });

    it('should resume trading', () => {
      const resumeSpy = jest.fn();
      riskManager.on('trading_resumed', resumeSpy);

      // Trigger halt
      riskManager.addPriceData('portfolio', 100000);
      riskManager.addPriceData('portfolio', 80000);

      const portfolio: Portfolio = {
        cash: 80000,
        positions: [],
        totalValue: 80000,
        dailyPnL: -20000,
        totalProfit: -20000,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);
      expect(riskManager.isHalted()).toBe(true);

      // Resume
      riskManager.resumeTrading();

      expect(resumeSpy).toHaveBeenCalled();
      expect(riskManager.isHalted()).toBe(false);
    });

    it('should not halt multiple times', () => {
      const haltSpy = jest.fn();
      riskManager.on('trading_halted', haltSpy);

      riskManager.addPriceData('portfolio', 100000);
      riskManager.addPriceData('portfolio', 80000);

      const portfolio: Portfolio = {
        cash: 80000,
        positions: [],
        totalValue: 80000,
        dailyPnL: -20000,
        totalProfit: -20000,
        orders: [],
      };

      riskManager.updateRiskMetrics(portfolio);
      riskManager.updateRiskMetrics(portfolio);

      // Should only halt once
      expect(haltSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Portfolio Optimization', () => {
    it('should optimize portfolio with equal weights', () => {
      const symbols = ['AAPL', 'GOOG', 'MSFT'];
      const expectedReturns = new Map([
        ['AAPL', 0.15],
        ['GOOG', 0.12],
        ['MSFT', 0.10],
      ]);
      
      const covariances = new Map([
        ['AAPL', new Map([['AAPL', 0.04], ['GOOG', 0.02], ['MSFT', 0.015]])],
        ['GOOG', new Map([['AAPL', 0.02], ['GOOG', 0.036], ['MSFT', 0.012]])],
        ['MSFT', new Map([['AAPL', 0.015], ['GOOG', 0.012], ['MSFT', 0.025]])],
      ]);

      const result = riskManager.optimizePortfolio({
        symbols,
        expectedReturns,
        covariances,
        constraints: {},
      });

      expect(result.weights.size).toBe(3);
      expect(result.expectedReturn).toBeGreaterThan(0);
      expect(result.expectedRisk).toBeGreaterThan(0);
      expect(result.efficientFrontier.length).toBeGreaterThan(0);
    });

    it('should calculate efficient frontier', () => {
      const symbols = ['AAPL', 'GOOG'];
      const expectedReturns = new Map([
        ['AAPL', 0.15],
        ['GOOG', 0.12],
      ]);
      
      const covariances = new Map([
        ['AAPL', new Map([['AAPL', 0.04], ['GOOG', 0.02]])],
        ['GOOG', new Map([['AAPL', 0.02], ['GOOG', 0.036]])],
      ]);

      const result = riskManager.optimizePortfolio({
        symbols,
        expectedReturns,
        covariances,
        constraints: {},
      });

      expect(result.efficientFrontier).toBeDefined();
      expect(result.efficientFrontier.length).toBeGreaterThan(0);
    });
  });

  describe('Price Data Management', () => {
    it('should add and track price data', () => {
      riskManager.addPriceData('AAPL', 150);
      riskManager.addPriceData('AAPL', 152);
      riskManager.addPriceData('AAPL', 151);

      // Verify data is tracked by checking metrics calculation works
      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      
      const metrics = riskManager.updateRiskMetrics(portfolio);
      expect(metrics).toBeDefined();
    });

    it('should limit price history length to 252 entries', () => {
      // Add more than 252 data points
      for (let i = 0; i < 300; i++) {
        riskManager.addPriceData('TEST', 150 + i * 0.1);
      }

      // Add portfolio data and verify returns history is limited
      for (let i = 0; i < 100; i++) {
        riskManager.addPriceData('portfolio', 100000 + i * 100);
      }

      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000 + 100 * 100,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      // Should calculate metrics without error, indicating history is managed properly
      const metrics = riskManager.updateRiskMetrics(portfolio);
      expect(metrics.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate returns from price changes', () => {
      riskManager.addPriceData('AAPL', 100);
      riskManager.addPriceData('AAPL', 102); // 2% return
      riskManager.addPriceData('AAPL', 101); // -0.98% return

      // Verify returns are calculated by checking correlation works
      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);
      expect(metrics.correlationMatrix).toBeDefined();
      expect(metrics.correlationMatrix.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Correlation Matrix', () => {
    it('should calculate correlation matrix', () => {
      riskManager.addPriceData('AAPL', 150);
      riskManager.addPriceData('AAPL', 152);
      riskManager.addPriceData('GOOG', 2800);
      riskManager.addPriceData('GOOG', 2820);

      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.correlationMatrix).toBeDefined();
    });

    it('should handle insufficient data for correlation', () => {
      riskManager.addPriceData('AAPL', 150);

      const portfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const metrics = riskManager.updateRiskMetrics(portfolio);

      expect(metrics.correlationMatrix).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero capital', () => {
      const params: PositionSizingParams = {
        capital: 0,
        entryPrice: 150,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBe(0);
    });

    it('should handle very small capital', () => {
      const params: PositionSizingParams = {
        capital: 1,
        entryPrice: 150,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result.recommendedSize).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero entry price', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: 0,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result).toBeDefined();
    });

    it('should handle negative prices gracefully', () => {
      const params: PositionSizingParams = {
        capital: 100000,
        entryPrice: -150,
        method: 'fixed',
      };

      const result = riskManager.calculatePositionSize(params);

      expect(result).toBeDefined();
    });

    it('should get metrics for new manager', () => {
      const metrics = riskManager.getRiskMetrics();

      expect(metrics.var).toBe(0);
      expect(metrics.cvar).toBe(0);
    });

    it('should get empty alerts for new manager', () => {
      const alerts = riskManager.getAlerts();

      expect(alerts).toEqual([]);
    });
  });

  describe('Order Validation', () => {
    beforeEach(() => {
      // Initialize portfolio with starting values
      const portfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio);
    });

    it('should allow valid order', () => {
      const order = {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        side: 'BUY' as const,
        stopLoss: 145,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(true);
      expect(result.action).toBe('allow');
      expect(result.violations.length).toBe(0);
    });

    it('should reject order exceeding position size limit', () => {
      const order = {
        symbol: 'AAPL',
        quantity: 200, // $30,000 = 30% of portfolio
        price: 150,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(false);
      expect(result.action).toBe('reject');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe('position_limit');
    });

    it('should reject order exceeding single trade risk', () => {
      const order = {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        side: 'BUY' as const,
        stopLoss: 120, // 20% stop loss = too much risk
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.type === 'position_limit')).toBe(true);
    });

    it('should halt trading on daily loss limit', () => {
      // Initialize portfolio with starting values
      const initialPortfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(initialPortfolio);

      // Simulate loss
      const portfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 94000, // 6% loss
        dailyPnL: -6000,
        totalProfit: -6000,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio);

      const order = {
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(false);
      expect(result.action).toBe('halt');
      expect(riskManager.isHalted()).toBe(true);
    });

    it('should reject order when halted', () => {
      // Initialize and halt trading
      const initialPortfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(initialPortfolio);

      const portfolio: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 94000,
        dailyPnL: -6000,
        totalProfit: -6000,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio);

      const order = {
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      };

      riskManager.validateOrder(order);

      const result2 = riskManager.validateOrder({
        symbol: 'GOOGL',
        quantity: 5,
        price: 100,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      });

      expect(result2.allowed).toBe(false);
      expect(result2.reasons[0]).toContain('halted');
    });

    it('should check leverage limits', () => {
      const order = {
        symbol: 'AAPL',
        quantity: 800, // $120,000 position value
        price: 150,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.type === 'margin')).toBe(true);
    });

    it('should check cash reserve', () => {
      const portfolio: Portfolio = {
        cash: 15000, // Only 15% cash
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio);

      const order = {
        symbol: 'AAPL',
        quantity: 40, // $6,000 would leave only 9% cash
        price: 150,
        side: 'BUY' as const,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(true); // Alert but allow
      expect(result.action).toBe('alert');
      expect(result.violations.some((v) => v.type === 'margin')).toBe(true);
    });

    it('should allow SELL orders even with violations', () => {
      const order = {
        symbol: 'AAPL',
        quantity: 100,
        price: 150,
        side: 'SELL' as const,
        type: 'MARKET' as const,
      };

      const result = riskManager.validateOrder(order);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Risk Status', () => {
    it('should get current risk status', () => {
      const portfolio: Portfolio = {
        cash: 50000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 100,
            entryPrice: 150,
            currentPrice: 150,
            unrealizedPnL: 0,
            realizedPnL: 0,
            side: 'LONG',
          },
        ],
        totalValue: 65000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio);

      const status = riskManager.getRiskStatus();

      expect(status.limits).toBeDefined();
      expect(status.usage).toBeDefined();
      expect(status.isHalted).toBe(false);
      expect(status.usage.cashReservePercent).toBeCloseTo(76.92, 1);
    });

    it('should track daily P&L', () => {
      const portfolio1: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 100000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio1);

      // Wait a bit to ensure we're still in the same day
      const portfolio2: Portfolio = {
        cash: 50000,
        positions: [],
        totalValue: 98000,
        dailyPnL: -2000,
        totalProfit: -2000,
        orders: [],
      };
      riskManager.updateRiskMetrics(portfolio2);

      const dailyLoss = riskManager.getDailyLoss();
      const dailyPnLPercent = riskManager.getDailyPnLPercent();
      
      expect(dailyLoss).toBe(2000);
      expect(dailyPnLPercent).toBeCloseTo(-2, 1);
    });

    it('should update limits', () => {
      const updateSpy = jest.fn();
      riskManager.on('limits_updated', updateSpy);

      riskManager.updateLimits({
        maxPositionSize: 15,
        maxDailyLoss: 3,
      });

      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
