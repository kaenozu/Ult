/**
 * 共通バリデーション関数
 * APIルートで使用する入力検証を共通化
 */

import { ValidationError } from './errors';

// ============================================================================
// 基本バリデーション関数
// ============================================================================

/**
 * 必須文字列の検証
 */
export function validateRequiredString(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(fieldName, `must be a non-empty string`);
  }
  return value.trim();
}

/**
 * 数値の検証
 */
export function validateNumber(value: unknown, fieldName: string, options: {
  positive?: boolean;
  finite?: boolean;
  min?: number;
  max?: number;
} = {}): number {
  if (typeof value !== 'number') {
    throw new ValidationError(fieldName, `must be a number`);
  }
  
  if (options.finite && !isFinite(value)) {
    throw new ValidationError(fieldName, `must be a finite number`);
  }
  
  if (options.positive && value <= 0) {
    throw new ValidationError(fieldName, `must be positive`);
  }
  
  if (options.min !== undefined && value < options.min) {
    throw new ValidationError(fieldName, `must be at least ${options.min}`);
  }
  
  if (options.max !== undefined && value > options.max) {
    throw new ValidationError(fieldName, `must be at most ${options.max}`);
  }
  
  return value;
}

/**
 * 真偽値の検証
 */
export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(fieldName, `must be a boolean`);
  }
  return value;
}

/**
 * 配列の検証
 */
export function validateArray<T>(value: unknown, fieldName: string, itemValidator?: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(fieldName, `must be an array`);
  }

  if (itemValidator) {
    return value.map((item, index) => {
      try {
        return itemValidator(item);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new ValidationError(fieldName, `Invalid ${fieldName}[${index}]: ${message}`);
      }
    }) as T[];
  }

  return value as T[];
}

/**
 * オブジェクトの検証
 */
export function validateObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(fieldName, `must be an object`);
  }
  return value as Record<string, unknown>;
}

// ============================================================================
// 取引関連のバリデーション関数
// ============================================================================

/**
 * シンボルの検証
 */
export function validateSymbol(symbol: unknown): string {
  const validatedSymbol = validateRequiredString(symbol, 'symbol');
  
  if (typeof validatedSymbol !== 'string') {
    throw new ValidationError('symbol', 'Invalid symbol: must be a string');
  }
  
  // シンボル形式の検証（英数字、ドット、カンマ、キャレット）
  if (!/^[A-Z0-9.,^]+$/.test(validatedSymbol.toUpperCase())) {
    throw new ValidationError('symbol', 'Invalid symbol format');
  }
  
  // シンボル長の検証（DoS対策）
  const isBatch = validatedSymbol.includes(',');
  const maxLength = isBatch ? 1000 : 20;
  
  if (validatedSymbol.length > maxLength) {
    throw new ValidationError('symbol', 'Symbol too long');
  }
  
  return validatedSymbol.toUpperCase();
}

/**
 * 注文サイドの検証
 */
export function validateOrderSide(side: unknown): 'BUY' | 'SELL' {
  const validatedSide = validateRequiredString(side, 'side');
  
  if (typeof validatedSide !== 'string') {
    throw new ValidationError('side', 'Invalid side: must be a string');
  }
  
  if (!['BUY', 'SELL'].includes(validatedSide)) {
    throw new ValidationError('side', 'Invalid side: must be BUY or SELL');
  }
  
  return validatedSide as 'BUY' | 'SELL';
}

/**
 * 注文タイプの検証
 */
export function validateOrderType(orderType: unknown): 'MARKET' | 'LIMIT' {
  const validatedType = validateRequiredString(orderType, 'orderType');
  
  if (typeof validatedType !== 'string') {
    throw new ValidationError('orderType', 'Invalid orderType: must be a string');
  }
  
  if (!['MARKET', 'LIMIT'].includes(validatedType)) {
    throw new ValidationError('orderType', 'Invalid orderType: must be MARKET or LIMIT');
  }
  
  return validatedType as 'MARKET' | 'LIMIT';
}

/**
 * 市場タイプの検証
 */
export function validateMarketType(market: unknown): 'japan' | 'usa' {
  if (!market) return 'usa'; // デフォルト値
  
  const validatedMarket = validateRequiredString(market, 'market');
  
  if (!['japan', 'usa'].includes(validatedMarket)) {
    throw new ValidationError('market', 'Invalid market: must be japan or usa');
  }
  
  return validatedMarket as 'japan' | 'usa';
}

/**
 * 取引アクションの検証
 */
export function validateTradingAction(action: unknown): string {
  const validatedAction = validateRequiredString(action, 'action');
  
  const validActions = [
    'start', 'stop', 'reset', 'place_order', 'close_position', 
    'create_alert', 'update_config'
  ];
  
  if (!validActions.includes(validatedAction)) {
    throw new ValidationError('action', 'Unknown action');
  }
  
  return validatedAction;
}

/**
 * データタイプの検証
 */
export function validateDataType(type: unknown): 'history' | 'quote' {
  const validatedType = validateRequiredString(type, 'type');
  
  if (!['history', 'quote'].includes(validatedType)) {
    throw new ValidationError('type', 'Invalid type parameter. Use "history" or "quote".');
  }
  
  return validatedType as 'history' | 'quote';
}

/**
 * 間隔の検証
 */
export function validateInterval(interval: unknown): string {
  if (!interval) return '1d'; // デフォルト値
  
  const validatedInterval = validateRequiredString(interval, 'interval');
  
  const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1wk', '1mo'];
  
  if (!validIntervals.includes(validatedInterval)) {
    throw new ValidationError('interval', 'Invalid interval. Use 1m, 5m, 15m, 1h, 4h, 1d, 1wk, or 1mo');
  }
  
  return validatedInterval;
}

/**
 * 日付形式の検証
 */
export function validateDate(date: unknown, fieldName: string = 'date'): string {
  const validatedDate = validateRequiredString(date, fieldName);
  
  // YYYY-MM-DD形式の検証
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validatedDate) || isNaN(Date.parse(validatedDate))) {
    throw new ValidationError(fieldName, `Invalid ${fieldName} format. Use YYYY-MM-DD.`);
  }
  
  return validatedDate;
}

/**
 * 比較演算子の検証
 */
export function validateOperator(operator: unknown): '>' | '<' | '>=' | '<=' | '==' | 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals' | 'between' {
  const validatedOperator = validateRequiredString(operator, 'operator');
  
  const validOperators = ['>', '<', '>=', '<=', '==', 'above', 'below', 'crosses_above', 'crosses_below', 'equals', 'between'] as const;
  
  if (!validOperators.includes(validatedOperator as any)) {
    throw new ValidationError('operator', 'Invalid operator: must be >, <, >=, <=, ==, above, below, crosses_above, crosses_below, equals, or between');
  }
  
  return validatedOperator as any;
}

// ============================================================================
// 構成関連のバリデーション関数
// ============================================================================

/**
 * モードの検証
 */
export function validateMode(mode: unknown): 'live' | 'paper' | 'backtest' {
  if (!mode) return 'paper'; // デフォルト値
  
  const validatedMode = validateRequiredString(mode, 'mode');
  
  if (!['live', 'paper', 'backtest'].includes(validatedMode)) {
    throw new ValidationError('mode', 'Invalid mode: must be live, paper, or backtest');
  }
  
  return validatedMode as 'live' | 'paper' | 'backtest';
}

/**
 * リスクリミット設定の検証
 */
export function validateRiskLimits(riskLimits: unknown): Record<string, number> {
  const validatedLimits = validateObject(riskLimits, 'riskLimits');
  const cleanLimits: Record<string, number> = {};
  
  // 許可されたフィールドのみを処理
  const allowedFields = ['maxPositionSize', 'maxDailyLoss', 'maxDrawdown'];
  
  for (const field of allowedFields) {
    if (validatedLimits[field] !== undefined) {
      cleanLimits[field] = validateNumber(validatedLimits[field], field, { positive: true });
    }
  }
  
  return cleanLimits;
}

/**
 * クリーンな設定オブジェクトの構築
 */
export function buildCleanConfig(config: Record<string, unknown>): Record<string, unknown> {
  const cleanConfig: Record<string, unknown> = {};
  
  // 許可されたフィールドのホワイトリスト
  const allowedFields = [
    'mode', 'initialCapital', 'riskLimits', 'aiEnabled', 
    'sentimentEnabled', 'autoTrading', 'exchanges', 'symbols'
  ];
  
  // モードの検証と設定
  if (config.mode) {
    const mode = validateMode(config.mode);
    if (typeof mode === 'string') {
      cleanConfig.mode = mode;
    }
  }
  
  // 初期資本の検証と設定
  if (config.initialCapital !== undefined) {
    const capital = validateNumber(config.initialCapital, 'initialCapital', { positive: true });
    if (typeof capital === 'number') {
      cleanConfig.initialCapital = capital;
    }
  }
  
  // リスクリミットの検証と設定
  if (config.riskLimits !== undefined) {
    const limits = validateRiskLimits(config.riskLimits);
    if (typeof limits === 'object' && limits !== null) {
      cleanConfig.riskLimits = limits;
    }
  }
  
  // 真偽値フィールドの検証と設定
  ['aiEnabled', 'sentimentEnabled', 'autoTrading'].forEach(field => {
    if (config[field] !== undefined) {
      const boolValue = validateBoolean(config[field], field);
      if (typeof boolValue === 'boolean') {
        cleanConfig[field] = boolValue;
      }
    }
  });
  
  // 配列フィールドの検証と設定
  ['exchanges', 'symbols'].forEach(field => {
    if (Array.isArray(config[field])) {
      const arrayValue = validateArray(config[field], field, item => validateRequiredString(item, field));
      if (Array.isArray(arrayValue)) {
        cleanConfig[field] = arrayValue;
      }
    }
  });
  
  return cleanConfig;
}