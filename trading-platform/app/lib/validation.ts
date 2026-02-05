/**
 * 共通バリデーション関数
 * APIルートで使用する入力検証を共通化
 */

import { NextResponse } from 'next/server';
import { validationError } from './error-handler';

// Simple ValidationError class for internal use
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// 基本バリデーション関数
// ============================================================================

/**
 * 必須文字列の検証
 */
export function validateRequiredString(value: unknown, fieldName: string): string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`Invalid ${fieldName}: must be a non-empty string`, fieldName);
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
    throw validationError(`Invalid ${fieldName}: must be a number`, fieldName);
  }

  const { positive = false, finite = true, min, max } = options;

  if (finite && !Number.isFinite(value)) {
    throw validationError(`Invalid ${fieldName}: must be a finite number`, fieldName);
  }

  if (positive && value <= 0) {
    throw validationError(`Invalid ${fieldName}: must be a positive number`, fieldName);
  }

  if (min !== undefined && value < min) {
    throw validationError(`Invalid ${fieldName}: must be at least ${min}`, fieldName);
  }

  if (max !== undefined && value > max) {
    throw validationError(`Invalid ${fieldName}: must be at most ${max}`, fieldName);
  }

  return value;
}

/**
 * 真偽値の検証
 */
export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw validationError(`Invalid ${fieldName}: must be a boolean`, fieldName);
  }
  return value;
}

/**
 * 配列の検証
 */
export function validateArray<T>(value: unknown, fieldName: string, itemValidator?: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw validationError(`Invalid ${fieldName}: must be an array`, fieldName);
  }

  if (itemValidator) {
    return value.map((item, index) => {
      try {
        return itemValidator(item);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw validationError(`Invalid ${fieldName}[${index}]: ${message}`, fieldName);
      }
    });
  }

  return value as T[];
}

/**
 * オブジェクトの検証
 */
export function validateObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(`Invalid ${fieldName}: must be an object`, fieldName);
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
  
  // シンボル形式の検証（英数字、ドット、カンマ、キャレット）
  if (!/^[A-Z0-9.,^]+$/.test(validatedSymbol.toUpperCase())) {
    throw validationError('Invalid symbol format', 'symbol');
  }
  
  // シンボル長の検証（DoS対策）
  const isBatch = validatedSymbol.includes(',');
  const maxLength = isBatch ? 1000 : 20;
  
  if (validatedSymbol.length > maxLength) {
    throw validationError('Symbol too long', 'symbol');
  }
  
  return validatedSymbol.toUpperCase();
}

/**
 * 注文サイドの検証
 */
export function validateOrderSide(side: unknown): 'BUY' | 'SELL' {
  const validatedSide = validateRequiredString(side, 'side');
  
  if (!['BUY', 'SELL'].includes(validatedSide)) {
    throw validationError('Invalid side: must be BUY or SELL', 'side');
  }
  
  return validatedSide as 'BUY' | 'SELL';
}

/**
 * 注文タイプの検証
 */
export function validateOrderType(orderType: unknown): 'MARKET' | 'LIMIT' {
  const validatedType = validateRequiredString(orderType, 'orderType');
  
  if (!['MARKET', 'LIMIT'].includes(validatedType)) {
    throw validationError('Invalid orderType: must be MARKET or LIMIT', 'orderType');
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
    throw validationError('Invalid market: must be japan or usa', 'market');
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
    throw validationError('Unknown action', 'action');
  }
  
  return validatedAction;
}

/**
 * データタイプの検証
 */
export function validateDataType(type: unknown): 'history' | 'quote' {
  const validatedType = validateRequiredString(type, 'type');
  
  if (!['history', 'quote'].includes(validatedType)) {
    throw validationError('Invalid type parameter. Use "history" or "quote".', 'type');
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
    throw validationError('Invalid interval. Use 1m, 5m, 15m, 1h, 4h, 1d, 1wk, or 1mo', 'interval');
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
    throw validationError(`Invalid ${fieldName} format. Use YYYY-MM-DD.`, fieldName);
  }
  
  return validatedDate;
}

/**
 * 比較演算子の検証
 */
export function validateOperator(operator: unknown): string {
  const validatedOperator = validateRequiredString(operator, 'operator');
  
  const validOperators = ['>', '<', '>=', '<=', '=='];
  
  if (!validOperators.includes(validatedOperator)) {
    throw validationError('Invalid operator: must be >, <, >=, <=, or ==', 'operator');
  }
  
  return validatedOperator;
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
    throw validationError('Invalid mode: must be live, paper, or backtest', 'mode');
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
    cleanConfig.mode = validateMode(config.mode);
  }
  
  // 初期資本の検証と設定
  if (config.initialCapital !== undefined) {
    cleanConfig.initialCapital = validateNumber(config.initialCapital, 'initialCapital', { positive: true });
  }
  
  // リスクリミットの検証と設定
  if (config.riskLimits !== undefined) {
    cleanConfig.riskLimits = validateRiskLimits(config.riskLimits);
  }
  
  // 真偽値フィールドの検証と設定
  ['aiEnabled', 'sentimentEnabled', 'autoTrading'].forEach(field => {
    if (config[field] !== undefined) {
      cleanConfig[field] = validateBoolean(config[field], field);
    }
  });
  
  // 配列フィールドの検証と設定
  ['exchanges', 'symbols'].forEach(field => {
    if (Array.isArray(config[field])) {
      cleanConfig[field] = validateArray(config[field], field, item => validateRequiredString(item, field));
    }
  });
  
  return cleanConfig;
}