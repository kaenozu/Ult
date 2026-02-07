/**
 * Database Types
 * データベース操作の型定義
 */

import type { OHLCV } from './common';

/**
 * データベースエントリの基本型
 */
export interface DatabaseEntry {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * IndexedDBストア名
 */
export enum StoreName {
  MARKET_DATA = 'market-data',
  TRADES = 'trades',
  POSITIONS = 'positions',
  WATCHLIST = 'watchlist',
  ALERTS = 'alerts',
  BACKTESTS = 'backtests',
  SETTINGS = 'settings',
  CACHE = 'cache',
}

/**
 * マーケットデータストアエントリ
 */
export interface MarketDataEntry extends DatabaseEntry {
  symbol: string;
  data: OHLCV[];
  interval: string;
  lastUpdated: string;
}

/**
 * 取引ストアエントリ
 */
export interface TradeEntry extends DatabaseEntry {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
  fees?: number;
  strategy?: string;
}

/**
 * ポジションストアエントリ
 */
export interface PositionEntry extends DatabaseEntry {
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
}

/**
 * ウォッチリストストアエントリ
 */
export interface WatchlistEntryDB extends DatabaseEntry {
  symbol: string;
  name?: string;
  market: 'jp' | 'us' | 'crypto';
  addedAt: string;
}

/**
 * アラートストアエントリ
 */
export interface AlertEntry extends DatabaseEntry {
  id: string;
  type: 'price' | 'indicator' | 'pattern';
  symbol: string;
  condition: string;
  value: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

/**
 * バックテストストアエントリ
 */
export interface BacktestEntry extends DatabaseEntry {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters?: Record<string, unknown>;
  results?: BacktestResult;
  createdAt: string;
}

/**
 * 設定ストアエントリ
 */
export interface SettingsEntry extends DatabaseEntry {
  key: string;
  value: unknown;
  userId?: string;
}

/**
 * キャッシュストアエントリ
 */
export interface CacheEntry<T = unknown> extends DatabaseEntry {
  key: string;
  value: T;
  expiresAt?: string;
  createdAt: string;
}

/**
 * データベースクエリオプション
 */
export interface QueryOptions {
  index?: string;
  range?: [string, string] | [number, number];
  limit?: number;
  offset?: number;
  direction?: 'next' | 'prev' | 'nextunique' | 'prevunique';
}

/**
 * データベース更新オプション
 */
export interface UpdateOptions {
  upsert?: boolean;
  merge?: boolean;
}

/**
 * データベースバックアップ情報
 */
export interface BackupInfo {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  stores: string[];
}

/**
 * データベース統計情報
 */
export interface DatabaseStats {
  storeName: StoreName;
  count: number;
  size: number;
  oldestEntry?: string;
  newestEntry?: string;
}

/**
 * バックテスト結果型
 * AccuracyServiceと互換性のある構造
 */
export interface BacktestResult {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Array<{
    symbol?: string;
    type?: 'BUY' | 'SELL';
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    profitPercent: number;
    reason?: string;
  }>;
  startDate: string;
  endDate: string;
  walkForwardMetrics?: {
    inSampleAccuracy: number;
    outOfSampleAccuracy: number;
    overfitScore: number;
    parameterStability: number;
  };
}

/**
 * データベース操作の結果型
 */
export interface DatabaseOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * データベースマイグレーション情報
 */
export interface MigrationInfo {
  version: number;
  name: string;
  appliedAt: string;
  description?: string;
}

/**
 * データベーススキーマ情報
 */
export interface SchemaInfo {
  version: number;
  stores: Array<{
    name: StoreName;
    keyPath: string;
    indexes: Array<{
      name: string;
      keyPath: string;
      unique?: boolean;
    }>;
  }>;
}
