import axios from 'axios';
import {
  PortfolioSummary,
  Position,
  SignalResponse,
  TradeResponse,
  MarketDataResponse,
  ChartDataPoint,
  TradeRequest,
} from '@/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

console.log('Using API URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function executeTrade(data: TradeRequest): Promise<TradeResponse> {
  try {
    const response = await api.post<TradeResponse>('/trade', data);
    return response.data;
  } catch (error) {
    console.error('Trade execution error:', error);
    throw error;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function getPortfolio(): Promise<PortfolioSummary> {
  const response = await api.get<PortfolioSummary>('/portfolio');
  return response.data;
}

export async function getPositions(): Promise<Position[]> {
  const response = await api.get<Position[]>('/positions');
  return response.data;
}

export async function getMarketData(
  ticker: string
): Promise<MarketDataResponse> {
  try {
    const response = await api.get<MarketDataResponse>(`/market/${ticker}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching market data for ${ticker}:`, error);
    throw error;
  }
}

export async function getSignal(
  ticker: string,
  strategy: string = 'LightGBM'
): Promise<SignalResponse> {
  const response = await api.get<SignalResponse>(
    `/signals/${ticker}?strategy=${strategy}`
  );
  return response.data;
}

export async function getChartData(
  ticker: string,
  period: string = '3mo'
): Promise<ChartDataPoint[]> {
  const response = await api.get<any>(
    `/market/${ticker}/history?period=${period}`
  );
  return response.data;
}

export interface AutoTradeStatus {
  is_running: boolean;
  scan_status: string;
  last_scan_time: string | null;
  config: {
    max_budget_per_trade: number;
    max_total_invested: number;
    scan_interval: number;
  };
}

export interface AutoTradeConfig {
  max_budget_per_trade: number | null;
  stop_loss_pct: number | null;
  enabled: boolean | null;
}

export async function getAutoTradeStatus(): Promise<AutoTradeStatus> {
  const response = await api.get<AutoTradeStatus>('/status/autotrade');
  return response.data;
}

export async function configureAutoTrade(
  config: Partial<AutoTradeConfig>
): Promise<AutoTradeStatus> {
  const response = await api.post('/config/autotrade', config);
  return response.data;
}

export async function resetPortfolio(
  initial_capital: number
): Promise<{ success: boolean; message: string }> {
  const response = await api.post('/settings/reset-portfolio', {
    initial_capital,
  });
  return response.data;
}

// Re-export types for components that import from api.ts
export type { TradeRequest } from '@/types';

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  signal: number;
  confidence: number;
  sector: string;
  earnings_date?: string | null;
  days_to_earnings?: number | null;
  safety_triggered?: boolean;
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const response = await api.get<WatchlistItem[]>('/market/watchlist');
  return response.data;
}
