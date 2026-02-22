export type BeginnerAction = 'BUY' | 'SELL' | 'WAIT';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface BeginnerSignal {
  action: BeginnerAction;
  confidence: number;
  reason: string;
  riskLevel: RiskLevel;
  rawSignal: {
    type: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    symbol: string;
  };
  autoRisk?: {
    stopLossPrice: number;
    takeProfitPrice: number;
    stopLossPercent: number;
    takeProfitPercent: number;
    expectedProfitAmount?: number;
    expectedLossAmount?: number;
    recommendedShares?: number;
  };
  indicatorCount?: number;
  agreeingIndicators?: ('RSI' | 'MACD' | 'BB')[];
  historicalWinRate?: number;
  expectedValue?: number;
}

export interface BeginnerModeConfig {
  enabled: boolean;
  confidenceThreshold: number;
  autoRiskEnabled: boolean;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  minIndicatorAgreement: number;
}

export const DEFAULT_BEGINNER_CONFIG: BeginnerModeConfig = {
  enabled: true,
  confidenceThreshold: 70,
  autoRiskEnabled: true,
  defaultStopLossPercent: 1.5,
  defaultTakeProfitPercent: 6,
  minIndicatorAgreement: 0
};

export const BACKTEST_PERFORMANCE = {
  winRate: 60.9,
  expectancy: 2.99,
  strategy: 'EMA Cross + ADX>25 + SMA50 Trend',
  verifiedSymbols: 14,
  totalTrades: 64,
};
