/**
 * Performance Module Index
 * 
 * Exports all performance monitoring and analysis modules.
 */

// Core performance monitoring
export { PerformanceMetricsCalculator, performanceMetricsCalculator } from './PerformanceMetrics';
export { RealTimeMonitor, createRealTimeMonitor } from './RealTimeMonitor';
export { PerformanceAnalyzer, performanceAnalyzer } from './PerformanceAnalyzer';
export { PerformanceReporter, performanceReporter } from './PerformanceReporter';

// New standardized performance monitoring
export { performanceMonitor, PerformanceMonitor } from './monitor';
export { measure, measureAsync, measureAllClass } from './decorators';
export { 
  generatePerformanceReport, 
  formatDuration, 
  logPerformanceReport, 
  observeWebVitals 
} from './utils';

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

// New performance types
export type { 
  PerformanceMetric, 
  PerformanceStats 
} from './monitor';
