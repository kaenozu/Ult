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
  
  
  
  
}

// ============================================================================
// Example 2: Real-Time Monitoring with Alerts
// ============================================================================

function example2_realTimeMonitoring(): void {

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
  });

  // Update prices
  monitor.updatePrice('AAPL', 145.00);
  monitor.updatePrice('GOOGL', 2050.00);

  // Update portfolio (this will trigger alerts)
  monitor.updatePortfolio(portfolio);

  // Get current metrics
  const metrics = monitor.getCurrentMetrics();

  // Get alert statistics
  const stats = monitor.getAlertStatistics();
}

// ============================================================================
// Example 3: Performance Analysis
// ============================================================================

function example3_performanceAnalysis(): void {

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

  // Display patterns

  // Display symbol analysis
  analysis.symbolAnalysis.forEach((symbol, index) => {
  });

  // Display recommendations
  analysis.recommendations.forEach((rec, index) => {
  });
}

// ============================================================================
// Example 4: Generate Performance Report
// ============================================================================

function example4_generateReport(): void {

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


  // Display summary
  const summary = performanceReporter.generateSummary(report);

  // Export options
}

// ============================================================================
// Run All Examples
// ============================================================================

export function runAllExamples(): void {

  example1_calculateMetrics();
  example2_realTimeMonitoring();
  example3_performanceAnalysis();
  example4_generateReport();

}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
