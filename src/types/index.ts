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
  name?: string
  sector?: string
}

export interface SignalResponse {
  ticker: string
  signal: number // 1: BUY, -1: SELL, 0: HOLD
  confidence: number
  strategy: string
  explanation: string
  target_price?: number
  entry_price?: number
  stop_loss?: number
  take_profit?: number
}

export interface MarketDataResponse {
  ticker: string
  price: number
  change: number
  change_percent: number
  volume: number
  timestamp: string
  day_high?: number
  day_low?: number
  market_cap?: number
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

export interface AutoTradeStatus {
  is_running: boolean
  scan_status: string
  last_scan_time: string | null
  config: {
    max_budget_per_trade: number
    max_total_invested: number
    scan_interval: number
  }
}
