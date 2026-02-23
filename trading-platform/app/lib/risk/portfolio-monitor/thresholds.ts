import { StressTestScenario } from './types';

export const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  GOOGL: 'Technology',
  META: 'Technology',
  AMZN: 'Consumer Cyclical',
  TSLA: 'Consumer Cyclical',
  JPM: 'Financial',
  BAC: 'Financial',
  WFC: 'Financial',
  JNJ: 'Healthcare',
  PFE: 'Healthcare',
  UNH: 'Healthcare',
  XOM: 'Energy',
  CVX: 'Energy',
};

export const STRESS_TEST_SCENARIOS: StressTestScenario[] = [
  {
    name: 'Market Crash',
    description: '2008年のような市場崩壊',
    marketShock: -30,
    volatilityMultiplier: 2.5,
    correlationIncrease: 0.3,
  },
  {
    name: 'Tech Bubble',
    description: 'テックバブル崩壊',
    marketShock: -20,
    volatilityMultiplier: 2.0,
    correlationIncrease: 0.2,
  },
  {
    name: 'Black Swan',
    description: 'ブラックスワンイベント',
    marketShock: -40,
    volatilityMultiplier: 3.0,
    correlationIncrease: 0.5,
  },
  {
    name: 'Moderate Correction',
    description: '中程度の調整',
    marketShock: -10,
    volatilityMultiplier: 1.5,
    correlationIncrease: 0.1,
  },
];

export const MAX_HISTORY_DAYS = 252;
export const DEFAULT_VOLATILITY = 0.02;
export const MIN_HISTORY_FOR_VAR = 30;
export const MIN_HISTORY_FOR_HISTORICAL_VAR = 252;
export const MIN_POSITIONS_FOR_PARAMETRIC = 5;

export const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
};

export const SECTOR_CONCENTRATION_THRESHOLD = 30;
export const HIGH_CORRELATION_THRESHOLD = 0.8;
export const SEVERE_STRESS_THRESHOLD = -20;
export const HIGH_RISK_SCORE_THRESHOLD = 70;
