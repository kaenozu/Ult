/**
 * PerformanceReporter.ts
 * 
 * Automated report generation for trading performance.
 * Generates comprehensive reports in various formats with metrics, analysis, and visualizations.
 */

import {
  Trade,
  Portfolio,
  PerformanceReport,
  ReportConfig,
} from '@/app/types/performance';
import { PerformanceMetricsCalculator } from './PerformanceMetrics';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';

export class PerformanceReporter {
  private metricsCalculator: PerformanceMetricsCalculator;
  private analyzer: PerformanceAnalyzer;

  constructor() {
    this.metricsCalculator = new PerformanceMetricsCalculator();
    this.analyzer = new PerformanceAnalyzer();
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(
    trades: Trade[],
    portfolio: Portfolio,
    config: ReportConfig
  ): PerformanceReport {
    // Filter trades based on period
    const filteredTrades = this.filterTradesByPeriod(trades, config);

    // Calculate metrics
    const metrics = this.metricsCalculator.calculateMetrics(filteredTrades, portfolio);

    // Perform analysis
    const analysis = this.analyzer.analyze(filteredTrades, portfolio);

    // Generate charts data
    const charts = this.generateCharts(filteredTrades, portfolio);

    const report: PerformanceReport = {
      id: this.generateReportId(),
      generatedAt: Date.now(),
      period: {
        start: config.startDate || portfolio.createdAt,
        end: config.endDate || Date.now(),
      },
      metrics,
      analysis,
      charts,
    };

    return report;
  }

  /**
   * Export report to JSON format
   */
  exportToJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to HTML format
   */
  exportToHTML(report: PerformanceReport): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Report - ${new Date(report.generatedAt).toLocaleDateString()}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
    }
    .section {
      background: white;
      padding: 25px;
      margin-bottom: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 {
      color: #667eea;
      margin-top: 0;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .metric-card {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .metric-label {
      font-size: 0.9em;
      color: #666;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #333;
    }
    .positive {
      color: #28a745;
    }
    .negative {
      color: #dc3545;
    }
    .recommendations {
      list-style: none;
      padding: 0;
    }
    .recommendations li {
      padding: 10px;
      margin: 10px 0;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      color: #666;
      margin-top: 30px;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Trading Performance Report</h1>
    <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
    <p>Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}</p>
  </div>

  <div class="section">
    <h2>Performance Summary</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Return</div>
        <div class="metric-value ${report.metrics.totalReturn >= 0 ? 'positive' : 'negative'}">
          ${(report.metrics.totalReturn * 100).toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Annualized Return</div>
        <div class="metric-value ${report.metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}">
          ${(report.metrics.annualizedReturn * 100).toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Win Rate</div>
        <div class="metric-value">
          ${(report.metrics.winRate * 100).toFixed(1)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Trades</div>
        <div class="metric-value">
          ${report.metrics.totalTrades}
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Risk-Adjusted Returns</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Sharpe Ratio</div>
        <div class="metric-value">${report.metrics.sharpeRatio.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sortino Ratio</div>
        <div class="metric-value">${report.metrics.sortinoRatio.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Calmar Ratio</div>
        <div class="metric-value">${report.metrics.calmarRatio.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Profit Factor</div>
        <div class="metric-value">${report.metrics.profitFactor.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Risk Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Max Drawdown</div>
        <div class="metric-value negative">
          ${(report.metrics.maxDrawdown * 100).toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Volatility</div>
        <div class="metric-value">
          ${(report.metrics.volatility * 100).toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Value at Risk (95%)</div>
        <div class="metric-value">
          ${(report.metrics.valueAtRisk * 100).toFixed(2)}%
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CVaR (95%)</div>
        <div class="metric-value">
          ${(report.metrics.conditionalValueAtRisk * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Trade Quality</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Average Win</div>
        <div class="metric-value positive">
          $${report.metrics.averageWin.toFixed(2)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Average Loss</div>
        <div class="metric-value negative">
          $${report.metrics.averageLoss.toFixed(2)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Win/Loss Ratio</div>
        <div class="metric-value">
          ${report.metrics.averageWinLossRatio.toFixed(2)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Expectancy</div>
        <div class="metric-value ${report.metrics.expectancy >= 0 ? 'positive' : 'negative'}">
          $${report.metrics.expectancy.toFixed(2)}
        </div>
      </div>
    </div>
  </div>

  ${report.analysis.recommendations.length > 0 ? `
  <div class="section">
    <h2>Recommendations</h2>
    <ul class="recommendations">
      ${report.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    <p>ULT Trading Platform - Performance Report</p>
    <p>Report ID: ${report.id}</p>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Generate report summary as text
   */
  generateSummary(report: PerformanceReport): string {
    const lines: string[] = [];

    lines.push('=== PERFORMANCE REPORT SUMMARY ===');
    lines.push('');
    lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push(`Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`);
    lines.push('');

    lines.push('--- Key Metrics ---');
    lines.push(`Total Return: ${(report.metrics.totalReturn * 100).toFixed(2)}%`);
    lines.push(`Annualized Return: ${(report.metrics.annualizedReturn * 100).toFixed(2)}%`);
    lines.push(`Win Rate: ${(report.metrics.winRate * 100).toFixed(1)}%`);
    lines.push(`Total Trades: ${report.metrics.totalTrades}`);
    lines.push(`Profit Factor: ${report.metrics.profitFactor.toFixed(2)}`);
    lines.push(`Sharpe Ratio: ${report.metrics.sharpeRatio.toFixed(2)}`);
    lines.push(`Max Drawdown: ${(report.metrics.maxDrawdown * 100).toFixed(2)}%`);
    lines.push('');

    if (report.analysis.recommendations.length > 0) {
      lines.push('--- Recommendations ---');
      report.analysis.recommendations.forEach((rec, i) => {
        lines.push(`${i + 1}. ${rec}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Filter trades by period configuration
   */
  private filterTradesByPeriod(trades: Trade[], config: ReportConfig): Trade[] {
    let startDate: number;
    let endDate: number = config.endDate || Date.now();

    if (config.period === 'custom') {
      startDate = config.startDate || 0;
    } else {
      startDate = this.calculatePeriodStart(config.period, endDate);
    }

    return trades.filter(t => t.timestamp >= startDate && t.timestamp <= endDate);
  }

  /**
   * Calculate period start date based on period type
   */
  private calculatePeriodStart(period: string, endDate: number): number {
    const date = new Date(endDate);

    switch (period) {
      case 'daily':
        date.setDate(date.getDate() - 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() - 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() - 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }

    return date.getTime();
  }

  /**
   * Generate chart data for visualizations
   */
  private generateCharts(trades: Trade[], portfolio: Portfolio): {
    equityCurve: Array<{ timestamp: number; value: number }>;
    drawdownCurve: Array<{ timestamp: number; drawdown: number }>;
    returns: number[];
  } {
    const equityCurve = portfolio.history.map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: snapshot.value,
    }));

    const drawdownCurve = this.calculateDrawdownCurve(portfolio);
    const returns = this.calculateDailyReturns(portfolio);

    return {
      equityCurve,
      drawdownCurve,
      returns,
    };
  }

  /**
   * Calculate drawdown curve
   */
  private calculateDrawdownCurve(portfolio: Portfolio): Array<{ timestamp: number; drawdown: number }> {
    const curve: Array<{ timestamp: number; drawdown: number }> = [];
    let peak = portfolio.initialValue;

    for (const snapshot of portfolio.history) {
      peak = Math.max(peak, snapshot.value);
      const drawdown = (peak - snapshot.value) / peak;
      curve.push({
        timestamp: snapshot.timestamp,
        drawdown,
      });
    }

    return curve;
  }

  /**
   * Calculate daily returns
   */
  private calculateDailyReturns(portfolio: Portfolio): number[] {
    const returns: number[] = [];
    let previousValue = portfolio.initialValue;

    for (const snapshot of portfolio.history) {
      const dailyReturn = (snapshot.value - previousValue) / previousValue;
      returns.push(dailyReturn);
      previousValue = snapshot.value;
    }

    return returns;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const performanceReporter = new PerformanceReporter();
