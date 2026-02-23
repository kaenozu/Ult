import { BacktestResult, BacktestConfig, Strategy } from '../types';

export interface WalkForwardConfig {
  trainingSize: number;
  testSize: number;
  windowType: 'rolling' | 'expanding';
  minDataPoints: number;
  optimizeParameters: boolean;
  parameterRanges?: {
    rsiPeriod?: [number, number];
    smaPeriod?: [number, number];
    stopLoss?: [number, number];
    takeProfit?: [number, number];
  };
  optimizationMetric: 'sharpe' | 'totalReturn' | 'profitFactor';
  parallelRuns: number;
}

export interface WalkForwardWindow {
  index: number;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  trainResult: BacktestResult | null;
  testResult: BacktestResult | null;
  optimizedParams: Record<string, number>;
  performanceDegradation: number;
}

export interface WalkForwardReport {
  windows: WalkForwardWindow[];
  summary: WalkForwardSummary;
  robustnessScore: number;
  parameterStability: number;
  recommendations: string[];
  detailedAnalysis: WalkForwardDetailedAnalysis;
}

export interface WalkForwardSummary {
  inSample: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };
  outOfSample: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };
  correlation: number;
  successRate: number;
  totalWindows: number;
  validWindows: number;
}

export interface WalkForwardDetailedAnalysis {
  monthlyPerformance: Map<string, {
    inSampleReturn: number;
    outOfSampleReturn: number;
    difference: number;
  }>;
  parameterSensitivity: Map<string, {
    values: number[];
    stdDev: number;
    coefficientOfVariation: number;
  }>;
  regimePerformance: Map<string, {
    bullish: number;
    bearish: number;
    ranging: number;
  }>;
  failureAnalysis: {
    count: number;
    reasons: string[];
    commonPatterns: string[];
  };
}

export const DEFAULT_WALK_FORWARD_CONFIG: WalkForwardConfig = {
  trainingSize: 252,
  testSize: 63,
  windowType: 'rolling',
  minDataPoints: 500,
  optimizeParameters: true,
  optimizationMetric: 'sharpe',
  parallelRuns: 1,
};
