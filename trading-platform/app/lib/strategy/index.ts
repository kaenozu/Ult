/**
 * Strategy Module Exports
 */

import { BaseStrategy } from './BaseStrategy';
import { MomentumStrategy } from './MomentumStrategy';
import { MeanReversionStrategy } from './MeanReversionStrategy';
import { BreakoutStrategy } from './BreakoutStrategy';
import { StatArbStrategy } from './StatArbStrategy';
import { MarketMakingStrategy } from './MarketMakingStrategy';
import { MLAlphaStrategy } from './MLAlphaStrategy';

export { BaseStrategy } from './BaseStrategy';
export { MomentumStrategy } from './MomentumStrategy';
export { MeanReversionStrategy } from './MeanReversionStrategy';
export { BreakoutStrategy } from './BreakoutStrategy';
export { StatArbStrategy } from './StatArbStrategy';
export { MarketMakingStrategy } from './MarketMakingStrategy';
export { MLAlphaStrategy } from './MLAlphaStrategy';

export const StrategyCatalog = {
  momentum: MomentumStrategy,
  meanReversion: MeanReversionStrategy,
  breakout: BreakoutStrategy,
  statArb: StatArbStrategy,
  marketMaking: MarketMakingStrategy,
  mlAlpha: MLAlphaStrategy,
};

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

export default StrategyCatalog;
