// ============================================================================
// Alpha Vantage API Types
// ============================================================================

/**
 * Alpha Vantage Time Series Intraday Response
 * Used for intervals like 1min, 5min, 15min, 30min, 60min
 */
export interface AlphaVantageTimeSeriesIntraday {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Time Series (${string})': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

/**
 * Alpha Vantage Intraday data with dynamic key
 */
export type AlphaVantageIntradayResponse =
  | AlphaVantageTimeSeriesIntraday
  | AlphaVantageError;

/**
 * Check if response is a valid Alpha Vantage Intraday response
 */
export function isIntradayResponse(
  data: unknown
): data is AlphaVantageTimeSeriesIntraday {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as { 'Meta Data'?: unknown };
  return 'Meta Data' in d && typeof d['Meta Data'] === 'object' && d['Meta Data'] !== null;
}

/**
 * Extract time series data from intraday response
 * Uses a type-safe approach to access dynamic keys
 */
export function extractIntradayTimeSeries(
  data: AlphaVantageTimeSeriesIntraday,
  interval: string
): Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }> | undefined {
  // Use Object.entries to find the matching key dynamically and type-safely
  for (const [key, value] of Object.entries(data)) {
    if (key === `Time Series (${interval})`) {
      if (typeof value === 'object' && value !== null) {
        return value as Record<string, { '1. open': string; '2. high': string; '3. low': string; '4. close': string; '5. volume': string }>;
      }
    }
  }
  return undefined;
}

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

/**
 * Technical indicators with ATR (Average True Range) for ML prediction
 */
export interface TechnicalIndicatorsWithATR extends TechnicalIndicator {
  atr: number[];
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
  direction?: 'BUY' | 'SELL' | 'HOLD'; // Alias for type (backward compatibility)
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
  // Walk-Forward Analysis metrics
  walkForwardMetrics?: {
    inSampleAccuracy: number;  // Average accuracy during training
    outOfSampleAccuracy: number;  // Average accuracy during validation
    overfitScore: number;  // Ratio of OOS/IS accuracy (closer to 1.0 = less overfitting)
    parameterStability: number;  // Standard deviation of parameters across windows
  };
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

/**
 * Alpha Vantage API Error Response
 */
export interface AlphaVantageError {
  'Error Message'?: string;
  Note?: string;
  Information?: string;
}

/**
 * Alpha Vantage Global Quote Response
 */
export interface AlphaVantageGlobalQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

/**
 * Alpha Vantage Time Series Daily Response
 */
export interface AlphaVantageTimeSeriesDaily {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

/**
 * Alpha Vantage RSI Response
 */
export interface AlphaVantageRSI {
  'Meta Data': {
    '1. Indicator': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Time Period': number;
    '6. Series Type': string;
    '7. Time Zone': string;
  };
  'Technical Analysis: RSI': Record<string, {
    RSI: string;
  }>;
}

/**
 * Alpha Vantage SMA Response
 */
export interface AlphaVantageSMA {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: SMA': Record<string, {
    SMA: string;
  }>;
}

/**
 * Alpha Vantage EMA Response
 */
export interface AlphaVantageEMA {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: EMA': Record<string, {
    EMA: string;
  }>;
}

/**
 * Alpha Vantage MACD Response
 */
export interface AlphaVantageMACD {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': {
      'Fast Period': number;
      'Slow Period': number;
      'Signal Period': number;
    };
    '6: Series Type': string;
    '7: Time Zone': string;
  };
  'Technical Analysis: MACD': Record<string, {
    MACD: string;
    MACD_Signal: string;
    MACD_Hist: string;
  }>;
}

/**
 * Alpha Vantage Bollinger Bands Response
 */
export interface AlphaVantageBollingerBands {
  'Meta Data': {
    '1: Symbol': string;
    '2: Indicator': string;
    '3: Last Refreshed': string;
    '4: Interval': string;
    '5: Time Period': number;
    '6: Series Type': string;
    '7: NB Dev Up': number;
    '8: NB Dev Dn': number;
    '9: MA Type': number;
    '10: Time Zone': string;
  };
  'Technical Analysis: BBANDS': Record<string, {
    'Real Upper Band': string;
    'Real Middle Band': string;
    'Real Lower Band': string;
  }>;
}

/**
 * Alpha Vantage API Response (Union type for all endpoints)
 */
export type AlphaVantageResponse =
  | AlphaVantageGlobalQuote
  | AlphaVantageTimeSeriesDaily
  | AlphaVantageRSI
  | AlphaVantageSMA
  | AlphaVantageError;

// ============================================================================
// Error Types
// ============================================================================

// Re-export unified error classes for backward compatibility
export { 
  ApiError as APIError, 
  NetworkError, 
  ValidationError, 
  RateLimitError 
} from '../lib/errors';

/**
 * Type guard for Alpha Vantage Error Response
 */
export function isAlphaVantageError(data: unknown): data is AlphaVantageError {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const errorData = data as {
    'Error Message'?: unknown;
    'Note'?: unknown;
    'Information'?: unknown;
  };
  return (
    typeof errorData['Error Message'] === 'string' ||
    typeof errorData['Note'] === 'string' ||
    typeof errorData['Information'] === 'string'
  );
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

// ============================================================================
// Enhanced Risk Management Types
// ============================================================================

// Temporarily commented out to avoid duplicate identifier errors
// These types should be imported from shared/types/risk instead
/*
export type {
  PositionSizingConfig,
  SizingResult,
  CorrelationAnalysis,
  CorrelationMatrix,
  ConcentrationRisk,
  HedgeRecommendation,
  StressScenario,
  StressTestResult,
  MonteCarloConfig,
  MonteCarloResult,
  TradingBehaviorMetrics,
  PsychologyAlert,
  TradingSession,
  MarketData,
  RiskMetrics,
} from './risk';
*/

// ============================================================================
// Multi-Timeframe Trading Types
// ============================================================================

/**
 * Time frame intervals for multi-timeframe analysis
 */
export type TimeFrame = '1min' | '5min' | '15min' | '30min' | '60min' | 'daily' | 'weekly' | 'monthly';

/**
 * Signal from a specific timeframe
 */
export interface TimeFrameSignal {
  timeFrame: TimeFrame;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0-1
  confidence: number; // 0-100
  indicators: {
    rsi: number;
    macd: number;
    adx: number;
    trend: 'UP' | 'DOWN' | 'NEUTRAL';
  };
  weight: number; // Weight of this timeframe in the final decision
}

/**
 * Multi-timeframe analysis result
 */
export interface MultiTimeFrameAnalysis {
  symbol: string;
  primarySignal: 'BUY' | 'SELL' | 'HOLD';
  alignment: number; // 0-1, 1 = perfect alignment across all timeframes
  weightedSignal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  timeFrameSignals: TimeFrameSignal[];
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  divergenceDetected: boolean; // True if timeframes show conflicting signals
  recommendation: string;
  reasoning: string[];
}

/**
 * Configuration for multi-timeframe weights
 */
export interface TimeFrameWeights {
  [key: string]: number; // TimeFrame -> Weight mapping
}

/**
 * Configuration for multi-timeframe strategy
 */
export interface MultiTimeFrameConfig {
  timeFrames: TimeFrame[];
  weights: TimeFrameWeights;
  minAlignment: number; // Minimum alignment score to generate signal (0-1)
  requireHigherTimeFrameConfirmation: boolean;
  divergenceThreshold: number; // Max allowed divergence between timeframes (0-1)
}

// ============================================================================
// Additional Types for Type Safety Improvements
// ============================================================================

/**
 * Backtest position state
 */
export interface BacktestPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryDate: string;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  reason?: string;
  value: number; // ポジションの初期価値（quantity × entryPrice）
}

/**
 * Technical indicators data structure
 */
export interface TechnicalIndicators {
  rsi?: number;
  rsi14?: number;
  sma5?: number;
  sma10?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  atr?: number;
  atr14?: number;
  adx?: number;
  stochasticK?: number;
  stochasticD?: number;
  obv?: number;
  vwap?: number;
  [key: string]: number | undefined;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannelConfig {
  enabled?: boolean;
  sound?: boolean;
  desktop?: boolean;
  webhook?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
  };
  email?: {
    to: string[];
    from?: string;
    subject?: string;
  };
  slack?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  priceThreshold?: number;
  volumeThreshold?: number;
  changeThreshold?: number;
  indicators?: Partial<TechnicalIndicators>;
  condition?: 'above' | 'below' | 'equals' | 'crosses';
  notificationChannels?: string[];
  cooldown?: number; // Minutes between alerts
}

/**
 * Alert data payload
 */
export interface AlertData {
  symbol: string;
  type: 'PRICE' | 'VOLUME' | 'INDICATOR' | 'SIGNAL';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Generic window augmentation for performance tracking
 */
declare global {
  interface Window {
    __PERFORMANCE_METRICS__?: Map<string, {
      count: number;
      totalTime: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
    }>;
  }
}

// ============================================================================
// Trading Psychology Types
// ============================================================================

export type {
  EmotionType,
  EmotionScore,
  MentalState,
  MentalHealthMetrics,
  DisciplineViolation,
  ViolationSeverity,
  DisciplineRules,
  TradingSession,
  CoachingRecommendation,
  CoachingPriority,
  CoachingType,
  WarningLevel,
  PsychologyAnalysisResult,
  EnhancedJournalEntry,
  PsychologyState,
  MentalHealthGaugeProps,
  EmotionIndicatorProps,
  DisciplineScoreProps,
  CoachPanelProps,
  PsychologyAlertConfig,
  PsychologyAlert,
  PsychologyAnalysisRequest,
  PsychologyAnalysisResponse,
  DisciplineCheckRequest,
  DisciplineCheckResponse,
} from './psychology';

// ============================================================================
// Type Guards and Branded Types
// ============================================================================

export {
  isOHLCV,
  isOHLCVArray,
  isOrderSide,
  isOrderType,
  isOrderStatus,
  isSignalType,
  isMarketType,
  isTimeHorizon,
  isPositionSizingMethod,
  isStopLossType,
  assertOHLCV,
  assertOHLCVArray,
} from './shared';

export type {
  SymbolId,
  Percentage,
  Ratio,
  Price,
  Volume,
  TimestampMs,
  DateString,
  TradeId,
  OrderId,
} from './branded';

export {
  createSymbolId,
  isSymbolId,
  createPercentage,
  createRatio,
  createPrice,
  createVolume,
  createTimestampMs,
  createDateString,
  createTradeId,
  createOrderId,
  percentageToRatio,
  ratioToPercentage,
} from './branded';

