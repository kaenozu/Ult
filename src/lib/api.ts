import axios from 'axios'
import {
  PortfolioSummary,
  Position,
  SignalResponse,
  TradeResponse,
  MarketDataResponse,
  ChartDataPoint,
  TradeRequest,
} from '@/types'

// Re-export for components that import from api.ts
export type { TradeRequest } from '@/types'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

console.log('Using API URL:', API_URL)

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getPortfolio = async (): Promise<PortfolioSummary> => {
  const response = await api.get<PortfolioSummary>('/portfolio')
  return response.data
}

export const getPositions = async (): Promise<Position[]> => {
  const response = await api.get<Position[]>('/positions')
  return response.data
}

export const getMarketData = async (
  ticker: string
): Promise<MarketDataResponse> => {
  try {
    const response = await api.get<MarketDataResponse>(`/market/${ticker}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching market data for ${ticker}:`, error)
    // Fallback or rethrow? For now, let's rethrow or return a safe default if needed.
    // Given the previous code had a fallback, let's keep a minimal one if API fails?
    // No, better to fail loud or let React Query handle error.
    throw error
  }
}

export const getSignal = async (
  ticker: string,
  strategy: string = 'LightGBM'
): Promise<SignalResponse> => {
  const response = await api.get<SignalResponse>(
    `/signals/${ticker}?strategy=${strategy}`
  )
  return response.data
}

export const getChartData = async (
  ticker: string,
  period: string = '3mo'
): Promise<ChartDataPoint[]> => {
  // Determine start date based on period (backend doesn't support "period" arg directly in some endpoints,
  // so we might need to rely on what the backend offers or impl a custom endpoint.
  // However, looking at server.py, /market/{ticker} returns current data.
  // We need a history endpoint. PaperTrader doesn't expose history.
  // The underlying data_loader does.
  // Let's check backend/src/api/server.py again to see available endpoints.
  // If none, we will add one.
  // For now, let's assume we will add '/market/{ticker}/history' to backend.
  const response = await api.get<any>(
    `/market/${ticker}/history?period=${period}`
  )

  // Transform backend generic dataframe JSON to ChartDataPoint[]
  // Backend likely returns { "2024-01-01": { "Open": ..., "Close": ... } } or list of records.
  // We'll standardize this in backend.
  return response.data
}

export const executeTrade = async (
  trade: TradeRequest
): Promise<TradeResponse> => {
  const response = await api.post<TradeResponse>('/trade', trade)
  return response.data
}

// === AutoTrader ===

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

export interface AutoTradeConfig {
  max_budget_per_trade: number | null
  stop_loss_pct: number | null
  enabled: boolean | null
}

export const getAutoTradeStatus = async (): Promise<AutoTradeStatus> => {
  const response = await api.get<AutoTradeStatus>('/status/autotrade')
  return response.data
}

export const configureAutoTrade = async (
  config: Partial<AutoTradeConfig>
): Promise<AutoTradeStatus> => {
  const response = await api.post('/config/autotrade', config)
  return response.data
}

export const resetPortfolio = async (initial_capital: number): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/settings/reset-portfolio', { initial_capital })
  return response.data
}
