/**
 * Performance Module Index
 * 
 * Exports all performance monitoring and analysis modules.
 */

export { PerformanceMetricsCalculator, performanceMetricsCalculator } from './PerformanceMetrics';
export { RealTimeMonitor, createRealTimeMonitor } from './RealTimeMonitor';
export { PerformanceAnalyzer, performanceAnalyzer } from './PerformanceAnalyzer';
export { PerformanceReporter, performanceReporter } from './PerformanceReporter';

// Re-export types
export type {
  Trade,
  TradePair,
  Portfolio,
  PortfolioPosition,
  PortfolioSnapshot,
  PerformanceMetrics,
  MonitoringAlert,
  MonitoringMetrics,
  MonitoringThresholds,
  TimeAnalysis,
  SymbolAnalysis,
  AnalysisResult,
  PerformanceReport,
  ReportConfig,
} from '@/app/types/performance';
