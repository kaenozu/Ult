/**
 * index.ts
 * 
 * Exports for strategy module
 */

export {
  MomentumStrategy,
  MeanReversionStrategy,
  BreakoutStrategy,
  StatArbStrategy,
  MarketMakingStrategy,
  MLAlphaStrategy,
  StrategyCatalog
} from './StrategyCatalog';

export { StrategyComposer } from './StrategyComposer';

export type {
  StrategyType,
  StrategyConfig,
  StrategySignal,
  StrategyPerformance,
  Strategy,
  BacktestConfig,
  StrategyPortfolio,
  CorrelationMatrix,
  PortfolioPerformance,
  MomentumStrategyParams,
  MeanReversionStrategyParams,
  BreakoutStrategyParams,
  StatArbStrategyParams,
  MarketMakingStrategyParams,
  MLAlphaStrategyParams
} from './types';
