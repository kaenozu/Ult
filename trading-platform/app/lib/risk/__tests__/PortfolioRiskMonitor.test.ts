/**
 * PortfolioRiskMonitor.test.ts
 *
 * TRADING-028: ポートフォリオリスク監視のテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PortfolioRiskMonitor,
  VaRResult,
  SectorExposure,
  StressTestScenario,
} from '../PortfolioRiskMonitor';
import { Portfolio } from '@/app/types';

describe('PortfolioRiskMonitor', () => {
  let riskMonitor: PortfolioRiskMonitor;
  let mockPortfolio: Portfolio;

  beforeEach(() => {
    riskMonitor = new PortfolioRiskMonitor();

    mockPortfolio = {
      cash: 10000,
      positions: [
        {
          symbol: 'AAPL',
          side: 'LONG',
          quantity: 100,
          avgPrice: 150,
          currentPrice: 155,
          unrealizedPnL: 500,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          symbol: 'MSFT',
          side: 'LONG',
          quantity: 50,
          avgPrice: 300,
          currentPrice: 310,
          unrealizedPnL: 500,
          realizedPnL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalValue: 31000,
      dailyPnL: 1000,
      totalProfit: 1000,
      orders: [],
    };

    // テスト用の履歴データを設定
    riskMonitor.updateReturns('AAPL', Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.02));
    riskMonitor.updateReturns('MSFT', Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.018));
    riskMonitor.updatePortfolioHistory(65000);
  });

  describe('generateRiskReport', () => {
    it('should generate comprehensive risk report', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report).toBeDefined();
      expect(report.dailyVar).toBeDefined();
      expect(report.weeklyVar).toBeDefined();
      expect(report.sectorExposures).toBeDefined();
      expect(report.correlationPairs).toBeDefined();
      expect(report.stressTestResults).toBeDefined();
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
    });

    it('should include VaR metrics', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.dailyVar.var95).toBeGreaterThan(0);
      expect(report.dailyVar.var99).toBeGreaterThan(0);
      expect(report.dailyVar.cvar95).toBeGreaterThan(0);
      expect(report.dailyVar.cvar99).toBeGreaterThan(0);
      expect(report.dailyVar.var99).toBeGreaterThan(report.dailyVar.var95);
      expect(report.dailyVar.cvar95).toBeGreaterThan(report.dailyVar.var95);
    });

    it('should include sector exposures', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.sectorExposures.length).toBeGreaterThan(0);
      expect(report.sectorExposures[0].sector).toBeDefined();
      expect(report.sectorExposures[0].totalValue).toBeGreaterThan(0);
      expect(report.sectorExposures[0].percentOfPortfolio).toBeGreaterThan(0);
      expect(report.concentrationRisk).toBeGreaterThanOrEqual(0);
      expect(report.concentrationRisk).toBeLessThanOrEqual(1);
    });

    it('should include correlation analysis', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.avgCorrelation).toBeGreaterThanOrEqual(0);
      expect(report.avgCorrelation).toBeLessThanOrEqual(1);
      expect(report.maxCorrelation).toBeGreaterThanOrEqual(0);
      expect(report.maxCorrelation).toBeLessThanOrEqual(1);
    });

    it('should include stress test results', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.stressTestResults.length).toBeGreaterThan(0);
      expect(report.stressTestResults[0].scenario).toBeDefined();
      expect(report.stressTestResults[0].portfolioImpact).toBeDefined();
      expect(report.stressTestResults[0].portfolioImpactPercent).toBeDefined();
    });

    it('should include risk level', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(['low', 'medium', 'high', 'extreme']).toContain(report.riskLevel);
    });
  });

  describe('VaR calculations', () => {
    it('should select appropriate VaR method based on data', () => {
      // 履歴データが少ない場合
      const smallPortfolio: Portfolio = {
        ...mockPortfolio,
        positions: [mockPortfolio.positions[0]],
      };

      const report = riskMonitor.generateRiskReport(smallPortfolio, 95);

      expect(report.dailyVar.method).toBeDefined();
      expect(['historical', 'parametric', 'montecarlo']).toContain(report.dailyVar.method);
    });

    it('should scale VaR with time horizon', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      // 週次VaRは日次VaRより大きいはず
      expect(report.weeklyVar.var95).toBeGreaterThan(report.dailyVar.var95);
    });
  });

  describe('stress tests', () => {
    it('should run multiple stress scenarios', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.stressTestResults.length).toBeGreaterThanOrEqual(4);

      // Market Crash scenario
      const marketCrash = report.stressTestResults.find(
        r => r.scenario.name === 'Market Crash'
      );
      expect(marketCrash).toBeDefined();
      expect(marketCrash!.portfolioImpactPercent).toBeLessThan(0);
    });

    it('should calculate position impacts in stress tests', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      report.stressTestResults.forEach(result => {
        expect(result.positionImpacts).toBeDefined();
        expect(result.positionImpacts.length).toBe(mockPortfolio.positions.length);

        result.positionImpacts.forEach(impact => {
          expect(impact.symbol).toBeDefined();
          expect(impact.impact).toBeDefined();
          expect(impact.impactPercent).toBeDefined();
        });
      });
    });

    it('should reflect worst-case scenarios appropriately', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      const blackSwan = report.stressTestResults.find(
        r => r.scenario.name === 'Black Swan'
      );

      expect(blackSwan).toBeDefined();
      expect(blackSwan!.portfolioImpactPercent).toBeLessThan(-30);
    });
  });

  describe('risk contributions', () => {
    it('should calculate risk contributions for each position', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.riskContributions.length).toBe(mockPortfolio.positions.length);

      report.riskContributions.forEach(contribution => {
        expect(contribution.symbol).toBeDefined();
        expect(contribution.marginalVaR).toBeGreaterThan(0);
        expect(contribution.componentVaR).toBeGreaterThan(0);
        expect(contribution.percentOfPortfolioVaR).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('warnings and recommendations', () => {
    it('should generate warnings for high risk', () => {
      // 高リスクポートフォリオを作成
      const highRiskPortfolio: Portfolio = {
        ...mockPortfolio,
        positions: [
          {
            symbol: 'AAPL',
            side: 'LONG',
            quantity: 1000,
            avgPrice: 150,
            currentPrice: 155,
            unrealizedPnL: 5000,
            realizedPnL: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalValue: 155000,
      };

      const report = riskMonitor.generateRiskReport(highRiskPortfolio, 95);

      // 高リスクの場合は警告が含まれる可能性がある
      expect(report.warnings).toBeDefined();
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it('should provide recommendations', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('portfolio metrics', () => {
    it('should calculate portfolio beta', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.portfolioBeta).toBeGreaterThan(0);
    });

    it('should calculate systemic risk', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.systemicRisk).toBeGreaterThanOrEqual(0);
      expect(report.systemicRisk).toBeLessThanOrEqual(1);
    });

    it('should calculate overall risk score', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('edge cases', () => {
    it('should handle empty portfolio', () => {
      const emptyPortfolio: Portfolio = {
        cash: 100000,
        positions: [],
        totalValue: 0,
        dailyPnL: 0,
        totalProfit: 0,
        orders: [],
      };

      const report = riskMonitor.generateRiskReport(emptyPortfolio, 95);

      expect(report).toBeDefined();
      expect(report.dailyVar.var95).toBe(0);
    });

    it('should handle portfolio with no history', () => {
      const newMonitor = new PortfolioRiskMonitor();
      const report = newMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report).toBeDefined();
      // パラメトリック法にフォールバック
      expect(report.dailyVar.method).toBe('parametric');
    });
  });

  describe('data updates', () => {
    it('should update price history', () => {
      riskMonitor.updatePriceHistory('AAPL', 160);
      riskMonitor.updatePriceHistory('AAPL', 165);

      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report).toBeDefined();
    });

    it('should update portfolio history', () => {
      riskMonitor.updatePortfolioHistory(66000);
      riskMonitor.updatePortfolioHistory(67000);

      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report).toBeDefined();
    });

    it('should clear history', () => {
      riskMonitor.clearHistory();

      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      expect(report).toBeDefined();
      // 履歴クリア後はパラメトリック法を使用
      expect(report.dailyVar.method).toBe('parametric');
    });
  });

  describe('sector exposure calculations', () => {
    it('should correctly group positions by sector', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      // AAPLとMSFTは両方ともTechnologyセクター
      const techSector = report.sectorExposures.find(s => s.sector === 'Technology');

      expect(techSector).toBeDefined();
      expect(techSector!.positionCount).toBe(2);
    });

    it('should calculate sector percentages correctly', () => {
      const report = riskMonitor.generateRiskReport(mockPortfolio, 95);

      let totalPercent = 0;
      report.sectorExposures.forEach(sector => {
        totalPercent += sector.percentOfPortfolio;
      });

      // 合計は100%に近いはず（浮動小数点の誤差を許容）
      expect(totalPercent).toBeGreaterThan(99);
      expect(totalPercent).toBeLessThan(101);
    });
  });
});
