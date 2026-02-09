/**
 * Structured Logger
 * 
 * 構造化ログシステム
 * JSON形式でのログ出力、ログレベル管理、コンテキスト追跡
 */

// ============================================================================
// 型定義
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  source: {
    file?: string;
    line?: number;
    column?: number;
  };
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  context: string;
  includeStackTrace: boolean;
  redactFields: string[];
}

export type LogMethod = (message: string, metadata?: Record<string, unknown>) => void;

// ============================================================================
// ログレベルユーティリティ
// ============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

function shouldLog(minLevel: LogLevel, targetLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[targetLevel] >= LOG_LEVEL_PRIORITY[minLevel];
}

// ============================================================================
// 構造化ロガー
// ============================================================================

class StructuredLogger {
  private config: LoggerConfig;
  private remoteQueue: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: 'info',
      enableConsole: true,
      enableRemote: false,
      context: 'default',
      includeStackTrace: true,
      redactFields: ['password', 'token', 'secret', 'apiKey', 'privateKey'],
      ...config,
    };
    
    if (this.config.enableRemote) {
      this.startRemoteFlush();
    }
  }
  
  // ========================================================================
  // コアログメソッド
  // ========================================================================
  
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(this.config.minLevel, level)) {
      return;
    }
    
    const entry = this.createLogEntry(level, message, metadata);
    
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
    
    if (this.config.enableRemote) {
      this.queueForRemote(entry);
    }
  }
  
  debug: LogMethod = (message, metadata) => this.log('debug', message, metadata);
  info: LogMethod = (message, metadata) => this.log('info', message, metadata);
  warn: LogMethod = (message, metadata) => this.log('warn', message, metadata);
  
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const enhancedMetadata = {
      ...metadata,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.config.includeStackTrace ? error.stack : undefined,
          code: 'code' in error ? (error as { code: string }).code : undefined,
        },
      }),
    };
    this.log('error', message, enhancedMetadata);
  }
  
  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const enhancedMetadata = {
      ...metadata,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: 'code' in error ? (error as { code: string }).code : undefined,
        },
      }),
    };
    this.log('fatal', message, enhancedMetadata);
    
    // Fatalログは即座にリモート送信
    if (this.config.enableRemote) {
      this.flushRemote();
    }
  }
  
  // ========================================================================
  // パフォーマンス計測
  // ========================================================================
  
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.info(`Operation completed: ${operation}`, { duration, operation });
    };
  }
  
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.info(`Operation succeeded: ${operation}`, {
        ...metadata,
        duration,
        operation,
        success: true,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(`Operation failed: ${operation}`, error as Error, {
        ...metadata,
        duration,
        operation,
        success: false,
      });
      throw error;
    }
  }
  
  // ========================================================================
  // ログエントリ作成
  // ========================================================================
  
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    // 機密情報をマスク
    const sanitizedMetadata = metadata
      ? this.redactSensitiveData(metadata)
      : undefined;
    
    const stackTrace = this.getStackTrace();
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata: sanitizedMetadata,
      source: stackTrace,
    };
  }
  
  // ========================================================================
  // センシティブデータ処理
  // ========================================================================
  
  private redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.config.redactFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveData(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    
    return redacted;
  }
  
  // ========================================================================
  // 出力先
  // ========================================================================
  
  private outputToConsole(entry: LogEntry): void {
    const logFn = this.getConsoleMethod(entry.level);
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logFn(prefix, entry.message, entry.metadata);
    } else {
      logFn(prefix, entry.message);
    }
    
    if (entry.error?.stack) {
      // 内部での再帰を避けるため console を直接使用
      console.error(entry.error.stack);
    }
  }
  
  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error':
      case 'fatal': return console.error;
      default: return console.log;
    }
  }
  
  private queueForRemote(entry: LogEntry): void {
    this.remoteQueue.push(entry);
    
    // キューが100件を超えたら送信
    if (this.remoteQueue.length >= 100) {
      this.flushRemote();
    }
  }
  
  private async flushRemote(): Promise<void> {
    if (this.remoteQueue.length === 0 || !this.config.remoteEndpoint) return;
    
    const batch = [...this.remoteQueue];
    this.remoteQueue = [];
    
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send logs: ${response.status}`);
      }
    } catch (error) {
      // 送信失敗したログは再度キューに戻す
      this.remoteQueue.unshift(...batch);
      // 内部での再帰を避けるため console を直接使用
      console.error('Failed to send logs to remote endpoint:', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  private startRemoteFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushRemote();
    }, 30000); // 30秒ごと
  }
  
  // ========================================================================
  // ユーティリティ
  // ========================================================================
  
  private getStackTrace(): LogEntry['source'] {
    try {
      throw new Error();
    } catch (e) {
      const stack = (e as Error).stack;
      if (!stack) return {};
      
      const lines = stack.split('\n');
      // 4行目以降（createLogEntry, log, 呼び出し元）を解析
      const callerLine = lines[4] || lines[3];
      if (!callerLine) return {};
      
      const match = callerLine.match(/\s+at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        return {
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
        };
      }
      
      return {};
    }
  }
  
  setContext(context: string): void {
    this.config.context = context;
  }
  
  setUserId(userId: string): void {
    this.config.context = `${this.config.context}:${userId}`;
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushRemote();
  }
}

// ============================================================================
// コンテキスト付きロガー
// ============================================================================

export function createLogger(context: string, config?: Partial<LoggerConfig>): StructuredLogger {
  return new StructuredLogger({ ...config, context });
}

// ============================================================================
// デフォルトロガー
// ============================================================================

export const logger = new StructuredLogger({
  context: 'app',
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export default logger;
