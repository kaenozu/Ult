/**
 * 汎用的なセキュアID生成ユーティリティ
 *
 * Math.random()は予測可能なため、セキュリティ関連の識別子（セッションID、トークン、イベントIDなど）
 * には使用すべきではありません。代わりにWeb Crypto APIのcrypto.randomUUID()を使用します。
 */

export function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older Node.js/Jest environments
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16).padStart(8, '0')).join('-');
  }

  // Fallback ONLY if absolutely necessary, but log a warning
  console.warn('Security Warning: Web Crypto API not available. Using Math.random() fallback for ID generation.');
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
