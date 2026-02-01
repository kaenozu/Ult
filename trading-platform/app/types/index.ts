// ============================================================================
// Domain Types
// ============================================================================

export interface Stock {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52w?: number;
  low52w?: number;
}

// Re-export shared types for backward compatibility
export type { SharedOHLCV as OHLCV } from './shared';

export interface TechnicalIndicator {
  symbol: string;
  sma5: number[];
  sma20: number[];
  sma50: number[];
  sma200?: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface ModelPrediction {
  rfPrediction: number;
  xgbPrediction: number;
  lstmPrediction: number;
  ensemblePrediction: number;
  confidence: number;
}

export interface Signal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  accuracy?: number; // 過去の的中率 (%)
  atr?: number;      // 銘柄固有の変動幅
  targetPrice: number;
  stopLoss: number;
  reason: string;
  predictedChange: number;
  predictionDate: string;
  optimizedParams?: {
    rsiPeriod: number;
    smaPeriod: number;
  };
  marketContext?: {
    indexSymbol: string;
    correlation: number; // 指数との相関係数 (-1 to 1)
    indexTrend: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  predictionError?: number; // 予測誤差係数 (1.0 = 標準)
  volumeResistance?: {
    price: number;
    strength: number; // 0 to 1
  }[];
  forecastCone?: {
    bearish: {
      lower: number[];   // 悲観的下限
      upper: number[];   // 悲観的上限
    };
    bullish: {
      lower: number[];   // 楽観的下限
      upper: number[];   // 楽観的上限
    };
    base: number[];      // ベースライン
    confidence: number; // コーン全体の信頼度
  };
  supplyDemand?: {
    currentPrice: number;
    resistanceLevels: {
      price: number;
      volume: number;
      strength: number;
      type: 'support' | 'resistance';
      level: 'strong' | 'medium' | 'weak';
    }[];
    supportLevels: {
      price: number;
      volume: number;
      strength: number;
      type: 'support' | 'resistance';
      level: 'strong' | 'medium' | 'weak';
    }[];
    volumeProfileStrength: number;
    breakoutDetected: boolean;
    brokenLevel?: {
      price: number;
      volume: number;
      strength: number;
      type: 'support' | 'resistance';
      level: 'strong' | 'medium' | 'weak';
    };
    breakoutConfidence: 'low' | 'medium' | 'high';
  };
  /**
   * Market regime information for adaptive strategy selection
   */
  regimeInfo?: {
    regime: 'TRENDING' | 'RANGING' | 'UNKNOWN';
    trendDirection: 'UP' | 'DOWN' | 'NEUTRAL';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    adx: number;
    atr: number;
    confidence: 'INITIAL' | 'CONFIRMED';
    daysInRegime: number;
  };
  /**
   * Recommended trading strategy based on market regime
   */
  recommendedStrategy?: string;
  /**
   * Human-readable regime description
   */
  regimeDescription?: string;
  /**
   * Strategy weight multiplier (0-1) based on regime suitability
   */
  strategyWeight?: number;
  /**
   * Position size adjustment factor based on volatility and regime
   */
  positionSizeAdjustment?: number;
  /**
   * Exit strategy configuration for the signal
   */
  exitStrategy?: {
    primary: string;
    strategies: string[];
    trailingStop?: {
      enabled: boolean;
      atrMultiplier: number;
      currentLevel: number;
    };
    timeBased?: {
      enabled: boolean;
      maxHoldingDays: number;
      decayFactor: number;
    };
    compoundConditions?: {
      enabled: boolean;
      conditions: string[];
      requireAll: boolean;
    };
    recommendedATR: number;
    exitReasons: string[];
  };
}

export interface PaperTrade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: 'OPEN' | 'CLOSED';
  entryDate: string;
  exitDate?: string;
  profitPercent?: number;
  reflection?: string; // AIによる事後分析
}

export interface AIStatus {
  virtualBalance: number;
  totalProfit: number;
  trades: PaperTrade[];
}

export interface Position {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
  entryDate: string;
}

export interface JournalEntry {
  id: string;
  symbol: string;
  date: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  profitPercent?: number;
  notes: string;
  status: 'OPEN' | 'CLOSED';
}

export interface Order {
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  date: string;
  timestamp?: number;
}

export interface Portfolio {
  positions: Position[];
  orders: Order[];
  totalValue: number;
  totalProfit: number;
  dailyPnL: number;
  cash: number;
}

export interface HeatmapSector {
  name: string;
  change: number;
  stocks: Stock[];
}

export interface ScreenerFilter {
  minPrice?: number;
  maxPrice?: number;
  minChange?: number;
  maxChange?: number;
  minVolume?: number;
  sectors?: string[];
  markets?: ('japan' | 'usa')[];
}

export type Theme = 'dark' | 'light';

// ============================================================================
// Backtest Types
// ============================================================================

export interface BacktestTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  profitPercent?: number;
  status?: 'OPEN' | 'CLOSED';
  reason?: string;
  exitReason?: string;
}

export interface BacktestResult {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  expectancy?: number;
  trades: BacktestTrade[];
  startDate: string;
  endDate: string;
}

// ============================================================================
// Risk Management Types
// ============================================================================

/**
 * Position sizing method types
 */
export type PositionSizingMethod = 'fixed_ratio' | 'fixed_amount' | 'kelly_criterion' | 'volatility_based' | 'volatility_adjusted' | 'risk_parity';

/**
 * Stop loss type
 */
export type StopLossType = 'percentage' | 'atr' | 'fixed' | 'price' | 'trailing';

/**
 * Risk management settings
 */
export interface RiskManagementSettings {
  sizingMethod: PositionSizingMethod;
  fixedRatio?: number;
  kellyFraction?: number;
  atrMultiplier?: number;
  maxRiskPercent: number;
  maxPositionPercent: number;
  maxLossPerTrade?: number;
  maxLossPercent?: number;
  dailyLossLimit?: number;
  useATR?: boolean;
  atrPeriod?: number;
  maxPositions?: number;
  maxCorrelation?: number;
  stopLoss: {
    enabled: boolean;
    type: StopLossType;
    value: number;
    trailing?: boolean;
  };
  takeProfit: {
    enabled: boolean;
    type: 'percentage' | 'atr' | 'fixed' | 'price' | 'risk_reward_ratio';
    value: number;
    partials?: boolean;
  };
  trailingStop?: {
    enabled: boolean;
    activationPercent: number;
    trailPercent: number;
  };
}

/**
 * Risk calculation result
 */
export interface RiskCalculationResult {
  positionSize: number;
  riskAmount: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  maxLoss?: number;
  maxGain?: number;
  capitalAtRisk?: number;
  riskPercent?: number;
  positionRiskPercent?: number;
  maxPositionSize?: number;
}

// ============================================================================
// API Types
// ============================================================================

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown> | unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends APIError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends APIError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit error for API throttling
 */
export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

// ============================================================================
// API Result Types
// ============================================================================

/**
 * Standard API result wrapper
 */
export interface APIResult<T> {
  success: true;
  data: T;
  source: 'cache' | 'api' | 'aggregated' | 'idb';
}

/**
 * API error wrapper
 */
export interface APIErrorResult {
  success: false;
  data: null;
  source: 'cache' | 'api' | 'aggregated' | 'idb' | 'error';
  error: string;
}

/**
 * Union type for API responses
 */
export type APIResponse<T> = APIResult<T> | APIErrorResult;
