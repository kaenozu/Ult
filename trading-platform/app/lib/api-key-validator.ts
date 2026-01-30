/**
 * APIキー検証ユーティリティ
 * 
 * このモジュールは、サーバーサイドでのAPIキー検証を提供します。
 * - 環境変数からのAPIキー取得
 * - APIキーの形式検証
 * - 不正なAPIキーの検出
 */

import { NextResponse } from 'next/server';
import { handleApiError, ErrorType } from '@/app/lib/error-handler';

/**
 * APIキーの検証結果
 */
interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: ErrorType;
}

/**
 * APIキーの形式検証
 */
function validateApiKeyFormat(apiKey: string): boolean {
  // APIキーは通常英数字と一部記号から構成される
  // 一般的なAPIキーの長さは10文字以上
  const apiKeyPattern = /^[a-zA-Z0-9_-]{10,}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * APIキーがプレースホルダーではないか確認
 */
function isPlaceholderApiKey(apiKey: string): boolean {
  const placeholderPatterns = [
    'your_api_key_here',
    'example',
    'placeholder',
    'xxx',
    'api_key',
    'secret_key',
    'demo_key',
    'test_key',
    'invalid_key',
    'dummy_key'
  ];
  
  const normalizedKey = apiKey.trim().toLowerCase();
  return placeholderPatterns.some(pattern => normalizedKey.includes(pattern.toLowerCase()));
}

/**
 * APIキーの安全性検証
 */
function validateApiKeySecurity(apiKey: string): ApiKeyValidationResult {
  // 空白チェック
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      isValid: false,
      error: 'APIキーが設定されていません',
      errorCode: ErrorType.VALIDATION
    };
  }

  // プレースホルダーのチェック
  if (isPlaceholderApiKey(apiKey)) {
    console.warn('[Security Warning] Invalid API key detected:', apiKey);
    return {
      isValid: false,
      error: 'APIキーが無効です',
      errorCode: ErrorType.VALIDATION
    };
  }

  // 形式のチェック
  if (!validateApiKeyFormat(apiKey)) {
    console.warn('[Security Warning] Malformed API key detected:', apiKey);
    return {
      isValid: false,
      error: 'APIキーの形式が正しくありません',
      errorCode: ErrorType.VALIDATION
    };
  }

  // 長さのチェック（一般的に短すぎるAPIキーは安全でない）
  if (apiKey.length < 10) {
    console.warn('[Security Warning] Short API key detected:', apiKey);
    return {
      isValid: false,
      error: 'APIキーが短すぎます',
      errorCode: ErrorType.VALIDATION
    };
  }

  // 長すぎるAPIキーも異常の可能性
  if (apiKey.length > 200) {
    console.warn('[Security Warning] Excessively long API key detected:', apiKey);
    return {
      isValid: false,
      error: 'APIキーが長すぎます',
      errorCode: ErrorType.VALIDATION
    };
  }

  return { isValid: true };
}

/**
 * 環境変数からAPIキーを取得して検証
 */
export function validateApiKeyFromEnv(envVarName: string): ApiKeyValidationResult {
  const apiKey = process.env[envVarName];
  
  if (!apiKey) {
    return {
      isValid: false,
      error: `${envVarName} が環境変数に設定されていません`,
      errorCode: ErrorType.VALIDATION
    };
  }

  return validateApiKeySecurity(apiKey);
}

/**
 * APIキー検証ミドルウェア
 * 
 * @param envVarName - 環境変数名（例: 'ALPHA_VANTAGE_API_KEY'）
 * @returns NextResponse | null - 検証エラー時はNextResponse、成功時はnull
 */
export function validateApiKeyMiddleware(envVarName: string): NextResponse | null {
  const validationResult = validateApiKeyFromEnv(envVarName);
  
  if (!validationResult.isValid) {
    // セキュリティ上の理由から、詳細なエラーメッセージはログに出すだけにする
    console.error(`API Key validation failed for ${envVarName}:`, validationResult.error);
    
    // ユーザーには一般的なエラーメッセージを返す
    return handleApiError(
      new Error('API設定エラー'),
      `validateApiKeyMiddleware(${envVarName})`,
      401 // Unauthorized
    );
  }

  return null; // 検証成功
}

/**
 * APIキーの検証結果をログに出力
 */
export function logApiKeyValidation(apiKey: string, endpoint: string): void {
  // APIキーの一部をマスクしてログに出力
  const maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
  console.log(`API Key validation attempted for endpoint ${endpoint}: ${maskedKey}`);
}

/**
 * APIキーの使用状況を追跡
 */
export class ApiKeyUsageTracker {
  private static usageCounters: Map<string, number> = new Map();
  private static lastReset: Map<string, Date> = new Map();

  static incrementUsage(envVarName: string): void {
    const count = this.usageCounters.get(envVarName) || 0;
    this.usageCounters.set(envVarName, count + 1);
    
    if (!this.lastReset.has(envVarName)) {
      this.lastReset.set(envVarName, new Date());
    }
  }

  static getUsageCount(envVarName: string): number {
    return this.usageCounters.get(envVarName) || 0;
  }

  static resetDailyUsage(): void {
    // 24時間ごとに使用回数をリセット
    const now = new Date();
    for (const [envVarName, lastReset] of this.lastReset.entries()) {
      const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
      if (hoursDiff >= 24) {
        this.usageCounters.set(envVarName, 0);
        this.lastReset.set(envVarName, now);
      }
    }
  }
}

// 使用例:
// const apiKeyValidation = validateApiKeyFromEnv('ALPHA_VANTAGE_API_KEY');
// if (!apiKeyValidation.isValid) {
//   console.error('API Key validation failed:', apiKeyValidation.error);
//   return NextResponse.json({ error: 'API設定エラー' }, { status: 401 });
// }