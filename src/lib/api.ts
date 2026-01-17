import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  PortfolioSummary,
  Position,
  SignalResponse,
  TradeResponse,
  MarketDataResponse,
  ChartDataPoint,
  TradeRequest,
} from "@/types";

declare global {
  interface Window {
    structuredLogger?: {
      logError: (type: string, data: Record<string, unknown>) => void;
      logApiCall: (
        method: string | undefined,
        url: string | undefined,
        status: number,
        duration: number,
      ) => void;
    };
  }
}

// Re-export for components that import from api.ts
export type { TradeRequest, SignalResponse } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

console.log("Using API URL:", API_URL);

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Common error handler
const handleApiError = (error: unknown, context: string) => {
  console.error(`API Error in ${context}:`, error);

  // Log structured error for monitoring
  if (typeof window !== "undefined" && window.structuredLogger) {
    const axiosError = error as AxiosError;
    window.structuredLogger.logError("api_call_failed", {
      context,
      message: axiosError.message || "Unknown error",
      status: axiosError.response?.status,
      url: axiosError.config?.url,
    });
  }

  throw error;
};

// Common response interceptor for logging
api.interceptors.response.use(
  (response) => {
    // Log successful API calls
    if (typeof window !== "undefined" && window.structuredLogger) {
      const config = response.config as InternalAxiosRequestConfig & {
        timestamp: number;
      };
      window.structuredLogger.logApiCall(
        config.method,
        config.url,
        response.status,
        Date.now() - (config.timestamp || Date.now()),
      );
    }
    return response;
  },
  (error) => {
    handleApiError(error, "response_interceptor");
    return Promise.reject(error);
  },
);

// Add timestamp to requests for performance monitoring
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  (config as InternalAxiosRequestConfig & { timestamp: number }).timestamp =
    Date.now();
  return config;
});

// Common API call wrapper with error handling and logging
const apiCall = async <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  data?: unknown,
  context?: string,
): Promise<T> => {
  try {
    const response = await api.request({
      method,
      url,
      data,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, context || `${method.toUpperCase()} ${url}`);
    throw error;
  }
};

// Health Check
export const checkHealth = async (): Promise<boolean> => {
  try {
    await apiCall("get", "/health", undefined, "health_check");
    return true;
  } catch (error) {
    console.warn("Health check failed:", error);
    return false;
  }
};

export const getPortfolio = async (): Promise<PortfolioSummary> => {
  return apiCall<PortfolioSummary>(
    "get",
    "/portfolio",
    undefined,
    "get_portfolio",
  );
};

export const getPositions = async (): Promise<Position[]> => {
  return apiCall<Position[]>("get", "/positions", undefined, "get_positions");
};

export const getMarketData = async (
  ticker: string,
): Promise<MarketDataResponse> => {
  return apiCall<MarketDataResponse>(
    "get",
    `/market/${ticker}`,
    undefined,
    `get_market_data_${ticker}`,
  );
};

export const getSignal = async (
  ticker: string,
  strategy: string = "LightGBM",
): Promise<SignalResponse> => {
  return apiCall<SignalResponse>(
    "get",
    `/signals/${ticker}?strategy=${strategy}`,
    undefined,
    `get_signal_${ticker}`,
  );
};

export const getChartData = async (
  ticker: string,
  period: string = "3mo",
): Promise<ChartDataPoint[]> => {
  return apiCall<ChartDataPoint[]>(
    "get",
    `/market/${ticker}/history?period=${period}`,
    undefined,
    `get_chart_data_${ticker}`,
  );
};

export const executeTrade = async (
  trade: TradeRequest,
): Promise<TradeResponse> => {
  return apiCall<TradeResponse>("post", "/trade", trade, "execute_trade");
};

// === AutoTrader ===

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

export const getAutoTradeStatus = async (): Promise<AutoTradeStatus> => {
  return apiCall<AutoTradeStatus>(
    "get",
    "/status/autotrade",
    undefined,
    "get_autotrade_status",
  );
};

export const configureAutoTrade = async (
  config: Partial<AutoTradeConfig>,
): Promise<AutoTradeStatus> => {
  return apiCall<AutoTradeStatus>(
    "post",
    "/config/autotrade",
    config,
    "configure_autotrade",
  );
};

export const resetPortfolio = async (
  initial_capital: number,
): Promise<{ success: boolean; message: string }> => {
  return apiCall<{ success: boolean; message: string }>(
    "post",
    "/settings/reset-portfolio",
    { initial_capital },
    "reset_portfolio",
  );
};
