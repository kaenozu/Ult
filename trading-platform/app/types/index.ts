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

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

export interface Signal {
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reason: string;
  predictedChange: number;
  predictionDate: string;
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
