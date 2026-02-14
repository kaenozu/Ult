/**
 * XSS Protection
 * 
 * DOMベースおよびリフレクティブXSS対策
 * Reactアプリケーション向けの追加保護レイヤー
 */

import { escapeHtml } from './InputSanitizer';

// ============================================================================
// CSP (Content Security Policy) ヘルパー
// ============================================================================

import { logger } from '@/app/core/logger';
export interface CSPConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  baseUri: string[];
  formAction: string[];
  upgradeInsecureRequests?: boolean;
  reportUri?: string;
}

/**
 * CSP設定を生成
 */
export function generateCSP(config: Partial<CSPConfig> = {}): string {
  // NOTE: 'unsafe-inline' should be avoided in production
  // For better security, use nonces or hashes for inline scripts
  const defaultConfig: CSPConfig = {
    defaultSrc: ["'self'"],
    // In production, prefer using nonces: ["'self'", "'nonce-{nonce}'"]
    // For now, keep 'unsafe-inline' but log warning in development
    scriptSrc: process.env.NODE_ENV === 'production' 
      ? ["'self'"] 
      : ["'self'", "'unsafe-inline'"],
    styleSrc: process.env.NODE_ENV === 'production' 
      ? ["'self'", "'unsafe-inline'"]  // Style often needs inline for CSS-in-JS
      : ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.example.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    ...config,
  };
  
  const directives = [
    `default-src ${defaultConfig.defaultSrc.join(' ')}`,
    `script-src ${defaultConfig.scriptSrc.join(' ')}`,
    `style-src ${defaultConfig.styleSrc.join(' ')}`,
    `img-src ${defaultConfig.imgSrc.join(' ')}`,
    `connect-src ${defaultConfig.connectSrc.join(' ')}`,
    `font-src ${defaultConfig.fontSrc.join(' ')}`,
    `object-src ${defaultConfig.objectSrc.join(' ')}`,
    `media-src ${defaultConfig.mediaSrc.join(' ')}`,
    `frame-src ${defaultConfig.frameSrc.join(' ')}`,
    `base-uri ${defaultConfig.baseUri.join(' ')}`,
    `form-action ${defaultConfig.formAction.join(' ')}`,
  ];
  
  if (defaultConfig.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }
  
  if (defaultConfig.reportUri) {
    directives.push(`report-uri ${defaultConfig.reportUri}`);
  }
  
  return directives.join('; ');
}

// ============================================================================
// DOMサニタイズ
// ============================================================================

/**
 * DOM要素をサニタイズ
 */
export function sanitizeDomElement(element: HTMLElement): void {
  // 危険な属性を削除
  const dangerousAttributes = [
    'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick',
    'onerror', 'onfocus', 'onkeydown', 'onkeypress', 'onkeyup',
    'onload', 'onmousedown', 'onmousemove', 'onmouseout',
    'onmouseover', 'onmouseup', 'onreset', 'onresize',
    'onselect', 'onsubmit', 'onunload',
  ];
  
  dangerousAttributes.forEach(attr => {
    element.removeAttribute(attr);
  });
  
  // JavaScriptプロトコルを持つ属性を削除
  const attributes = element.attributes;
  for (let i = attributes.length - 1; i >= 0; i--) {
    const attr = attributes[i];
    if (/^javascript:/i.test(attr.value) || /^data:text\/html/i.test(attr.value)) {
      element.removeAttribute(attr.name);
    }
  }
}

/**
 * HTML文字列をサニタイズ（許可されたタグのみ）
 */
export function sanitizeHtml(
  html: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'p', 'br']
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(true);
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      if (!allowedTags.includes(tagName)) {
        // 許可されていないタグは中身のみを返す
        const fragment = document.createDocumentFragment();
        element.childNodes.forEach(child => {
          const sanitized = sanitizeNode(child);
          if (sanitized) fragment.appendChild(sanitized);
        });
        return fragment;
      }
      
      // 許可されたタグは属性を削除してクローン
      const cleanElement = document.createElement(tagName);
      element.childNodes.forEach(child => {
        const sanitized = sanitizeNode(child);
        if (sanitized) cleanElement.appendChild(sanitized);
      });
      
      return cleanElement;
    }
    
    return null;
  };
  
  const fragment = document.createDocumentFragment();
  doc.body.childNodes.forEach(child => {
    const sanitized = sanitizeNode(child);
    if (sanitized) fragment.appendChild(sanitized);
  });
  
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

// ============================================================================
// URLサニタイズ
// ============================================================================

/**
 * URLをサニタイズ
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.href);
    
    // JavaScriptプロトコルをブロック
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return null;
    }
    
    // 許可されたプロトコルのみ
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.href;
  } catch {
    // 相対URLの場合は基本URLと結合
    try {
      const resolved = new URL(url, window.location.href);
      return resolved.href;
    } catch {
      return null;
    }
  }
}

/**
 * リンクを安全に開く
 */
export function safeOpenLink(url: string): void {
  const safeUrl = sanitizeUrl(url);
  if (safeUrl) {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }
}

// ============================================================================
// Reactコンポーネント向けユーティリティ
// ============================================================================

/**
 * dangerouslySetInnerHTML使用時の安全なHTML
 */
export function createSafeHtml(html: string): { __html: string } {
  return { __html: escapeHtml(html) };
}

/**
 * イベントハンドラを安全に設定
 */
export function safeSetInnerHtml(
  element: HTMLElement,
  html: string,
  allowedTags?: string[]
): void {
  element.innerHTML = sanitizeHtml(html, allowedTags);
}

// ============================================================================
// 安全なストレージアクセス
// ============================================================================

/**
 * 安全なlocalStorageラッパー
 */
export const SafeStorage = {
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key);
      if (value && detectXssInStorage(value)) {
        localStorage.removeItem(key);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  },
  
  setItem(key: string, value: string): void {
    try {
      if (detectXssInStorage(value)) {
        throw new Error('XSS pattern detected in storage value');
      }
      localStorage.setItem(key, value);
    } catch {
      // ストレージエラーを無視
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ストレージエラーを無視
    }
  },
};

/**
 * ストレージ内のXSSパターン検出
 */
function detectXssInStorage(value: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];
  return xssPatterns.some(pattern => pattern.test(value));
}

// ============================================================================
// コンテンツインジェクション対策
// ============================================================================

/**
 * JSONPレスポンスを安全に処理
 */
export function safeJsonpCallback<T>(callback: (data: T) => void): (data: T) => void {
  return (data: T) => {
    // データが配列やオブジェクトかチェック
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid JSONP response: expected object');
    }
    callback(data);
  };
}

/**
 * postMessageを安全に処理
 */
export function safePostMessageListener(
  callback: (data: unknown, origin: string) => void,
  allowedOrigins: string[]
): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    // 許可されたオリジンのみ処理
    if (!allowedOrigins.includes(event.origin)) {
      logger.warn(`Rejected message from unauthorized origin: ${event.origin}`);
      return;
    }
    
    callback(event.data, event.origin);
  };
}

// ============================================================================
// エスケープユーティリティ
// ============================================================================

/**
 * CSS値をエスケープ
 */
export function escapeCss(value: string): string {
  return value.replace(/[<>'"&]/g, (char) => {
    switch (char) {
      case '<': return '\\3c ';
      case '>': return '\\3e ';
      case '"': return '\\22 ';
      case "'": return '\\27 ';
      case '&': return '\\26 ';
      default: return char;
    }
  });
}

/**
 * JavaScript文字列をエスケープ
 */
export function escapeJavaScript(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}
