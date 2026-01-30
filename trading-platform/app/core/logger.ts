/**
 * Unified Logger
 * 
 * Centralized logging service with configurable log levels and outputs.
 * Replaces scattered console.log statements throughout the codebase.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  minLevelToPersist: LogLevel;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? 'info',
      enableConsole: config?.enableConsole ?? true,
      enableRemote: config?.enableRemote ?? false,
      remoteEndpoint: config?.remoteEndpoint,
      minLevelToPersist: config?.minLevelToPersist ?? 'warn',
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${contextStr} ${message}`;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, context);
    if (this.config.enableConsole) {
      console.debug(formatted, data ?? '');
    }
    this.addLog({ timestamp: new Date(), level: 'debug', message, context, data });
  }

  info(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, context);
    if (this.config.enableConsole) {
      console.info(formatted, data ?? '');
    }
    this.addLog({ timestamp: new Date(), level: 'info', message, context, data });
  }

  warn(message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, context);
    if (this.config.enableConsole) {
      console.warn(formatted, data ?? '');
    }
    this.addLog({ timestamp: new Date(), level: 'warn', message, context, data });
  }

  error(message: string, error?: Error, context?: string): void {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, context);
    if (this.config.enableConsole) {
      console.error(formatted, error?.stack ?? error?.message ?? '');
    }
    this.addLog({ 
      timestamp: new Date(), 
      level: 'error', 
      message, 
      context, 
      data: error?.stack || error?.message 
    });
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

export const logger = getLogger();
