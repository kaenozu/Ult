/**
 * Portfolio and Order Type Definitions
 */

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
  tradePlan?: {
    strategy?: string;
    entryReason?: string;
    targetPrice?: number;
    stopLoss?: number;
    riskRewardRatio?: number;
  };
  followedPlan?: boolean;
  emotionBefore?: {
    fear: number;
    greed: number;
    confidence: number;
    stress: number;
  };
  emotionAfter?: {
    fear: number;
    greed: number;
    confidence: number;
    stress: number;
  };
  reflection?: {
    lessonsLearned?: string;
    whatWorked?: string;
    whatDidntWork?: string;
    wouldDoAgain?: boolean;
    [key: string]: unknown;
  };
}
