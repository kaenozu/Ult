export { CompositeTechnicalAnalysisEngine } from './service';
export type {
  RSIAnalysis,
  TrendAnalysis,
  VolatilityAnalysis,
  MomentumAnalysis,
  CompositeAnalysis,
  Direction,
  Strength,
} from './types';
export { analyzeRSI, analyzeTrend, analyzeVolatility, analyzeMomentum } from './indicators';
export { detectRSIDivergence, detectCrossover, detectMACDCross } from './patterns';
