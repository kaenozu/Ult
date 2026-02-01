/**
 * Data Completion Types
 * 
 * Type definitions for data completion, interpolation, and gap filling.
 */

import { OHLCV } from './shared';

/**
 * Data completion strategy types
 */
export type CompletionStrategyType = 
  | 'forward-fill'
  | 'backward-fill'
  | 'linear-interpolation'
  | 'mean-interpolation'
  | 'multi-source-merge';

/**
 * Completion result
 */
export interface CompletionResult {
  success: boolean;
  data: OHLCV[];
  gaps: DataGap[];
  strategy: CompletionStrategyType;
  completedCount: number;
  message?: string;
}

/**
 * Data gap information
 */
export interface DataGap {
  startDate: string;
  endDate: string;
  expectedPoints: number;
  missingPoints: number;
  filled: boolean;
  strategy?: CompletionStrategyType;
}

/**
 * Completion strategy interface
 */
export interface CompletionStrategy {
  name: CompletionStrategyType;
  priority: number;
  canComplete: (data: OHLCV[], gap: DataGap) => boolean;
  complete: (data: OHLCV[], gap: DataGap) => OHLCV[];
}

/**
 * Data source for multi-source completion
 */
export interface DataSource {
  name: string;
  priority: number;
  fetch: (symbol: string, startDate: string, endDate: string) => Promise<OHLCV[]>;
  isAvailable: () => Promise<boolean>;
}

/**
 * Completion pipeline configuration
 */
export interface CompletionPipelineConfig {
  strategies?: CompletionStrategy[];
  maxGapSize?: number;
  minDataQuality?: number;
  sources?: DataSource[];
}
