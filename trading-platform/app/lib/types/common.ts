/**
 * Common Types
 * 共通の型定義（トレードシグナル、マーケットデータ、予測結果、アラートなど）
 */

import type { BacktestResult as BacktestResultDB } from './database';
import type { WatchlistEntry } from './user';

// Re-export from database.ts (OHLCV is defined locally to avoid conflicts)
export type { BacktestResultDB as BacktestResult };

// Re-export from user.ts to avoid duplication
export type { WatchlistEntry };

/**
 * OHLCVデータ型（database.tsから重複を避けるためローカル定義）
 */
export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

/**
 * トレードシグナル型
 */
export interface TradeSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  symbol: string;
  timestamp: string;
  targetPrice?: number;
  stopLoss?: number;
  timeframe?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * マーケットデータ型
 */
export interface MarketData {
  symbol: string;
  name?: string;
  market: 'jp' | 'us' | 'crypto';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  timestamp: string;
  ohlcv?: OHLCV[];
}

/**
 * 予測結果型
 */
export interface PredictionResult {
  symbol: string;
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number; // 0-100
  targetPrice?: number;
  timeframe: string;
  timestamp: string;
  model: string;
  features?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

/**
 * アラート型
 */
export interface Alert {
  id: string;
  type: 'price' | 'indicator' | 'pattern' | 'risk' | 'system';
  symbol: string;
  condition: string;
  value: number;
  currentValue?: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  acknowledged?: boolean;
  acknowledgedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * アラート条件型
 */
export interface AlertCondition {
  type: 'price' | 'indicator' | 'pattern';
  operator: '>' | '<' | '>=' | '<=' | '==' | 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between';
  value: number;
  timeframe?: string;
}

/**
 * ポジション型
 */
export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  closedAt?: string;
  exitReason?: string;
  strategy?: string;
}

/**
 * 取引型
 */
export interface Trade {
  id?: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
  fees?: number;
  strategy?: string;
  exitReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ポートフォリオ型
 */
export interface Portfolio {
  id: string;
  name: string;
  initialCapital: number;
  currentCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 株式情報型
 */
export interface Stock {
  symbol: string;
  name?: string;
  market: 'jp' | 'us' | 'crypto';
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  sector?: string;
  industry?: string;
  marketCap?: number;
}

/**
 * インジケーター値型
 */
export interface IndicatorValue {
  name: string;
  value: number;
  timestamp: string;
  parameters?: Record<string, unknown>;
}

/**
 * テクニカルインジケーター型
 */
export interface TechnicalIndicators {
  sma?: number[];
  ema?: number[];
  rsi?: number[];
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  stochastic?: {
    k: number[];
    d: number[];
  };
  adx?: number[];
  cci?: number[];
  atr?: number[];
}

/**
 * マーケットコンテキスト型
 */
export interface MarketContext {
  indexTrend?: 'UP' | 'DOWN' | 'NEUTRAL';
  correlation?: number;
  indexSymbol?: string;
  volatility?: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

/**
 * リスクメトリクス型
 */
export interface RiskMetrics {
  var?: number; // Value at Risk
  maxDrawdown?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  beta?: number;
  volatility?: number;
}

/**
 * パフォーマンスメトリクス型
 */
export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn?: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin?: number;
  averageLoss?: number;
  largestWin?: number;
  largestLoss?: number;
}

/**
 * エラーレスポンス型
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp?: string;
}

/**
 * 成功レスポンス型
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;
}

/**
 * 汎用レスポンス型
 */
export type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * ストック情報型（拡張）
 */
export interface StockInfo {
  symbol: string;
  name?: string;
  market: 'jp' | 'us' | 'crypto';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  dividendYield?: number;
  beta?: number;
  sector?: string;
  industry?: string;
  timestamp: string;
}

/**
 * シグナル型
 */
export interface Signal {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
  timestamp?: number;
}

/**
 * スクリーニング結果型
 */
export interface ScreenerResult {
  symbol: string;
  name?: string;
  price: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  matchScore?: number;
  matchedConditions?: string[];
}
