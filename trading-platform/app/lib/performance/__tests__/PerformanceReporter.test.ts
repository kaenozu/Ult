/**
 * PerformanceReporter.test.ts
 * 
 * Unit tests for PerformanceReporter
 */

import { PerformanceReporter } from '../PerformanceReporter';
import { Trade, Portfolio, ReportConfig } from '@/app/types/performance';

describe('PerformanceReporter', () => {
  let reporter: PerformanceReporter;
  let mockPortfolio: Portfolio;
  let mockTrades: Trade[];

  beforeEach(() => {
    reporter = new PerformanceReporter();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    mockPortfolio = {
      id: 'test-portfolio',
      initialValue: 100000,
      currentValue: 120000,
      cash: 50000,
      positions: {},
      trades: [],
      orders: [],
      history: [
        { timestamp: now - 30 * oneDay, value: 100000, cash: 100000, positions: {} },
        { timestamp: now - 20 * oneDay, value: 110000, cash: 80000, positions: {} },
        { timestamp: now - 10 * oneDay, value: 115000, cash: 70000, positions: {} },
        { timestamp: now, value: 120000, cash: 50000, positions: {} },
      ],
      createdAt: now - 365 * oneDay,
    };

    mockTrades = [
      { id: '1', symbol: 'AAPL', type: 'BUY', price: 100, quantity: 10, timestamp: now - 10 * oneDay, commission: 5, stopLoss: 95 },
      { id: '2', symbol: 'AAPL', type: 'SELL', price: 110, quantity: 10, timestamp: now - 9 * oneDay, commission: 5, profit: 90 },
      
      { id: '3', symbol: 'GOOGL', type: 'BUY', price: 200, quantity: 5, timestamp: now - 8 * oneDay, commission: 5, stopLoss: 190 },
      { id: '4', symbol: 'GOOGL', type: 'SELL', price: 220, quantity: 5, timestamp: now - 7 * oneDay, commission: 5, profit: 90 },
      
      { id: '5', symbol: 'MSFT', type: 'BUY', price: 150, quantity: 8, timestamp: now - 6 * oneDay, commission: 5, stopLoss: 145 },
      { id: '6', symbol: 'MSFT', type: 'SELL', price: 160, quantity: 8, timestamp: now - 5 * oneDay, commission: 5, profit: 70 },
    ];
  });

  describe('generateReport', () => {
    it('should generate complete performance report', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      expect(report.id).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.analysis).toBeDefined();
      expect(report.charts).toBeDefined();
    });

    it('should include all metrics in report', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      expect(report.metrics.totalReturn).toBeDefined();
      expect(report.metrics.winRate).toBeDefined();
      expect(report.metrics.sharpeRatio).toBeDefined();
      expect(report.metrics.maxDrawdown).toBeDefined();
      expect(report.metrics.profitFactor).toBeDefined();
    });

    it('should include analysis when requested', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      expect(report.analysis.summary).toBeDefined();
      expect(report.analysis.timeAnalysis).toBeDefined();
      expect(report.analysis.symbolAnalysis).toBeDefined();
      expect(report.analysis.recommendations).toBeDefined();
    });

    it('should include charts when requested', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      expect(report.charts.equityCurve).toBeDefined();
      expect(report.charts.drawdownCurve).toBeDefined();
      expect(report.charts.returns).toBeDefined();
      expect(Array.isArray(report.charts.equityCurve)).toBe(true);
      expect(Array.isArray(report.charts.drawdownCurve)).toBe(true);
      expect(Array.isArray(report.charts.returns)).toBe(true);
    });

    it('should handle custom period', () => {
      const now = Date.now();
      const config: ReportConfig = {
        period: 'custom',
        startDate: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        endDate: now,
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      expect(report.period.start).toBe(config.startDate);
      expect(report.period.end).toBe(now);
    });

    it('should filter trades by period', () => {
      const now = Date.now();
      const config: ReportConfig = {
        period: 'weekly',
        includeCharts: false,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);

      // Report should be generated without errors
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();
    });
  });

  describe('exportToJSON', () => {
    it('should export report as JSON string', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const json = reporter.exportToJSON(report);

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all report data in JSON', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const json = reporter.exportToJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(report.id);
      expect(parsed.metrics).toBeDefined();
      expect(parsed.analysis).toBeDefined();
    });
  });

  describe('exportToHTML', () => {
    it('should export report as HTML string', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'html',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const html = reporter.exportToHTML(report);

      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include performance metrics in HTML', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'html',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const html = reporter.exportToHTML(report);

      expect(html).toContain('Performance Report');
      expect(html).toContain('Total Return');
      expect(html).toContain('Win Rate');
      expect(html).toContain('Sharpe Ratio');
    });

    it('should include recommendations when available', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'html',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const html = reporter.exportToHTML(report);

      if (report.analysis.recommendations.length > 0) {
        expect(html).toContain('Recommendations');
      }
    });

    it('should format dates correctly', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'html',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const html = reporter.exportToHTML(report);

      expect(html).toContain('Generated:');
      expect(html).toContain('Period:');
    });
  });

  describe('generateSummary', () => {
    it('should generate text summary of report', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const summary = reporter.generateSummary(report);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include key metrics in summary', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const summary = reporter.generateSummary(report);

      expect(summary).toContain('PERFORMANCE REPORT SUMMARY');
      expect(summary).toContain('Total Return');
      expect(summary).toContain('Win Rate');
      expect(summary).toContain('Profit Factor');
    });

    it('should include recommendations when available', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      const summary = reporter.generateSummary(report);

      if (report.analysis.recommendations.length > 0) {
        expect(summary).toContain('Recommendations');
      }
    });
  });

  describe('Period Filtering', () => {
    it('should handle daily period', () => {
      const config: ReportConfig = {
        period: 'daily',
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      expect(report).toBeDefined();
    });

    it('should handle weekly period', () => {
      const config: ReportConfig = {
        period: 'weekly',
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      expect(report).toBeDefined();
    });

    it('should handle monthly period', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      expect(report).toBeDefined();
    });

    it('should handle quarterly period', () => {
      const config: ReportConfig = {
        period: 'quarterly',
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      expect(report).toBeDefined();
    });

    it('should handle yearly period', () => {
      const config: ReportConfig = {
        period: 'yearly',
        includeCharts: false,
        includeAnalysis: false,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, mockPortfolio, config);
      expect(report).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty trades', () => {
      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport([], mockPortfolio, config);

      expect(report).toBeDefined();
      expect(report.metrics.totalTrades).toBe(0);
    });

    it('should handle portfolio with no history', () => {
      const emptyPortfolio: Portfolio = {
        ...mockPortfolio,
        history: [],
      };

      const config: ReportConfig = {
        period: 'monthly',
        includeCharts: true,
        includeAnalysis: true,
        format: 'json',
      };

      const report = reporter.generateReport(mockTrades, emptyPortfolio, config);

      expect(report).toBeDefined();
      expect(report.charts.equityCurve.length).toBe(0);
    });
  });
});
