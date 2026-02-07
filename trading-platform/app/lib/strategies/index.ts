/**
 * Strategies Module Index
 * 
 * 株取引で勝つための戦略モジュールのエクスポート
 */

// Winning Strategy Engine
export {
  default as WinningStrategyEngine,
  winningStrategyEngine,
  DEFAULT_STRATEGY_CONFIG,
} from './WinningStrategyEngine';

export type {
  StrategyType,
  StrategyResult,
  StrategyConfig,
} from './WinningStrategyEngine';

// Multi-Timeframe Strategy
export {
  MultiTimeFrameStrategy,
  multiTimeFrameStrategy,
} from './MultiTimeFrameStrategy';
