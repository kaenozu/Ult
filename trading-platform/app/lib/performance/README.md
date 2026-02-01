# Performance Monitoring and Metrics

This module provides comprehensive performance monitoring and analysis capabilities for trading systems. It includes advanced metrics calculations, real-time monitoring with alerts, detailed analysis, and automated report generation.

## Features

- **Advanced Performance Metrics**: Calculate 25+ trading performance metrics including Sharpe ratio, Sortino ratio, Calmar ratio, profit factor, and more
- **Real-Time Monitoring**: Monitor portfolio performance in real-time with configurable threshold-based alerts
- **Performance Analysis**: Analyze trading patterns by time, symbol, and performance characteristics
- **Automated Reports**: Generate comprehensive performance reports in JSON, HTML, or text format

## Installation

The performance monitoring modules are located in `app/lib/performance/` and can be imported as follows:

```typescript
import {
  performanceMetricsCalculator,
  createRealTimeMonitor,
  performanceAnalyzer,
  performanceReporter,
} from '@/app/lib/performance';
```

## Usage Examples

### 1. Calculate Performance Metrics

```typescript
import { performanceMetricsCalculator } from '@/app/lib/performance';
import type { Trade, Portfolio } from '@/app/types/performance';

// Your trades data
const trades: Trade[] = [
  {
    id: '1',
    symbol: 'AAPL',
    type: 'BUY',
    price: 150.00,
    quantity: 10,
    timestamp: Date.now() - 10000,
    commission: 5.00,
    stopLoss: 145.00,
  },
  {
    id: '2',
    symbol: 'AAPL',
    type: 'SELL',
    price: 160.00,
    quantity: 10,
    timestamp: Date.now(),
    commission: 5.00,
    profit: 90.00,
  },
  // ... more trades
];

// Your portfolio data
const portfolio: Portfolio = {
  id: 'my-portfolio',
  initialValue: 100000,
  currentValue: 120000,
  cash: 50000,
  positions: {},
  trades: trades,
  orders: [],
  history: [
    { timestamp: Date.now() - 86400000, value: 100000, cash: 100000, positions: {} },
    { timestamp: Date.now(), value: 120000, cash: 50000, positions: {} },
  ],
  createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
};

// Calculate metrics
const metrics = performanceMetricsCalculator.calculateMetrics(trades, portfolio);

console.log(`Total Return: ${(metrics.totalReturn * 100).toFixed(2)}%`);
console.log(`Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
console.log(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
console.log(`Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
console.log(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
```

### 2. Real-Time Monitoring with Alerts

```typescript
import { createRealTimeMonitor } from '@/app/lib/performance';
import type { Portfolio, MonitoringAlert } from '@/app/types/performance';

// Create monitor
const monitor = createRealTimeMonitor(portfolio);

// Configure thresholds
monitor.setThresholds({
  maxDailyLoss: 0.05,      // 5% daily loss limit
  maxDrawdown: 0.10,       // 10% max drawdown limit
  maxPositions: 20,        // Maximum 20 open positions
  maxRiskExposure: 0.80,   // 80% maximum risk exposure
});

// Listen for alerts
monitor.on('alert', (alert: MonitoringAlert) => {
  console.log(`[${alert.level.toUpperCase()}] ${alert.type}: ${alert.message}`);
  
  if (alert.level === 'critical') {
    // Take action for critical alerts
    // e.g., close all positions, send notification, etc.
  }
});

// Update portfolio periodically
setInterval(() => {
  const updatedPortfolio = getCurrentPortfolio(); // Your function to get current portfolio
  monitor.updatePortfolio(updatedPortfolio);
}, 60000); // Update every minute

// Update prices for unrealized P&L calculation
monitor.updatePrice('AAPL', 155.50);
monitor.updatePrice('GOOGL', 2800.00);

// Get current metrics
const currentMetrics = monitor.getCurrentMetrics();
console.log('Portfolio Value:', currentMetrics.portfolioValue);
console.log('Daily P&L:', currentMetrics.dailyPnL);
console.log('Open Positions:', currentMetrics.openPositions);

// Get alert statistics
const alertStats = monitor.getAlertStatistics();
console.log('Total Alerts:', alertStats.total);
console.log('Critical Alerts:', alertStats.byLevel.critical);
```

### 3. Analyze Trading Performance

```typescript
import { performanceAnalyzer } from '@/app/lib/performance';

// Analyze trades
const analysis = performanceAnalyzer.analyze(trades, portfolio);

// Summary metrics
console.log('=== Summary ===');
console.log(`Total Trades: ${analysis.summary.totalTrades}`);
console.log(`Win Rate: ${(analysis.summary.winRate * 100).toFixed(1)}%`);
console.log(`Profit Factor: ${analysis.summary.profitFactor.toFixed(2)}`);
console.log(`Expectancy: $${analysis.summary.expectancy.toFixed(2)}`);

// Time-based analysis
console.log('\n=== Best Trading Times ===');
console.log(`Best Hour: ${analysis.patterns.bestTradingHour}:00`);
console.log(`Best Day: ${analysis.patterns.bestTradingDay}`);

// Symbol analysis
console.log('\n=== Top Performing Symbols ===');
analysis.symbolAnalysis.slice(0, 5).forEach((symbol, index) => {
  console.log(`${index + 1}. ${symbol.symbol}: $${symbol.totalProfit.toFixed(2)} (${symbol.totalTrades} trades)`);
});

// Recommendations
console.log('\n=== Recommendations ===');
analysis.recommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec}`);
});
```

### 4. Generate Performance Reports

```typescript
import { performanceReporter } from '@/app/lib/performance';
import type { ReportConfig } from '@/app/types/performance';
import fs from 'fs';

// Configure report
const reportConfig: ReportConfig = {
  period: 'monthly',
  includeCharts: true,
  includeAnalysis: true,
  format: 'html',
};

// Generate report
const report = performanceReporter.generateReport(trades, portfolio, reportConfig);

// Export as JSON
const jsonReport = performanceReporter.exportToJSON(report);
fs.writeFileSync('performance-report.json', jsonReport);

// Export as HTML
const htmlReport = performanceReporter.exportToHTML(report);
fs.writeFileSync('performance-report.html', htmlReport);

// Generate text summary
const summary = performanceReporter.generateSummary(report);
console.log(summary);

// Custom period report
const customConfig: ReportConfig = {
  period: 'custom',
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  endDate: Date.now(),
  includeCharts: true,
  includeAnalysis: true,
  format: 'json',
};

const weeklyReport = performanceReporter.generateReport(trades, portfolio, customConfig);
```

## Performance Metrics Reference

### Basic Metrics
- **Total Return**: Overall portfolio return percentage
- **Annualized Return**: Return normalized to yearly basis
- **Win Rate**: Percentage of profitable trades
- **Total Trades**: Number of completed trade pairs

### Risk-Adjusted Metrics
- **Sharpe Ratio**: Risk-adjusted return (higher is better, >1 is good, >2 is excellent)
- **Sortino Ratio**: Similar to Sharpe but only considers downside volatility
- **Calmar Ratio**: Annualized return divided by maximum drawdown
- **Information Ratio**: Excess return per unit of tracking error
- **Treynor Ratio**: Excess return per unit of systematic risk (beta)

### Risk Metrics
- **Max Drawdown**: Maximum peak-to-trough decline
- **Average Drawdown**: Average of all drawdown periods
- **Volatility**: Annualized standard deviation of returns
- **Downside Deviation**: Volatility of negative returns only
- **Value at Risk (VaR)**: Maximum expected loss at 95% confidence
- **Conditional VaR (CVaR)**: Average loss beyond VaR threshold

### Trade Quality Metrics
- **Profit Factor**: Gross profit divided by gross loss (>1.5 is good)
- **Average Win**: Average profit per winning trade
- **Average Loss**: Average loss per losing trade
- **Win/Loss Ratio**: Average win divided by average loss
- **Largest Win**: Biggest winning trade
- **Largest Loss**: Biggest losing trade
- **Average Holding Period**: Average trade duration in days
- **Average R-Multiple**: Average profit/loss in terms of initial risk

### Efficiency Metrics
- **Expectancy**: Average expected profit per trade
- **Kelly Criterion**: Optimal position size for maximum growth
- **Risk of Ruin**: Probability of losing all capital
- **System Quality Number (SQN)**: Overall system quality metric

## Best Practices

1. **Collect Sufficient Data**: Ensure you have at least 30 trades before drawing conclusions from metrics
2. **Monitor Regularly**: Update real-time monitoring at least once per minute for active trading
3. **Set Realistic Thresholds**: Configure alert thresholds based on your risk tolerance and trading style
4. **Review Reports**: Generate and review performance reports weekly or monthly
5. **Act on Recommendations**: Pay attention to analysis recommendations and adjust strategy accordingly
6. **Track Multiple Metrics**: Don't rely on a single metric; consider the full picture
7. **Compare Against Benchmarks**: Compare your metrics against market indices or peer strategies

## API Reference

### PerformanceMetricsCalculator

```typescript
class PerformanceMetricsCalculator {
  calculateMetrics(trades: Trade[], portfolio: Portfolio): PerformanceMetrics;
  setRiskFreeRate(rate: number): void;
  getRiskFreeRate(): number;
}
```

### RealTimeMonitor

```typescript
class RealTimeMonitor extends EventEmitter {
  updatePortfolio(portfolio: Portfolio): void;
  recordTrade(trade: Trade): void;
  updatePrice(symbol: string, price: number): void;
  getCurrentMetrics(): MonitoringMetrics;
  getMetricsHistory(limit?: number): MonitoringMetrics[];
  getAlerts(level?: 'info' | 'warning' | 'critical'): MonitoringAlert[];
  clearAlerts(): void;
  setThresholds(thresholds: Partial<MonitoringThresholds>): void;
  getThresholds(): MonitoringThresholds;
  getAlertStatistics(): { total: number; byLevel: Record<string, number>; byType: Record<string, number> };
}
```

### PerformanceAnalyzer

```typescript
class PerformanceAnalyzer {
  analyze(trades: Trade[], portfolio: Portfolio): AnalysisResult;
}
```

### PerformanceReporter

```typescript
class PerformanceReporter {
  generateReport(trades: Trade[], portfolio: Portfolio, config: ReportConfig): PerformanceReport;
  exportToJSON(report: PerformanceReport): string;
  exportToHTML(report: PerformanceReport): string;
  generateSummary(report: PerformanceReport): string;
}
```

## Type Definitions

All type definitions are available in `@/app/types/performance`:

- `Trade`: Individual trade data
- `TradePair`: Matched buy/sell trade pair
- `Portfolio`: Portfolio state and history
- `PerformanceMetrics`: Complete metrics result
- `MonitoringAlert`: Alert data structure
- `MonitoringMetrics`: Real-time metrics snapshot
- `AnalysisResult`: Analysis result with patterns and recommendations
- `PerformanceReport`: Complete performance report
- `ReportConfig`: Report configuration options

## Troubleshooting

### Issue: Metrics show unexpected values

**Solution**: Verify that:
- Trade pairs are correctly matched (each BUY has corresponding SELL)
- Portfolio history includes sufficient data points
- Trade timestamps are in milliseconds
- Commission values are correctly included

### Issue: Alerts not firing

**Solution**: Check that:
- Thresholds are properly configured
- Portfolio is being updated regularly
- Alert listeners are properly attached before updates
- Portfolio values reflect actual changes

### Issue: Reports missing data

**Solution**: Ensure:
- Report period encompasses the trades you want to analyze
- Portfolio history covers the reporting period
- Configuration flags (includeCharts, includeAnalysis) are set correctly

## Contributing

When contributing to this module:

1. Maintain backward compatibility with existing APIs
2. Add tests for new metrics or functionality
3. Update this README with new features
4. Follow the existing code style and patterns
5. Ensure TypeScript types are properly defined

## License

This module is part of the ULT Trading Platform project.
