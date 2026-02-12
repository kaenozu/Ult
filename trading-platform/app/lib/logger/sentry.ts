/**
 * Sentry Integration
 * 
 * Sentryとの連携機能
 * エラー追跡、パフォーマンスモニタリング、リリース追跡
 */

import { logger } from './index';

// ============================================================================
// 型定義
// ============================================================================

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  debug?: boolean;
  sampleRate: number;
  tracesSampleRate: number;
  beforeSend?: (event: SentryEvent) => SentryEvent | null;
}

export interface SentryEvent {
  event_id: string;
  timestamp: number;
  platform: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  message?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename?: string;
          function?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  user?: {
    id?: string;
    username?: string;
    email?: string;
    ip_address?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
}

export interface Breadcrumb {
  type?: string;
  category?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

// ============================================================================
// Sentryクライアント
// ============================================================================

class SentryClient {
  private config: SentryConfig | null = null;
  private breadcrumbs: Breadcrumb[] = [];
  private user: SentryEvent['user'] = {};
  private tags: Record<string, string> = {};
  private initialized = false;
  
  /**
   * Sentryを初期化
   */
  init(config: SentryConfig): void {
    this.config = config;
    this.initialized = true;
    
    // グローバルエラーハンドラーを設定
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
    
    logger.info('Sentry initialized', { environment: config.environment });
  }
  
  /**
   * エラーをSentryに送信
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    if (!this.initialized || !this.config) {
      logger.warn('Sentry not initialized, logging to console instead', { error: error.message });
      return;
    }
    
    // サンプリング
    if (Math.random() > this.config.sampleRate) {
      return;
    }
    
    const event = this.createEventFromError(error, context);
    this.sendToSentry(event);
  }
  
  /**
   * メッセージをSentryに送信
   */
  captureMessage(message: string, level: SentryEvent['level'] = 'info', context?: Record<string, unknown>): void {
    if (!this.initialized || !this.config) return;
    
    const event: SentryEvent = {
      event_id: this.generateEventId(),
      timestamp: Date.now(),
      platform: 'javascript',
      level,
      message,
      user: this.user,
      tags: this.tags,
      extra: context,
    };
    
    this.sendToSentry(event);
  }
  
  /**
   * ブレッドクラムを追加
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || Date.now(),
    });
    
    // 古いブレッドクラムを削除（最大100件）
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }
  }
  
  /**
   * ユーザーを設定
   */
  setUser(user: SentryEvent['user']): void {
    this.user = user;
  }
  
  /**
   * タグを設定
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }
  
  /**
   * タグを削除
   */
  removeTag(key: string): void {
    delete this.tags[key];
  }
  
  /**
   * スコープをクリア
   */
  clearScope(): void {
    this.user = {};
    this.tags = {};
    this.breadcrumbs = [];
  }
  
  /**
   * パフォーマンストランザクションを開始
   */
  startTransaction(name: string, op: string): Transaction {
    return new Transaction(name, op, this);
  }
  
  // ========================================================================
  // プライベートメソッド
  // ========================================================================
  
  private createEventFromError(error: Error, context?: Record<string, unknown>): SentryEvent {
    const stacktrace = error.stack
      ? this.parseStackTrace(error.stack)
      : { frames: [] };
    
    return {
      event_id: this.generateEventId(),
      timestamp: Date.now(),
      platform: 'javascript',
      level: 'error',
      exception: {
        values: [{
          type: error.name,
          value: error.message,
          stacktrace,
        }],
      },
      user: this.user,
      tags: this.tags,
      extra: context,
      contexts: {
        breadcrumbs: {
          values: this.breadcrumbs,
        },
      },
    };
  }
  
  private parseStackTrace(stack: string): { frames: Array<{ filename?: string; function?: string; lineno?: number; colno?: number }> } {
    const lines = stack.split('\n');
    const frames: Array<{ filename?: string; function?: string; lineno?: number; colno?: number }> = [];
    
    for (const line of lines) {
      const match = line.match(/\s+at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?/);
      if (match) {
        frames.unshift({
          function: match[1] || '<anonymous>',
          filename: match[2],
          lineno: parseInt(match[3], 10) || undefined,
          colno: parseInt(match[4], 10) || undefined,
        });
      }
    }
    
    return { frames };
  }
  
  private async sendToSentry(event: SentryEvent): Promise<void> {
    if (!this.config) return;
    
    // beforeSendフック
    if (this.config.beforeSend) {
      const modifiedEvent = this.config.beforeSend(event);
      if (!modifiedEvent) return; // nullが返されたら送信しない
      event = modifiedEvent;
    }
    
    try {
      const response = await fetch(this.config.dsn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': this.generateAuthHeader(),
        },
        body: JSON.stringify(event),
      });
      
      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status}`);
      }
      
      logger.debug('Event sent to Sentry', { eventId: event.event_id });
    } catch (error) {
      logger.error('Failed to send event to Sentry', error as Error);
    }
  }
  
  private generateEventId(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
  
  private generateAuthHeader(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    return `Sentry sentry_version=7, sentry_timestamp=${timestamp}, sentry_client=sentry.javascript.custom/1.0.0`;
  }
  
  private handleGlobalError = (event: ErrorEvent): void => {
    if (event.error) {
      this.captureException(event.error, {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  };
  
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    
    this.captureException(error, { type: 'unhandled_promise_rejection' });
  };
}

// ============================================================================
// トランザクション（パフォーマンス計測）
// ============================================================================

class Transaction {
  private spans: Array<{
    op: string;
    description: string;
    startTimestamp: number;
    endTimestamp?: number;
    data?: Record<string, unknown>;
  }> = [];
  private currentSpan: typeof this.spans[0] | null = null;
  
  constructor(
    private name: string,
    private op: string,
    private sentry: SentryClient
  ) {}
  
  startChild(op: string, description: string, data?: Record<string, unknown>): void {
    this.currentSpan = {
      op,
      description,
      startTimestamp: performance.now(),
      data,
    };
    this.spans.push(this.currentSpan);
  }
  
  finishChild(): void {
    if (this.currentSpan) {
      this.currentSpan.endTimestamp = performance.now();
    }
  }
  
  finish(): void {
    // トランザクションデータをSentryに送信
    const transactionData = {
      name: this.name,
      op: this.op,
      spans: this.spans,
    };
    
    this.sentry.captureMessage(
      `Transaction: ${this.name}`,
      'info',
      { transaction: transactionData }
    );
  }
}

// ============================================================================
// React Error Boundary用
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * エラーをキャプチャするデコレータ
 */
export function captureErrors<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return (await fn(...args)) as ReturnType<T>;
    } catch (error) {
      sentry.captureException(error as Error, {
        ...context,
        function: fn.name,
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : String(arg)),
      });
      throw error;
    }
  }) as T;
}

/**
 * パフォーマンスを計測するデコレータ（非同期関数用）
 */
export function measureAsyncPerformance<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  operationName?: string
): (...args: TArgs) => Promise<TReturn> {
  const name = operationName || fn.name;

  return async (...args: TArgs): Promise<TReturn> => {
    const transaction = sentry.startTransaction(name, 'function');
    transaction.startChild('execution', `${name} execution`);

    try {
      const result = await fn(...args);
      transaction.finishChild();
      transaction.finish();
      return result;
    } catch (error) {
      transaction.finishChild();
      transaction.finish();
      throw error;
    }
  };
}

/**
 * パフォーマンスを計測するデコレータ（同期関数用）
 */
export function measurePerformance<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  operationName?: string
): (...args: TArgs) => TReturn {
  const name = operationName || fn.name;

  return (...args: TArgs): TReturn => {
    const transaction = sentry.startTransaction(name, 'function');
    transaction.startChild('execution', `${name} execution`);

    try {
      const result = fn(...args);
      transaction.finishChild();
      transaction.finish();
      return result;
    } catch (error) {
      transaction.finishChild();
      transaction.finish();
      throw error;
    }
  };
}

// ============================================================================
// シングルトンエクスポート
// ============================================================================

const sentry = new SentryClient();

export { sentry };
export default sentry;
export { Transaction };
