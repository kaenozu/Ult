/**
 * Input Sanitizer
 * 
 * ユーザー入力のサニタイズと検証を行う
 * XSS、インジェクション攻撃を防ぐ
 */

// HTMLエンティティ変換テーブル
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// SQL予約語と危険なパターン
const SQL_RESERVED_WORDS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
  'ALTER', 'EXEC', 'EXECUTE', 'UNION', 'WHERE', 'FROM',
  'TABLE', 'DATABASE', 'SCHEMA', '--', '/*', '*/', ';--',
  'xp_', 'sp_', 'sysobjects', 'syscolumns',
];

// JavaScript危険なパターン
const JS_DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

// 危険なファイル拡張子
const DANGEROUS_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.php',
  '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl',
];

// ============================================================================
// 基本サニタイズ関数
// ============================================================================

/**
 * HTMLエンティティをエスケープ
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * HTMLエンティティをアンエスケープ（内部使用のみ）
 */
export function unescapeHtml(input: string): string {
  const unescapeMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };
  return input.replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, 
    (entity) => unescapeMap[entity] || entity
  );
}

/**
 * SQLインジェクション対策のためのエスケープ
 */
export function escapeSql(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * 正規表現特殊文字をエスケープ
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// 検証関数
// ============================================================================

/**
 * SQLインジェクションパターンを検出
 */
export function detectSqlInjection(input: string): boolean {
  const upperInput = input.toUpperCase();
  
  // SQL予約語の組み合わせをチェック
  const foundKeywords = SQL_RESERVED_WORDS.filter(word => 
    upperInput.includes(word.toUpperCase())
  );
  
  // 2つ以上の予約語が含まれている場合は危険
  if (foundKeywords.length >= 2) {
    return true;
  }
  
  // コメント記号や特殊文字の組み合わせをチェック
  const dangerousPatterns = [
    /(\-\-|\#|\/\*|\*\/)/,
    /(\'|\")\s*(OR|AND)\s*(\'|\")/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
    /WAITFOR\s+DELAY/i,
    /EXEC\s*\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * XSSパターンを検出
 */
export function detectXss(input: string): boolean {
  return JS_DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * パストラバーサルを検出
 */
export function detectPathTraversal(input: string): boolean {
  const traversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.\.\/%2f/i,
    /%252e%252e%252f/i,
  ];
  
  return traversalPatterns.some(pattern => pattern.test(input));
}

/**
 * Nullバイトを検出
 */
export function detectNullByte(input: string): boolean {
  return input.includes('\x00') || input.includes('%00');
}

/**
 * 危険なファイル名を検出
 */
export function detectDangerousFilename(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();
  return DANGEROUS_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
}

// ============================================================================
// サニタイズ結果型
// ============================================================================

export interface SanitizationResult {
  sanitized: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  originalLength: number;
  sanitizedLength: number;
}

// ============================================================================
// 高レベルサニタイズ関数
// ============================================================================

/**
 * テキスト入力をサニタイズ
 */
export function sanitizeText(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    trim?: boolean;
    normalizeUnicode?: boolean;
  } = {}
): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalLength = input.length;
  
  // Nullバイトチェック
  if (detectNullByte(input)) {
    errors.push('Null byte detected');
    input = input.replace(/\x00|%00/g, '');
  }
  
  // Unicode正規化
  if (options.normalizeUnicode !== false) {
    input = input.normalize('NFC');
  }
  
  // トリム
  if (options.trim !== false) {
    input = input.trim();
  }
  
  // XSS検出
  if (detectXss(input)) {
    warnings.push('Potential XSS pattern detected');
    if (!options.allowHtml) {
      input = escapeHtml(input);
    }
  }
  
  // SQLインジェクション検出
  if (detectSqlInjection(input)) {
    warnings.push('Potential SQL injection pattern detected');
    input = escapeSql(input);
  }
  
  // パストラバーサル検出
  if (detectPathTraversal(input)) {
    errors.push('Path traversal attempt detected');
    input = input.replace(/\.\.[/\\]/g, '');
  }
  
  // 最大長チェック
  if (options.maxLength && input.length > options.maxLength) {
    warnings.push(`Input truncated to ${options.maxLength} characters`);
    input = input.substring(0, options.maxLength);
  }
  
  return {
    sanitized: input,
    isValid: errors.length === 0,
    errors,
    warnings,
    originalLength,
    sanitizedLength: input.length,
  };
}

/**
 * シンボル/ティッカーをサニタイズ
 */
export function sanitizeSymbol(symbol: string): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalLength = symbol.length;
  
  // Nullバイトチェック
  if (detectNullByte(symbol)) {
    errors.push('Null byte detected in symbol');
    symbol = symbol.replace(/\x00|%00/g, '');
  }
  
  // トリムと大文字変換
  symbol = symbol.trim().toUpperCase();
  
  // 許可された文字のみ（英数字、ドット、キャレット、カンマ）
  const sanitized = symbol.replace(/[^A-Z0-9.,^]/g, '');
  
  if (sanitized !== symbol) {
    warnings.push('Invalid characters removed from symbol');
  }
  
  // 長さ制限
  if (sanitized.length > 20 && !sanitized.includes(',')) {
    errors.push('Symbol too long');
  }
  
  if (sanitized.includes(',') && sanitized.length > 1000) {
    errors.push('Batch symbols too long');
  }
  
  return {
    sanitized,
    isValid: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    originalLength,
    sanitizedLength: sanitized.length,
  };
}

/**
 * 数値入力をサニタイズ
 */
export function sanitizeNumber(
  input: string,
  options: {
    min?: number;
    max?: number;
    allowDecimal?: boolean;
    allowNegative?: boolean;
  } = {}
): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalLength = input.length;
  
  // Nullバイトチェック
  if (detectNullByte(input)) {
    errors.push('Null byte detected');
    input = input.replace(/\x00|%00/g, '');
  }
  
  // トリム
  input = input.trim();
  
  // 数値パターンをチェック
  const numberPattern = options.allowDecimal
    ? /^-?\d*\.?\d+$/
    : /^-?\d+$/;
  
  if (!numberPattern.test(input)) {
    errors.push('Invalid number format');
    return {
      sanitized: '',
      isValid: false,
      errors,
      warnings,
      originalLength,
      sanitizedLength: 0,
    };
  }
  
  const num = parseFloat(input);
  
  // 範囲チェック
  if (options.min !== undefined && num < options.min) {
    errors.push(`Value below minimum ${options.min}`);
  }
  
  if (options.max !== undefined && num > options.max) {
    errors.push(`Value above maximum ${options.max}`);
  }
  
  // 負数チェック
  if (!options.allowNegative && num < 0) {
    errors.push('Negative values not allowed');
  }
  
  return {
    sanitized: input,
    isValid: errors.length === 0,
    errors,
    warnings,
    originalLength,
    sanitizedLength: input.length,
  };
}

/**
 * JSON文字列をサニタイズ
 */
export function sanitizeJson(input: string): SanitizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const originalLength = input.length;
  
  // Nullバイトチェック
  if (detectNullByte(input)) {
    errors.push('Null byte detected in JSON');
    input = input.replace(/\x00|%00/g, '');
  }
  
  try {
    const parsed = JSON.parse(input);
    
    // 循環参照をチェック
    const seen = new WeakSet();
    const checkCircular = (obj: unknown): boolean => {
      if (obj === null || typeof obj !== 'object') return false;
      if (seen.has(obj)) return true;
      seen.add(obj);
      return Object.values(obj).some(checkCircular);
    };
    
    if (checkCircular(parsed)) {
      errors.push('Circular reference detected');
    }
    
    // 安全なJSONとして再シリアライズ
    const sanitized = JSON.stringify(parsed);
    
    return {
      sanitized,
      isValid: errors.length === 0,
      errors,
      warnings,
      originalLength,
      sanitizedLength: sanitized.length,
    };
  } catch {
    errors.push('Invalid JSON format');
    return {
      sanitized: '',
      isValid: false,
      errors,
      warnings,
      originalLength,
      sanitizedLength: 0,
    };
  }
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 複数フィールドを一括サニタイズ
 */
export function sanitizeObject<T extends Record<string, string>>(
  obj: T,
  fieldConfig: Record<keyof T, {
    type: 'text' | 'symbol' | 'number' | 'json';
    options?: Parameters<typeof sanitizeText>[1] |
              Parameters<typeof sanitizeNumber>[1];
  }>
): Record<keyof T, SanitizationResult> {
  const results: Record<string, SanitizationResult> = {};
  
  for (const [field, value] of Object.entries(obj) as [keyof T, unknown][]) {
    const config = fieldConfig[field];
    if (!config) {
      results[field as string] = sanitizeText(value as string);
      continue;
    }
    
    switch (config.type) {
      case 'symbol':
        results[field as string] = sanitizeSymbol(value as string);
        break;
      case 'number':
        // @ts-expect-error - Type assertion for options
        results[field as string] = sanitizeNumber(value as string, config.options || {});
        break;
      case 'json':
        results[field as string] = sanitizeJson(value as string);
        break;
      case 'text':
      default:
        // @ts-expect-error - Type assertion for options
        results[field as string] = sanitizeText(value as string, config.options || {});
        break;
    }
  }
  
  return results as Record<keyof T, SanitizationResult>;
}

/**
 * 検証のみを行いサニタイズは行わない
 */
export function validateOnly(input: string): Omit<SanitizationResult, 'sanitized' | 'originalLength' | 'sanitizedLength'> {
  const result = sanitizeText(input);
  return {
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/**
 * 安全な文字列のみを許可
 */
export function whitelist(input: string, allowedChars: RegExp): string {
  return input.split('').filter(char => allowedChars.test(char)).join('');
}
