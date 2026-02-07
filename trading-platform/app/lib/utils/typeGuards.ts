/**
 * 型ガード関数コレクション
 * TypeScriptの型安全性を強化するための共通型ガード関数
 *
 * これらの関数は、ランタイムで型をチェックし、TypeScriptの型システムに
 * 型情報を提供することで、型安全性を向上させます。
 */

import { OHLCV, Signal, TechnicalIndicators } from '@/app/types';
import type { AlertCondition } from '../alerts/AlertSystem';
import type {
  ApiResponse,
  UserCredentials,
  UserProfile,
  TradeSignal,
  MarketData,
  PredictionResult,
  Alert,
  Position,
  Trade,
  Stock,
  OHLCV as OHLCVType,
} from '../types';

/**
 * 配列チェック
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 文字列チェック
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 数値チェック
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * ブール値チェック
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * オブジェクトチェック（null以外）
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * undefinedチェック
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * nullチェック
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * 関数チェック
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Dateオブジェクトチェック
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * OHLCVデータの型チェック
 */
export function isOHLCV(value: unknown): value is OHLCV {
  if (!isObject(value)) return false;

  const ohlcv = value as Record<string, unknown>;

  // 必須フィールドのチェック（少なくとも1つ存在すればOK）
  const hasRequiredFields =
    'open' in ohlcv ||
    'high' in ohlcv ||
    'low' in ohlcv ||
    'close' in ohlcv ||
    'volume' in ohlcv;

  if (!hasRequiredFields) return false;

  // 数値フィールドの型チェック（存在する場合のみ）
  if ('open' in ohlcv && !isNumber(ohlcv.open)) return false;
  if ('high' in ohlcv && !isNumber(ohlcv.high)) return false;
  if ('low' in ohlcv && !isNumber(ohlcv.low)) return false;
  if ('close' in ohlcv && !isNumber(ohlcv.close)) return false;
  if ('volume' in ohlcv && !isNumber(ohlcv.volume)) return false;
  if ('timestamp' in ohlcv && !isNumber(ohlcv.timestamp)) return false;

  return true;
}

/**
 * OHLCV配列の型チェック
 */
export function isOHLCVArray(value: unknown): value is OHLCV[] {
  if (!isArray<OHLCV>(value)) return false;
  return value.every(item => isOHLCV(item));
}

/**
 * シグナル型のチェック
 */
export function isSignal(value: unknown): value is Signal {
  if (!isObject(value)) return false;

  const signal = value as Record<string, unknown>;

  // 必須フィールドの存在チェック
  if (!('symbol' in signal) || !isString(signal.symbol)) return false;
  if (!('type' in signal) || !isString(signal.type)) return false;

  // オプションフィールドの型チェック（存在する場合のみ）
  if ('strength' in signal && !isNumber(signal.strength)) return false;
  if ('timestamp' in signal && !isNumber(signal.timestamp)) return false;
  if ('reason' in signal && !isString(signal.reason)) return false;

  return true;
}

/**
 * テクニカル指標の型チェック
 */
export function isTechnicalIndicators(value: unknown): value is TechnicalIndicators {
  if (!isObject(value)) return false;

  const indicators = value as Record<string, unknown>;

  // 数値フィールドの型チェック（存在する場合のみ）
  const numericFields = [
    'rsi', 'macd', 'signal', 'histogram', 'sma', 'ema',
    'upperBand', 'middleBand', 'lowerBand', 'atr', 'bbUpper',
    'bbLower', 'bbMiddle', 'k', 'd', 'j'
  ];

  for (const field of numericFields) {
    if (field in indicators && !isNumber(indicators[field])) {
      return false;
    }
  }

  return true;
}

/**
 * アラート条件の型チェック
 */
export function isAlertCondition(value: unknown): value is AlertCondition {
  if (!isObject(value)) return false;

  const condition = value as Record<string, unknown>;

  // 必須フィールドのチェック
  if (!('type' in condition) || !isString(condition.type)) return false;
  if (!('operator' in condition) || !isString(condition.operator)) return false;
  if (!('value' in condition)) return false; // value can be any type

  return true;
}

/**
 * アラートルールの型チェック
 */
export function isAlertRule(value: unknown): value is { conditions: AlertCondition[]; operator: 'AND' | 'OR' } {
  if (!isObject(value)) return false;

  const rule = value as Record<string, unknown>;

  // 必須フィールドのチェック
  if (!('conditions' in rule) || !isArray<AlertCondition>(rule.conditions)) return false;
  if (!('operator' in rule) || !isString(rule.operator)) return false;

  const validOperator = rule.operator === 'AND' || rule.operator === 'OR';
  if (!validOperator) return false;

  // 各条件のチェック
  if (!rule.conditions.every(cond => isAlertCondition(cond))) return false;

  return true;
}

/**
 * エラーオブジェクトチェック
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error ||
    (isObject(value) && 'message' in value && 'stack' in value);
}

/**
 * Promiseチェック
 */
export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Mapオブジェクトチェック
 */
export function isMap<K, V>(value: unknown): value is Map<K, V> {
  return value instanceof Map;
}

/**
 * Setオブジェクトチェック
 */
export function isSet<T>(value: unknown): value is Set<T> {
  return value instanceof Set;
}

/**
 * 整数チェック
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * 正の数チェック
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * 非負の数チェック
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * シンボル文字列チェック（取引シンボル形式）
 */
export function isSymbol(value: unknown): value is string {
  if (!isString(value)) return false;
  // 一般的な取引シンボル形式（例: AAPL, 7203.T, BTC-USD）
  return /^[A-Z0-9\-\.]+$/.test(value);
}

/**
 * タイムスタンプ（ミリ秒）チェック
 */
export function isTimestamp(value: unknown): value is number {
  return isNumber(value) && value > 0 && value < 8640000000000000; // 100年以内のタイムスタンプ
}

/**
 * 有効な期間設定のチェック（backtest config等）
 */
export function hasNumericProperties(
  value: unknown,
  properties: string[]
): value is Record<string, number> {
  if (!isObject(value)) return false;
  const obj = value as Record<string, unknown>;

  return properties.every(prop => prop in obj && isNumber(obj[prop]));
}

/**
 * 部分的な型チェック（anyの代わりに使用）
 * オブジェクトが特定のプロパティを持つことを保証するが、他のプロパティは問わない
 */
export function hasRequiredFields<T extends Record<string, unknown>>(
  value: unknown,
  requiredFields: (keyof T)[]
): value is T {
  if (!isObject(value)) return false;
  const obj = value as Record<string, unknown>;

  return requiredFields.every(field => field in obj);
}

/**
 * 列挙型の値チェック
 */
export function isEnumValue<T extends readonly string[]>(
  value: unknown,
  enumValues: T
): value is T[number] {
  return enumValues.includes(value as T[number]);
}

/**
 * 深度1の浅いコピー（型安全）
 */
export function shallowClone<T extends object>(obj: T): T {
  return { ...obj };
}

/**
 * オブジェクトのキーを文字列配列として取得
 */
export function getObjectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * オブジェクトの値を型安全に取得
 */
export function getObjectValues<T extends object>(obj: T): T[keyof T][] {
  return Object.values(obj);
}

// ============================================================================
// 新しい型ガード関数（REFACTOR-002用）
// ============================================================================

/**
 * APIレスポンスの型ガード
 */
export function isApiResponse(data: unknown): data is ApiResponse {
  if (!isObject(data)) return false;
  const response = data as Record<string, unknown>;
  
  // successフィールドが必須
  if (!('success' in response) || typeof response.success !== 'boolean') {
    return false;
  }
  
  // 成功時はdataフィールドが存在
  if (response.success && !('data' in response)) {
    return false;
  }
  
  // 失敗時はerrorフィールドが存在
  if (!response.success) {
    if (!('error' in response) || !isObject(response.error)) {
      return false;
    }
    const error = response.error as Record<string, unknown>;
    if (!('code' in error) || !isString(error.code)) {
      return false;
    }
    if (!('message' in error) || !isString(error.message)) {
      return false;
    }
  }
  
  return true;
}

/**
 * ユーザー認証情報の型ガード
 */
export function isUserCredentials(data: unknown): data is UserCredentials {
  if (!isObject(data)) return false;
  const credentials = data as Record<string, unknown>;
  
  return (
    'username' in credentials && isString(credentials.username) &&
    'password' in credentials && isString(credentials.password)
  );
}

/**
 * ユーザープロファイルの型ガード
 */
export function isUserProfile(data: unknown): data is UserProfile {
  if (!isObject(data)) return false;
  const profile = data as Record<string, unknown>;
  
  if (!('id' in profile) || !isString(profile.id)) return false;
  if (!('username' in profile) || !isString(profile.username)) return false;
  if (!('createdAt' in profile) || !isString(profile.createdAt)) return false;
  if (!('updatedAt' in profile) || !isString(profile.updatedAt)) return false;
  
  return true;
}

/**
 * トレードシグナルの型ガード
 */
export function isTradeSignal(data: unknown): data is TradeSignal {
  if (!isObject(data)) return false;
  const signal = data as Record<string, unknown>;
  
  if (!('type' in signal) || !isString(signal.type)) return false;
  if (!['BUY', 'SELL', 'HOLD'].includes(signal.type)) return false;
  
  if (!('confidence' in signal) || !isNumber(signal.confidence)) return false;
  if (signal.confidence < 0 || signal.confidence > 100) return false;
  
  if (!('symbol' in signal) || !isString(signal.symbol)) return false;
  if (!('timestamp' in signal) || !isString(signal.timestamp)) return false;
  
  return true;
}

/**
 * マーケットデータの型ガード
 */
export function isMarketData(data: unknown): data is MarketData {
  if (!isObject(data)) return false;
  const marketData = data as Record<string, unknown>;
  
  if (!('symbol' in marketData) || !isString(marketData.symbol)) return false;
  if (!('market' in marketData) || !isString(marketData.market)) return false;
  if (!['jp', 'us', 'crypto'].includes(marketData.market)) return false;
  
  if (!('price' in marketData) || !isNumber(marketData.price)) return false;
  if (!('change' in marketData) || !isNumber(marketData.change)) return false;
  if (!('changePercent' in marketData) || !isNumber(marketData.changePercent)) return false;
  if (!('volume' in marketData) || !isNumber(marketData.volume)) return false;
  if (!('timestamp' in marketData) || !isString(marketData.timestamp)) return false;
  
  return true;
}

/**
 * 予測結果の型ガード
 */
export function isPredictionResult(data: unknown): data is PredictionResult {
  if (!isObject(data)) return false;
  const prediction = data as Record<string, unknown>;
  
  if (!('symbol' in prediction) || !isString(prediction.symbol)) return false;
  if (!('prediction' in prediction) || !isString(prediction.prediction)) return false;
  if (!['UP', 'DOWN', 'NEUTRAL'].includes(prediction.prediction)) return false;
  
  if (!('confidence' in prediction) || !isNumber(prediction.confidence)) return false;
  if (prediction.confidence < 0 || prediction.confidence > 100) return false;
  
  if (!('timeframe' in prediction) || !isString(prediction.timeframe)) return false;
  if (!('timestamp' in prediction) || !isString(prediction.timestamp)) return false;
  if (!('model' in prediction) || !isString(prediction.model)) return false;
  
  return true;
}

/**
 * アラートの型ガード
 */
export function isAlert(data: unknown): data is Alert {
  if (!isObject(data)) return false;
  const alert = data as Record<string, unknown>;
  
  if (!('id' in alert) || !isString(alert.id)) return false;
  if (!('type' in alert) || !isString(alert.type)) return false;
  if (!['price', 'indicator', 'pattern', 'risk', 'system'].includes(alert.type)) return false;
  
  if (!('symbol' in alert) || !isString(alert.symbol)) return false;
  if (!('condition' in alert) || !isString(alert.condition)) return false;
  if (!('value' in alert) || !isNumber(alert.value)) return false;
  if (!('triggered' in alert) || typeof alert.triggered !== 'boolean') return false;
  if (!('createdAt' in alert) || !isString(alert.createdAt)) return false;
  
  return true;
}

/**
 * ポジションの型ガード
 */
export function isPosition(data: unknown): data is Position {
  if (!isObject(data)) return false;
  const position = data as Record<string, unknown>;
  
  if (!('symbol' in position) || !isString(position.symbol)) return false;
  if (!('side' in position) || !isString(position.side)) return false;
  if (!['LONG', 'SHORT'].includes(position.side)) return false;
  
  if (!('quantity' in position) || !isNumber(position.quantity)) return false;
  if (!('avgPrice' in position) || !isNumber(position.avgPrice)) return false;
  if (!('openedAt' in position) || !isString(position.openedAt)) return false;
  
  return true;
}

/**
 * 取引の型ガード
 */
export function isTrade(data: unknown): data is Trade {
  if (!isObject(data)) return false;
  const trade = data as Record<string, unknown>;
  
  if (!('symbol' in trade) || !isString(trade.symbol)) return false;
  if (!('type' in trade) || !isString(trade.type)) return false;
  if (!['BUY', 'SELL'].includes(trade.type)) return false;
  
  if (!('quantity' in trade) || !isNumber(trade.quantity)) return false;
  if (!('price' in trade) || !isNumber(trade.price)) return false;
  if (!('timestamp' in trade) || !isString(trade.timestamp)) return false;
  
  return true;
}

/**
 * 株式情報の型ガード
 */
export function isStock(data: unknown): data is Stock {
  if (!isObject(data)) return false;
  const stock = data as Record<string, unknown>;
  
  if (!('symbol' in stock) || !isString(stock.symbol)) return false;
  if (!('market' in stock) || !isString(stock.market)) return false;
  if (!['jp', 'us', 'crypto'].includes(stock.market)) return false;
  
  return true;
}

/**
 * OHLCVデータの型ガード（厳密版）
 */
export function isOHLCVStrict(data: unknown): data is OHLCVType {
  if (!isObject(data)) return false;
  const ohlcv = data as Record<string, unknown>;
  
  if (!('date' in ohlcv) || !isString(ohlcv.date)) return false;
  if (!('open' in ohlcv) || !isNumber(ohlcv.open)) return false;
  if (!('high' in ohlcv) || !isNumber(ohlcv.high)) return false;
  if (!('low' in ohlcv) || !isNumber(ohlcv.low)) return false;
  if (!('close' in ohlcv) || !isNumber(ohlcv.close)) return false;
  if (!('volume' in ohlcv) || !isNumber(ohlcv.volume)) return false;
  
  return true;
}
