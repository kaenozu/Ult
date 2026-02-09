'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, Bug, Copy, CheckCircle } from 'lucide-react';
import {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  SystemError,
  isAppError,
  handleError,
  getUserErrorMessage,
  canRecover,
} from '@/app/lib/errors';
import type { ErrorSeverity } from '@/app/lib/errors';

// ============================================================================
// Types
// ============================================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  copied: boolean;
  retryCount: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * エラーIDを生成
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * エラーの重大度に応じた色を取得
 */
function getSeverityColors(severity: ErrorSeverity): {
  bg: string;
  border: string;
  text: string;
  icon: string;
  button: string;
  buttonHover: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'text-red-500',
        button: 'bg-red-600',
        buttonHover: 'hover:bg-red-700',
      };
    case 'high':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: 'text-orange-500',
        button: 'bg-orange-600',
        buttonHover: 'hover:bg-orange-700',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: 'text-yellow-500',
        button: 'bg-yellow-600',
        buttonHover: 'hover:bg-yellow-700',
      };
    case 'low':
    default:
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'text-blue-500',
        button: 'bg-blue-600',
        buttonHover: 'hover:bg-blue-700',
      };
  }
}

/**
 * エラータイプに応じたアイコンを取得
 */
function getErrorIcon(error: Error | null): ReactNode {
  if (!error) return <AlertTriangle className="w-10 h-10" />;
  
  if (error instanceof NetworkError) {
    return <AlertTriangle className="w-10 h-10" />;
  }
  if (error instanceof ValidationError) {
    return <AlertTriangle className="w-10 h-10" />;
  }
  if (error instanceof AuthenticationError) {
    return <AlertTriangle className="w-10 h-10" />;
  }
  if (error instanceof SystemError) {
    return <Bug className="w-10 h-10" />;
  }
  
  return <AlertTriangle className="w-10 h-10" />;
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

/**
 * 強化されたErrorBoundaryコンポーネント
 * 
 * 機能:
 * - 統一エラーシステムとの連携
 * - エラー詳細の表示（開発モード）
 * - 復旧機能（再試行、ホームへ戻る）
 * - エラー情報のコピー
 * - エラーIDの生成
 * - カスタムエラーハンドラ
 * 
 * @example
 * ```tsx
 * <ErrorBoundary
 *   name="Dashboard"
 *   onError={(error, errorInfo) => {
 *     // エラー追跡サービスに送信
 *     trackError(error, errorInfo);
 *   }}
 *   showDetails={process.env.NODE_ENV !== 'production'}
 * >
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
    copied: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name, onError } = this.props;
    
    // エラー情報を状態に保存
    this.setState({ errorInfo });
    
    // 統一エラーシステムでログ出力
    const appError = isAppError(error) ? error : handleError(error, name || 'ErrorBoundary');
    
    // コンソールログ
    console.error(`ErrorBoundary caught an error in ${name || 'component'}:`, {
      error: appError.toJSON(),
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });
    
    // カスタムエラーハンドラを呼び出し
    if (onError) {
      onError(error, errorInfo);
    }
  }

  public resetError = (): void => {
    const { onReset } = this.props;
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
    });
    
    if (onReset) {
      onReset();
    }
  };

  public goHome = (): void => {
    window.location.href = '/';
  };

  public copyErrorInfo = async (): Promise<void> => {
    const { error, errorInfo, errorId } = this.state;
    const { name } = this.props;
    
    const appError = error && isAppError(error) ? error : handleError(error, name || 'ErrorBoundary');
    
    const errorInfoText = `
エラー情報
==========
エラーID: ${errorId}
コンポーネント: ${name || 'Unknown'}
タイムスタンプ: ${new Date().toISOString()}

エラー詳細
----------
名前: ${appError.name}
コード: ${appError.code}
重大度: ${appError.severity}
メッセージ: ${appError.message}

スタックトレース
--------------
${appError.stack || 'N/A'}

コンポーネントスタック
--------------------
${errorInfo?.componentStack || 'N/A'}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(errorInfoText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error info:', err);
    }
  };

  public render(): ReactNode {
    const { hasError, error, errorInfo, errorId, copied, retryCount } = this.state;
    const { children, fallback, name, showDetails = process.env.NODE_ENV !== 'production' } = this.props;

    if (hasError) {
      // カスタムフォールバックがある場合は使用
      if (fallback) {
        return fallback;
      }

      // エラー情報の処理
      const appError = error && isAppError(error) ? error : handleError(error, name || 'ErrorBoundary');
      const userMessage = getUserErrorMessage(appError);
      const isRecoverable = canRecover(appError);
      const colors = getSeverityColors(appError.severity);

      return (
        <div className={`flex flex-col items-center justify-center p-6 ${colors.bg} border ${colors.border} rounded-lg text-center min-h-[200px]`}>
          {/* アイコン */}
          <div className={`${colors.icon} mb-4`}>
            {getErrorIcon(error)}
          </div>

          {/* タイトル */}
          <h3 className={`text-lg font-bold ${colors.text} mb-2`}>
            {name ? `${name} エラー` : 'エラーが発生しました'}
          </h3>

          {/* ユーザー向けメッセージ */}
          <p className="text-sm text-gray-300 mb-2 max-w-md">
            {userMessage}
          </p>

          {/* エラー詳細（開発モードのみ） */}
          {showDetails && (
            <div className="text-xs text-gray-400 mb-4 max-w-md bg-black/20 p-3 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono">{appError.code}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
                  {appError.severity}
                </span>
              </div>
              <p className="text-left break-all">{appError.message}</p>
              {errorId && (
                <p className="mt-2 text-gray-500">エラーID: {errorId}</p>
              )}
            </div>
          )}

          {/* 復旧ボタン */}
          <div className="flex items-center gap-3 mt-4">
            {isRecoverable && (
              <button
                onClick={this.resetError}
                className={`flex items-center px-4 py-2 ${colors.button} ${colors.buttonHover} text-white rounded transition-colors text-sm font-medium`}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                再試行
                {retryCount > 0 && (
                  <span className="ml-2 text-xs opacity-70">({retryCount})</span>
                )}
              </button>
            )}
            
            <button
              onClick={this.goHome}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              ホームへ
            </button>

            {showDetails && (
              <button
                onClick={this.copyErrorInfo}
                className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors text-sm"
                title="エラー情報をコピー"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    コピー
                  </>
                )}
              </button>
            )}
          </div>

          {/* スタックトレース（開発モードのみ、折りたたみ） */}
          {showDetails && errorInfo?.componentStack && (
            <details className="mt-4 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                詳細なスタックトレースを表示
              </summary>
              <pre className="mt-2 p-3 bg-black/30 rounded text-xs text-gray-400 overflow-auto max-h-48">
                {error?.stack}
                {'\n\n--- Component Stack ---\n'}
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Functional Wrapper (for hooks support)
// ============================================================================

/**
 * useErrorBoundary フック用のエラー状態管理
 */
export function useErrorBoundary(): {
  showError: (error: Error) => void;
  resetError: () => void;
} {
  const [, setState] = React.useReducer(
    (_state: null, action: { type: 'error'; error: Error } | { type: 'reset' }) => {
      if (action.type === 'error') {
        throw action.error;
      }
      return null;
    },
    null
  );

  return {
    showError: (error: Error) => setState({ type: 'error', error }),
    resetError: () => setState({ type: 'reset' }),
  };
}

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * APIエラー用のErrorBoundary
 */
export class ApiErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'API',
    showDetails: process.env.NODE_ENV !== 'production',
  };
}

/**
 * データフェッチ用のErrorBoundary
 */
export class DataFetchErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'Data',
    showDetails: process.env.NODE_ENV !== 'production',
  };
}

/**
 * トレーディングコンポーネント用のErrorBoundary
 */
export class TradingErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'Trading',
    showDetails: process.env.NODE_ENV !== 'production',
  };
}

export default ErrorBoundary;
