/**
 * Stock and Technical Indicator Type Definitions
 */

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

/**
 * Technical indicators data structure (individual values)
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
