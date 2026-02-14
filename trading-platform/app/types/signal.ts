/**
 * AI Signal and Prediction Type Definitions
 */



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
  timestamp?: number; // Unix timestamp of signal generation (milliseconds)
  price?: number;     // Current price when signal was generated
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
