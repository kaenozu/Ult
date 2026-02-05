/**
 * Security Module
 * 
 * セキュリティ関連機能の一元エクスポート
 */

// 入力サニタイズ
export {
  escapeHtml,
  unescapeHtml,
  escapeSql,
  escapeRegExp,
  detectSqlInjection,
  detectXss,
  detectPathTraversal,
  detectNullByte,
  detectDangerousFilename,
  sanitizeText,
  sanitizeSymbol,
  sanitizeNumber,
  sanitizeJson,
  sanitizeObject,
  validateOnly,
  whitelist,
  type SanitizationResult,
} from './InputSanitizer';

// XSS対策
export {
  generateCSP,
  sanitizeDomElement,
  sanitizeHtml,
  sanitizeUrl,
  safeOpenLink,
  createSafeHtml,
  safeSetInnerHtml,
  SafeStorage,
  safeJsonpCallback,
  safePostMessageListener,
  escapeCss,
  escapeJavaScript,
  type CSPConfig,
} from './XSSProtection';

// 監査ログ
export {
  AuditLogger,
  getAuditLogger,
  resetAuditLogger,
  type AuditEvent,
  type AuditEventType,
  type AuditEventOutcome,
  type AuditLogConfig,
} from './AuditLogger';
