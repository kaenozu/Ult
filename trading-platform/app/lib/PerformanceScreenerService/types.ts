import { OHLCV } from '../../types';

export interface PerformanceScore {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  winRate: number;
  totalReturn: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  performanceScore: number;
  rank?: number;
  startDate: string;
  endDate: string;
}

export interface ScreenerConfig {
  minWinRate?: number;
  minProfitFactor?: number;
  minTrades?: number;
  maxDrawdown?: number;
  market?: 'japan' | 'usa' | 'all';
  topN?: number;
  lookbackDays?: number;
}

export interface ScreenerResult<T = PerformanceScore> {
  results: T[];
  totalScanned: number;
  filteredCount: number;
  scanDuration: number;
  lastUpdated: Date;
}

export interface StockDataSource {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  fetchData: () => Promise<OHLCV[]>;
}

export interface AISignalResult {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  mlConfidence?: number;
  predictedChange?: number;
  targetPrice: number;
  forecastCone?: {
    upper: number[];
    middle: number[];
    lower: number[];
    labels: string[];
  } | null;
  reason: string;
  rank?: number;
}

export interface DualMatchEntry {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  performance: PerformanceScore;
  aiSignal: AISignalResult;
  dualScore?: number;
}

export interface DualScanResult {
  performance: ScreenerResult<PerformanceScore>;
  aiSignals: ScreenerResult<AISignalResult>;
  dualMatches: DualMatchEntry[];
  dualMatchSymbols: string[];
}

export interface AIScreenerConfig {
  market?: 'japan' | 'usa' | 'all';
  topN?: number;
  lookbackDays?: number;
  minConfidence?: number;
  minDualScore?: number;
  minPredictedChange?: number;
}

export const MIN_DATA_REQUIRED = 50;
export const DUAL_SCORE_WEIGHT_PERF = 0.5;
export const DUAL_SCORE_WEIGHT_AI = 0.5;
export const DUAL_SCORE_BONUS_BUY = 10;
export const DUAL_SCORE_BONUS_SELL = 5;
