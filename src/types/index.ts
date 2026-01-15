export interface PortfolioSummary {
  total_equity: number
  cash: number
  invested_amount: number
  unrealized_pnl: number
  position_count: number
}

export interface Position {
  ticker: string
  quantity: number
  avg_price: number
  current_price?: number
  unrealized_pnl?: number
}

export interface SignalResponse {
  ticker: string
  signal: number // 1: BUY, -1: SELL, 0: HOLD
  confidence: number
  strategy: string
  explanation: string
  target_price?: number
}

export interface MarketDataResponse {
  ticker: string
  price: number
  change: number
  change_percent: number
  volume: number
  timestamp: string
}

export interface TradeRequest {
  ticker: string
  action: 'BUY' | 'SELL'
  quantity: number
  price?: number
  strategy?: string
}

export interface TradeResponse {
  success: boolean
  message: string
  order_id?: string
}

export interface ChartDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number | null
  predicted?: number | null
  volume: number
  isPrediction?: boolean
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
