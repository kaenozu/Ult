import { RSI_CONFIG, SMA_CONFIG } from '@/app/constants';
import { PortfolioConfig, MultiAssetBacktestConfig } from './types';

export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  initialCapital: 100000,
  maxPositions: 10,
  maxPositionSize: 20,
  minPositionSize: 5,
  rebalanceFrequency: 'monthly',
  rebalanceThreshold: 5,
  correlationThreshold: 0.8,
  useEqualWeight: false,
  useRiskParity: true,
};

export const DEFAULT_MULTI_ASSET_CONFIG: MultiAssetBacktestConfig = {
  symbols: [],
  startDate: '',
  endDate: '',
  portfolio: DEFAULT_PORTFOLIO_CONFIG,
  strategy: {
    rsiPeriod: RSI_CONFIG.DEFAULT_PERIOD,
    smaPeriod: SMA_CONFIG.MEDIUM_PERIOD,
    useTrailingStop: true,
    trailingStopPercent: 5,
  },
};
