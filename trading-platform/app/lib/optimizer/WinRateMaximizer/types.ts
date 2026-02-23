export interface WinRateOptimization {
  action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number;
  expectedWinRate: number;
  optimalEntry: {
    price: number;
    timing: 'IMMEDIATE' | 'WAIT_FOR_PULLBACK' | 'WAIT_FOR_BREAKOUT';
    waitCondition?: string;
    expectedDelay?: number;
  };
  optimalExit: {
    takeProfit: number;
    stopLoss: number;
    trailingStop: boolean;
    targetReached: boolean;
  };
  positionSizing: {
    recommended: number;
    min: number;
    max: number;
    rationale: string;
  };
  marketConditions: {
    match: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
    similarPastScenarios: number;
    avgWinRateInSimilarScenarios: number;
    avgReturnInSimilarScenarios: number;
  };
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    probabilityOfLoss: number;
    expectedLoss: number;
    maxDrawdown: number;
  };
  reasoning: string[];
  warnings: string[];
}

export interface TradeScenario {
  id: string;
  timestamp: string;
  marketConditions: {
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
    momentum: number;
  };
  indicators: {
    rsi: number;
    macd: number;
    adx: number;
    bbPosition: number;
    smaAlignment: boolean;
  };
  outcome: {
    action: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice: number;
    profit: number;
    profitPercent: number;
    holdingPeriod: number;
    won: boolean;
  };
}

export interface OptimizationConfig {
  minScenariosRequired: number;
  scenarioSimilarityThreshold: number;
  maxRiskPerTrade: number;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  basePositionSize: number;
  maxPositionSize: number;
  confidenceScaling: boolean;
  minWinRateForTrade: number;
  minConfidenceForTrade: number;
  enableTimingOptimization: boolean;
  waitForBetterEntryMaxMinutes: number;
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  minScenariosRequired: 10,
  scenarioSimilarityThreshold: 0.7,
  maxRiskPerTrade: 2,
  defaultStopLossPercent: 2,
  defaultTakeProfitPercent: 6,
  basePositionSize: 10,
  maxPositionSize: 25,
  confidenceScaling: true,
  minWinRateForTrade: 55,
  minConfidenceForTrade: 60,
  enableTimingOptimization: true,
  waitForBetterEntryMaxMinutes: 60,
};
