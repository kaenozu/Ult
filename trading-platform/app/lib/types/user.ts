/**
 * User Input Types
 * ユーザー入力の型定義
 */

/**
 * ユーザー認証情報
 */
export interface UserCredentials {
  username: string;
  password: string;
}

/**
 * ユーザープロファイル
 */
export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

/**
 * ユーザー設定
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: NotificationSettings;
  trading?: TradingSettings;
}

/**
 * 通知設定
 */
export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  alerts?: boolean;
  dailyReport?: boolean;
}

/**
 * 取引設定
 */
export interface TradingSettings {
  defaultBroker?: string;
  defaultOrderType?: 'market' | 'limit' | 'stop';
  riskTolerance?: 'low' | 'medium' | 'high';
  autoConfirm?: boolean;
}

/**
 * ウォッチリストエントリ
 */
export interface WatchlistEntry {
  symbol: string;
  name?: string;
  market: 'jp' | 'us' | 'crypto';
  addedAt: string;
  notes?: string;
}

/**
 * ポジション入力
 */
export interface PositionInput {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * 注文入力
 */
export interface OrderInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
}

/**
 * バックテスト入力
 */
export interface BacktestInput {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters?: Record<string, unknown>;
  slippage?: number;
  commission?: number;
}

/**
 * アラート条件入力
 */
export interface AlertConditionInput {
  type: 'price' | 'indicator' | 'pattern';
  symbol: string;
  condition: string;
  value: number;
  timeframe?: string;
  enabled?: boolean;
}

/**
 * スクリーニング条件入力
 */
export interface ScreenerConditionInput {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between';
  value: number | string | boolean;
  timeframe?: string;
}

/**
 * スクリーニングリクエスト
 */
export interface ScreenerRequest {
  market?: 'jp' | 'us' | 'crypto';
  conditions: ScreenerConditionInput[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * ポートフォリオ入力
 */
export interface PortfolioInput {
  name: string;
  description?: string;
  initialCapital: number;
  allocations: Array<{
    symbol: string;
    percentage: number;
  }>;
}

/**
 * リスク管理設定入力
 */
export interface RiskManagementInput {
  maxPositionSize?: number;
  maxDailyLoss?: number;
  maxDrawdown?: number;
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  positionSizingMethod?: 'fixed' | 'percentage' | 'kelly' | 'volatility';
}

/**
 * フィードバック入力
 */
export interface FeedbackInput {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  attachments?: string[];
}

/**
 * 検索クエリ入力
 */
export interface SearchQueryInput {
  query: string;
  type?: 'symbol' | 'company' | 'news' | 'all';
  market?: 'jp' | 'us' | 'crypto';
  limit?: number;
}

/**
 * エクスポート設定入力
 */
export interface ExportSettingsInput {
  format: 'csv' | 'json' | 'excel';
  includeTrades?: boolean;
  includeMetrics?: boolean;
  includeCharts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}
