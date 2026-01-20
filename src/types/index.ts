// Mock types for missing dependencies
export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
}

export interface SignalResponse {
  ticker: string;
  signal: number;
  confidence: number;
  explanation: string;
  strategy: string;
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ApprovalRequest {
  id: string;
  type: string;
  status: string;
  data: any;
  timestamp: string;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  timestamp: string;
}

// Additional missing types
export interface PortfolioSummary {
  total_equity: number;
  cash: number;
  invested_amount: number;
  positions: Position[];
}

export interface TradeResponse {
  success: boolean;
  trade_id: string;
  message: string;
  details?: any;
}

export interface MarketDataResponse {
  data: MarketData[];
  timestamp: string;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  timestamp: string;
}

export interface TradeRequest {
  ticker: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  reason?: string;
}
