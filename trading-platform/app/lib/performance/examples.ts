/**
 * Performance Monitoring Example
 * 
 * Demonstrates how to use the performance monitoring and metrics system
 */

import {
  performanceMetricsCalculator,
  createRealTimeMonitor,
  performanceAnalyzer,
  performanceReporter,
} from './index';

import type {
  Trade,
  Portfolio,
  PerformanceMetrics,
  MonitoringAlert,
  AnalysisResult,
  PerformanceReport,
  ReportConfig,
} from '@/app/types/performance';

// ============================================================================
// Example 1: Calculate Performance Metrics
// ============================================================================

function example1_calculateMetrics(): void {
  console.log('\n=== Example 1: Calculate Performance Metrics ===\n');

  // Sample trades data
  const trades: Trade[] = [
    // Winning trade on AAPL
    { id: '1', symbol: 'AAPL', type: 'BUY', price: 150.00, quantity: 10, timestamp: Date.now() - 100000, commission: 5.00, stopLoss: 145.00 },
    { id: '2', symbol: 'AAPL', type: 'SELL', price: 160.00, quantity: 10, timestamp: Date.now() - 90000, commission: 5.00, profit: 90.00 },
    
    // Winning trade on GOOGL
    { id: '3', symbol: 'GOOGL', type: 'BUY', price: 2000.00, quantity: 5, timestamp: Date.now() - 80000, commission: 10.00, stopLoss: 1950.00 },
    { id: '4', symbol: 'GOOGL', type: 'SELL', price: 2100.00, quantity: 5, timestamp: Date.now() - 70000, commission: 10.00, profit: 480.00 },
    
    // Losing trade on MSFT
    { id: '5', symbol: 'MSFT', type: 'BUY', price: 300.00, quantity: 8, timestamp: Date.now() - 60000, commission: 5.00, stopLoss: 290.00 },
    { id: '6', symbol: 'MSFT', type: 'SELL', price: 285.00, quantity: 8, timestamp: Date.now() - 50000, commission: 5.00, profit: -130.00 },
  ];

  // Portfolio data
  const portfolio: Portfolio = {
    id: 'example-portfolio',
    initialValue: 100000,
    currentValue: 100440, // Initial + profits
    cash: 90440,
    positions: {},
    trades: trades,
    orders: [],
    history: [
      { timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, value: 100000, cash: 100000, positions: {} },
      { timestamp: Date.now() - 180 * 24 * 60 * 60 * 1000, value: 102000, cash: 92000, positions: {} },
      { timestamp: Date.now(), value: 100440, cash: 90440, positions: {} },
    ],
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  };

  // Calculate metrics
  const metrics: PerformanceMetrics = performanceMetricsCalculator.calculateMetrics(trades, portfolio);

  // Display results
  console.log('Basic Metrics:');
  console.log(`  Total Return: ${(metrics.totalReturn * 100).toFixed(2)}%`);
  console.log(`  Annualized Return: ${(metrics.annualizedReturn * 100).toFixed(2)}%`);
  console.log(`  Total Trades: ${metrics.totalTrades}`);
  console.log(`  Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`  Winning Trades: ${metrics.winningTrades}`);
  console.log(`  Losing Trades: ${metrics.losingTrades}`);
  
  console.log('\nRisk-Adjusted Metrics:');
  console.log(`  Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
  console.log(`  Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}`);
  console.log(`  Calmar Ratio: ${metrics.calmarRatio.toFixed(2)}`);
  
  console.log('\nRisk Metrics:');
  console.log(`  Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  Volatility: ${(metrics.volatility * 100).toFixed(2)}%`);
  console.log(`  Value at Risk (95%): ${(metrics.valueAtRisk * 100).toFixed(2)}%`);
  
  console.log('\nTrade Quality:');
  console.log(`  Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
  console.log(`  Average Win: $${metrics.averageWin.toFixed(2)}`);
  console.log(`  Average Loss: $${metrics.averageLoss.toFixed(2)}`);
  console.log(`  Win/Loss Ratio: ${metrics.averageWinLossRatio.toFixed(2)}`);
  
  console.log('\nEfficiency:');
  console.log(`  Expectancy: $${metrics.expectancy.toFixed(2)}`);
  console.log(`  Kelly Criterion: ${(metrics.kellyCriterion * 100).toFixed(2)}%`);
  console.log(`  System Quality Number: ${metrics.SQN.toFixed(2)}`);
}

// ============================================================================
// Example 2: Real-Time Monitoring with Alerts
// ============================================================================

function example2_realTimeMonitoring(): void {
  console.log('\n=== Example 2: Real-Time Monitoring ===\n');

  const portfolio: Portfolio = {
    id: 'monitored-portfolio',
    initialValue: 100000,
    currentValue: 95000, // Down 5%
    cash: 50000,
    positions: {
      'AAPL': {
        symbol: 'AAPL',
        quantity: 100,
        entryPrice: 150.00,
        currentPrice: 145.00,
        stopLoss: 140.00,
      },
      'GOOGL': {
        symbol: 'GOOGL',
        quantity: 10,
        entryPrice: 2000.00,
        currentPrice: 2050.00,
        stopLoss: 1950.00,
      },
    },
    trades: [],
    orders: [
      { id: '1', symbol: 'MSFT', type: 'LIMIT', side: 'BUY', quantity: 20, price: 300.00, status: 'OPEN' },
    ],
    history: [
      { timestamp: Date.now() - 1000, value: 100000, cash: 50000, positions: {} },
    ],
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  };

  // Create monitor
  const monitor = createRealTimeMonitor(portfolio);

  // Configure thresholds
  monitor.setThresholds({
    maxDailyLoss: 0.02,      // 2% alert
    maxDrawdown: 0.08,       // 8% alert
    maxPositions: 15,
    maxRiskExposure: 0.70,
  });

  // Set up alert handling
  monitor.on('alert', (alert: MonitoringAlert) => {
    const emoji = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${alert.level.toUpperCase()}] ${alert.type}`);
    console.log(`   ${alert.message}`);
    console.log(`   Timestamp: ${new Date(alert.timestamp).toISOString()}`);
  });

  // Update prices
  monitor.updatePrice('AAPL', 145.00);
  monitor.updatePrice('GOOGL', 2050.00);

  // Update portfolio (this will trigger alerts)
  monitor.updatePortfolio(portfolio);

  // Get current metrics
  const metrics = monitor.getCurrentMetrics();
  console.log('\nCurrent Metrics:');
  console.log(`  Portfolio Value: $${metrics.portfolioValue.toLocaleString()}`);
  console.log(`  Daily P&L: $${metrics.dailyPnL.toFixed(2)}`);
  console.log(`  Daily Return: ${(metrics.dailyReturn * 100).toFixed(2)}%`);
  console.log(`  Open Positions: ${metrics.openPositions}`);
  console.log(`  Active Orders: ${metrics.activeOrders}`);
  console.log(`  Unrealized P&L: $${metrics.unrealizedPnL.toFixed(2)}`);
  console.log(`  Risk Exposure: ${(metrics.riskExposure * 100).toFixed(2)}%`);

  // Get alert statistics
  const stats = monitor.getAlertStatistics();
  console.log('\nAlert Statistics:');
  console.log(`  Total Alerts: ${stats.total}`);
  console.log(`  Critical: ${stats.byLevel.critical}`);
  console.log(`  Warning: ${stats.byLevel.warning}`);
  console.log(`  Info: ${stats.byLevel.info}`);
}

// ============================================================================
// Example 3: Performance Analysis
// ============================================================================

function example3_performanceAnalysis(): void {
  console.log('\n=== Example 3: Performance Analysis ===\n');

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Generate sample trades over different days and times
  const trades: Trade[] = [
    // Monday morning - AAPL win
    { id: '1', symbol: 'AAPL', type: 'BUY', price: 150, quantity: 10, timestamp: now - 7 * oneDay, commission: 5, stopLoss: 145 },
    { id: '2', symbol: 'AAPL', type: 'SELL', price: 155, quantity: 10, timestamp: now - 6.5 * oneDay, commission: 5, profit: 40 },
    
    // Tuesday afternoon - GOOGL win
    { id: '3', symbol: 'GOOGL', type: 'BUY', price: 2000, quantity: 5, timestamp: now - 6 * oneDay, commission: 10, stopLoss: 1950 },
    { id: '4', symbol: 'GOOGL', type: 'SELL', price: 2050, quantity: 5, timestamp: now - 5.5 * oneDay, commission: 10, profit: 230 },
    
    // Wednesday - MSFT loss
    { id: '5', symbol: 'MSFT', type: 'BUY', price: 300, quantity: 8, timestamp: now - 5 * oneDay, commission: 5, stopLoss: 290 },
    { id: '6', symbol: 'MSFT', type: 'SELL', price: 290, quantity: 8, timestamp: now - 4.5 * oneDay, commission: 5, profit: -90 },
    
    // Thursday - AAPL win
    { id: '7', symbol: 'AAPL', type: 'BUY', price: 152, quantity: 10, timestamp: now - 4 * oneDay, commission: 5, stopLoss: 147 },
    { id: '8', symbol: 'AAPL', type: 'SELL', price: 157, quantity: 10, timestamp: now - 3.5 * oneDay, commission: 5, profit: 40 },
    
    // Friday - TSLA loss
    { id: '9', symbol: 'TSLA', type: 'BUY', price: 200, quantity: 15, timestamp: now - 3 * oneDay, commission: 8, stopLoss: 195 },
    { id: '10', symbol: 'TSLA', type: 'SELL', price: 195, quantity: 15, timestamp: now - 2.5 * oneDay, commission: 8, profit: -91 },
  ];

  const portfolio: Portfolio = {
    id: 'analysis-portfolio',
    initialValue: 100000,
    currentValue: 100129,
    cash: 95129,
    positions: {},
    trades,
    orders: [],
    history: [],
    createdAt: now - 30 * oneDay,
  };

  // Perform analysis
  const analysis: AnalysisResult = performanceAnalyzer.analyze(trades, portfolio);

  // Display summary
  console.log('Summary:');
  console.log(`  Total Trades: ${analysis.summary.totalTrades}`);
  console.log(`  Win Rate: ${(analysis.summary.winRate * 100).toFixed(1)}%`);
  console.log(`  Profit Factor: ${analysis.summary.profitFactor.toFixed(2)}`);
  console.log(`  Expectancy: $${analysis.summary.expectancy.toFixed(2)}`);

  // Display patterns
  console.log('\nPatterns:');
  console.log(`  Max Consecutive Wins: ${analysis.patterns.consecutiveWins}`);
  console.log(`  Max Consecutive Losses: ${analysis.patterns.consecutiveLosses}`);
  console.log(`  Best Trading Hour: ${analysis.patterns.bestTradingHour}:00`);
  console.log(`  Worst Trading Hour: ${analysis.patterns.worstTradingHour}:00`);
  console.log(`  Best Trading Day: ${analysis.patterns.bestTradingDay}`);
  console.log(`  Worst Trading Day: ${analysis.patterns.worstTradingDay}`);

  // Display symbol analysis
  console.log('\nSymbol Performance:');
  analysis.symbolAnalysis.forEach((symbol, index) => {
    console.log(`  ${index + 1}. ${symbol.symbol}:`);
    console.log(`     Trades: ${symbol.totalTrades}`);
    console.log(`     Win Rate: ${(symbol.winRate * 100).toFixed(1)}%`);
    console.log(`     Profit Factor: ${symbol.profitFactor.toFixed(2)}`);
    console.log(`     Total Profit: $${symbol.totalProfit.toFixed(2)}`);
  });

  // Display recommendations
  console.log('\nRecommendations:');
  analysis.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
}

// ============================================================================
// Example 4: Generate Performance Report
// ============================================================================

function example4_generateReport(): void {
  console.log('\n=== Example 4: Generate Performance Report ===\n');

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Sample data
  const trades: Trade[] = [
    { id: '1', symbol: 'AAPL', type: 'BUY', price: 150, quantity: 10, timestamp: now - 30 * oneDay, commission: 5, stopLoss: 145 },
    { id: '2', symbol: 'AAPL', type: 'SELL', price: 160, quantity: 10, timestamp: now - 29 * oneDay, commission: 5, profit: 90 },
    { id: '3', symbol: 'GOOGL', type: 'BUY', price: 2000, quantity: 5, timestamp: now - 20 * oneDay, commission: 10, stopLoss: 1950 },
    { id: '4', symbol: 'GOOGL', type: 'SELL', price: 2100, quantity: 5, timestamp: now - 19 * oneDay, commission: 10, profit: 480 },
    { id: '5', symbol: 'MSFT', type: 'BUY', price: 300, quantity: 8, timestamp: now - 10 * oneDay, commission: 5, stopLoss: 290 },
    { id: '6', symbol: 'MSFT', type: 'SELL', price: 285, quantity: 8, timestamp: now - 9 * oneDay, commission: 5, profit: -130 },
  ];

  const portfolio: Portfolio = {
    id: 'report-portfolio',
    initialValue: 100000,
    currentValue: 100440,
    cash: 90440,
    positions: {},
    trades,
    orders: [],
    history: [
      { timestamp: now - 30 * oneDay, value: 100000, cash: 100000, positions: {} },
      { timestamp: now - 20 * oneDay, value: 100090, cash: 99910, positions: {} },
      { timestamp: now - 10 * oneDay, value: 100570, cash: 99430, positions: {} },
      { timestamp: now, value: 100440, cash: 90440, positions: {} },
    ],
    createdAt: now - 365 * oneDay,
  };

  // Configure report
  const reportConfig: ReportConfig = {
    period: 'monthly',
    includeCharts: true,
    includeAnalysis: true,
    format: 'json',
  };

  // Generate report
  const report: PerformanceReport = performanceReporter.generateReport(
    trades,
    portfolio,
    reportConfig
  );

  console.log(`Report ID: ${report.id}`);
  console.log(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  console.log(`Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`);

  // Display summary
  const summary = performanceReporter.generateSummary(report);
  console.log('\n' + summary);

  // Export options
  console.log('\n=== Export Options ===');
  console.log('JSON export available');
  console.log('HTML export available');
  console.log('Text summary available');
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples(): void {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Performance Monitoring and Metrics - Examples               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  example1_calculateMetrics();
  example2_realTimeMonitoring();
  example3_performanceAnalysis();
  example4_generateReport();

  console.log('\n✓ All examples completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
