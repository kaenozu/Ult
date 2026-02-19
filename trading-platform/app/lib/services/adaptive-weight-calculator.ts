import { MarketRegime } from './market-regime-detector';

export interface EnsembleWeights {
  RF: number;
  XGB: number;
  LSTM: number;
}

const WEIGHT_MAP: Record<MarketRegime['type'], EnsembleWeights> = {
  TRENDING_UP: { RF: 0.30, XGB: 0.40, LSTM: 0.30 },
  TRENDING_DOWN: { RF: 0.35, XGB: 0.35, LSTM: 0.30 },
  RANGING: { RF: 0.45, XGB: 0.35, LSTM: 0.20 },
  VOLATILE: { RF: 0.25, XGB: 0.30, LSTM: 0.45 }
};

export class AdaptiveWeightCalculator {
  calculate(regime: MarketRegime): EnsembleWeights {
    const baseWeights = WEIGHT_MAP[regime.type];
    return { ...baseWeights };
  }
}
