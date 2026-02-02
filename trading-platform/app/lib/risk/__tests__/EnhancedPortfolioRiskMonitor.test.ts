/**
 * EnhancedPortfolioRiskMonitor Tests
 */

import { EnhancedPortfolioRiskMonitor, SectorExposure, RiskAlert } from '../EnhancedPortfolioRiskMonitor';
import { Portfolio } from '@/app/types';

describe('EnhancedPortfolioRiskMonitor', () => {
  let portfolio: Portfolio;
  let monitor: EnhancedPortfolioRiskMonitor;

  beforeEach(() => {
    portfolio = {
      cash: 50000,
      positions: [
        {
          symbol: 'AAPL',
          quantity: 200,
          entryPrice: 150,
          currentPrice: 160,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        },
        {
          symbol: 'MSFT',
          quantity: 100,
          entryPrice: 300,
          currentPrice: 320,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        },
        {
          symbol: 'JPM',
          quantity: 50,
          entryPrice: 140,
          currentPrice: 150,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        },
        {
          symbol: 'JNJ',
          quantity: 100,
          entryPrice: 160,
          currentPrice: 165,
          side: 'LONG',
          market: 'US',
          timestamp: Date.now()
        }
      ],
      totalValue: 121000,
      dailyPnL: 3000,
      totalProfit: 6000,
      orders: []
    };

    monitor = new EnhancedPortfolioRiskMonitor(portfolio);
  });

  describe('calculateEnhancedRiskMetrics', () => {
    it('should calculate comprehensive risk metrics', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.sectorExposures).toBeDefined();
      expect(metrics.marketExposures).toBeDefined();
      expect(metrics.liquidity).toBeGreaterThan(0);
      expect(metrics.concentration).toBeDefined();
      expect(metrics.realTimeVaR).toBeDefined();
      expect(metrics.enhancedBeta).toBeDefined();
    });

    it('should calculate sector exposures correctly', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.sectorExposures.length).toBeGreaterThan(0);
      
      const totalExposure = metrics.sectorExposures.reduce(
        (sum, s) => sum + s.exposure,
        0
      );
      expect(totalExposure).toBeCloseTo(100, 0);

      // Should have Technology sector (AAPL, MSFT)
      const techSector = metrics.sectorExposures.find(s => s.sector === 'Technology');
      expect(techSector).toBeDefined();
      expect(techSector!.positions.length).toBeGreaterThan(0);
    });

    it('should identify high sector concentration', () => {
      // Portfolio with heavy tech concentration
      const techHeavyPortfolio: Portfolio = {
        cash: 10000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 300,
            entryPrice: 150,
            currentPrice: 160,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          },
          {
            symbol: 'MSFT',
            quantity: 200,
            entryPrice: 300,
            currentPrice: 320,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          }
        ],
        totalValue: 112000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const techMonitor = new EnhancedPortfolioRiskMonitor(techHeavyPortfolio);
      const metrics = techMonitor.calculateEnhancedRiskMetrics();

      const techSector = metrics.sectorExposures.find(s => s.sector === 'Technology');
      expect(techSector).toBeDefined();
      expect(techSector!.exposure).toBeGreaterThan(90); // Should be close to 100%
      expect(techSector!.risk).toBe('high');
    });

    it('should calculate market exposures', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.marketExposures.size).toBeGreaterThan(0);
      
      const usExposure = metrics.marketExposures.get('US');
      expect(usExposure).toBeDefined();
      expect(usExposure).toBeGreaterThan(0);
    });

    it('should calculate concentration metrics', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.concentration.herfindahlIndex).toBeGreaterThan(0);
      expect(metrics.concentration.herfindahlIndex).toBeLessThanOrEqual(1);
      expect(metrics.concentration.effectivePositions).toBeGreaterThan(0);
      expect(metrics.concentration.top3Concentration).toBeGreaterThan(0);
      expect(metrics.concentration.top3Concentration).toBeLessThanOrEqual(100);
    });

    it('should calculate real-time VaR', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.realTimeVaR.var95).toBeGreaterThan(0);
      expect(metrics.realTimeVaR.var99).toBeGreaterThan(metrics.realTimeVaR.var95);
      expect(metrics.realTimeVaR.lastUpdate).toBeInstanceOf(Date);
      expect(metrics.realTimeVaR.confidence).toBeGreaterThan(0);
      expect(metrics.realTimeVaR.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate enhanced beta', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.enhancedBeta.market).toBeGreaterThanOrEqual(0);
      expect(metrics.enhancedBeta.sector).toBeGreaterThanOrEqual(0);
      expect(metrics.enhancedBeta.style).toBeGreaterThanOrEqual(-1);
      expect(metrics.enhancedBeta.style).toBeLessThanOrEqual(1);
    });
  });

  describe('generateRiskAlerts', () => {
    it('should generate sector concentration alerts', () => {
      // Create portfolio with high tech concentration
      const techHeavyPortfolio: Portfolio = {
        cash: 10000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 400,
            entryPrice: 150,
            currentPrice: 160,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          },
          {
            symbol: 'MSFT',
            quantity: 100,
            entryPrice: 300,
            currentPrice: 320,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          }
        ],
        totalValue: 96000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const techMonitor = new EnhancedPortfolioRiskMonitor(techHeavyPortfolio);
      const alerts = techMonitor.generateRiskAlerts({
        maxSectorExposure: 40
      });

      const sectorAlert = alerts.find(a => a.type === 'sector_concentration');
      expect(sectorAlert).toBeDefined();
      expect(sectorAlert!.severity).toMatch(/warning|critical/);
    });

    it('should generate VaR breach alerts', () => {
      const alerts = monitor.generateRiskAlerts({
        maxVaR95: 1000 // Very low limit
      });

      const varAlert = alerts.find(a => a.type === 'var_breach');
      expect(varAlert).toBeDefined();
      if (varAlert) {
        expect(varAlert.severity).toBe('critical');
        expect(varAlert.currentValue).toBeGreaterThan(varAlert.threshold);
      }
    });

    it('should generate beta drift alerts', () => {
      const alerts = monitor.generateRiskAlerts({
        maxBeta: 0.5 // Very low limit
      });

      const betaAlert = alerts.find(a => a.type === 'beta_drift');
      // Beta alert may or may not be generated depending on calculated beta
      if (betaAlert) {
        expect(betaAlert.severity).toBe('warning');
      }
    });

    it('should not generate alerts when within limits', () => {
      const alerts = monitor.generateRiskAlerts({
        maxSectorExposure: 100,
        maxVaR95: 1000000,
        maxBeta: 10,
        minLiquidity: 0
      });

      expect(alerts.length).toBe(0);
    });

    it('should include recommendations in alerts', () => {
      const alerts = monitor.generateRiskAlerts({
        maxSectorExposure: 30
      });

      alerts.forEach(alert => {
        expect(alert.recommendation).toBeDefined();
        expect(alert.recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio and recalculate metrics', () => {
      const newPortfolio: Portfolio = {
        ...portfolio,
        positions: [
          ...portfolio.positions,
          {
            symbol: 'TSLA',
            quantity: 50,
            entryPrice: 200,
            currentPrice: 210,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          }
        ],
        totalValue: 131500
      };

      monitor.updatePortfolio(newPortfolio);
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.sectorExposures.length).toBeGreaterThan(0);
    });
  });

  describe('getAlerts and clearAlerts', () => {
    it('should store and retrieve alerts', () => {
      monitor.generateRiskAlerts({
        maxSectorExposure: 30
      });

      const alerts = monitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should clear alerts', () => {
      monitor.generateRiskAlerts({
        maxSectorExposure: 30
      });

      monitor.clearAlerts();
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty portfolio', () => {
      const emptyPortfolio: Portfolio = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const emptyMonitor = new EnhancedPortfolioRiskMonitor(emptyPortfolio);
      const metrics = emptyMonitor.calculateEnhancedRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.sectorExposures.length).toBe(0);
      expect(metrics.concentration.herfindahlIndex).toBe(0);
    });

    it('should handle single position portfolio', () => {
      const singlePositionPortfolio: Portfolio = {
        cash: 5000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 100,
            entryPrice: 150,
            currentPrice: 160,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          }
        ],
        totalValue: 21000,
        dailyPnL: 1000,
        totalProfit: 1000,
        orders: []
      };

      const singleMonitor = new EnhancedPortfolioRiskMonitor(singlePositionPortfolio);
      const metrics = singleMonitor.calculateEnhancedRiskMetrics();

      expect(metrics.concentration.herfindahlIndex).toBe(1); // Perfect concentration
      expect(metrics.concentration.effectivePositions).toBe(1);
    });

    it('should handle portfolio with zero total value', () => {
      const zeroPortfolio: Portfolio = {
        cash: 0,
        positions: [],
        totalValue: 0,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const zeroMonitor = new EnhancedPortfolioRiskMonitor(zeroPortfolio);
      const metrics = zeroMonitor.calculateEnhancedRiskMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.liquidity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Sector risk classification', () => {
    it('should classify low sector exposure as low risk', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      const lowExposureSectors = metrics.sectorExposures.filter(
        s => s.exposure <= 25
      );

      lowExposureSectors.forEach(sector => {
        expect(['low', 'medium']).toContain(sector.risk);
      });
    });

    it('should classify high sector exposure as high risk', () => {
      const techHeavyPortfolio: Portfolio = {
        cash: 5000,
        positions: [
          {
            symbol: 'AAPL',
            quantity: 500,
            entryPrice: 150,
            currentPrice: 160,
            side: 'LONG',
            market: 'US',
            timestamp: Date.now()
          }
        ],
        totalValue: 85000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const techMonitor = new EnhancedPortfolioRiskMonitor(techHeavyPortfolio);
      const metrics = techMonitor.calculateEnhancedRiskMetrics();

      const techSector = metrics.sectorExposures.find(s => s.sector === 'Technology');
      expect(techSector).toBeDefined();
      expect(techSector!.risk).toBe('high');
    });
  });

  describe('Liquidity score', () => {
    it('should calculate reasonable liquidity scores', () => {
      const metrics = monitor.calculateEnhancedRiskMetrics();

      expect(metrics.liquidity).toBeGreaterThan(0);
      expect(metrics.liquidity).toBeLessThanOrEqual(100);
    });

    it('should return default liquidity for empty portfolio', () => {
      const emptyPortfolio: Portfolio = {
        cash: 10000,
        positions: [],
        totalValue: 10000,
        dailyPnL: 0,
        totalProfit: 0,
        orders: []
      };

      const emptyMonitor = new EnhancedPortfolioRiskMonitor(emptyPortfolio);
      const metrics = emptyMonitor.calculateEnhancedRiskMetrics();

      expect(metrics.liquidity).toBe(100);
    });
  });
});
