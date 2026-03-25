import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { reportError } from '@/app/lib/errors';

export interface ErrorToastProps {
  error: unknown;
  context?: string;
  actionMessage?: string;
  onRetry?: () => void;
  metadata?: Record<string, unknown>;
  showToast?: boolean;
}

/**
 * 統一されたエラー表示・ログ収集コンポーネント (ErrorToast)
 *
 * コンポーネント内で発生したエラーを受け取り、以下の処理を行います：
 * 1. エラーをログに記録し、収集サービスへ送信 (`reportError`)
 * 2. ユーザー向けのエラーメッセージをToast (`sonner`) で表示
 *
 * @example
 * ```tsx
 * const { error } = useSomeData();
 *
 * if (error) {
 *   return <ErrorToast error={error} context="DataLoading" onRetry={refetch} />;
 * }
 * ```
 */
export function ErrorToast({
  error,
  context = 'ErrorToast',
  actionMessage,
  onRetry,
  metadata = {},
  showToast = true,
}: ErrorToastProps): null {
  useEffect(() => {
    if (!error) return;

    let ignore = false;

    const processError = async () => {
      // reportErrorを呼び出してエラーを記録し、ユーザー向けのエラーメッセージを取得
      const appError = await reportError(error, {
        component: context,
        action: 'show_error_toast',
        metadata: {
          ...metadata,
          source: 'ErrorToastComponent',
        },
      });

      if (ignore) return;

      if (showToast) {
        // エラーの重要度に応じたToast表示
        const severity = appError.severity;
        const message = appError.userMessage || appError.message;
        const description = appError.recoverable
          ? '一時的なエラーの可能性があります。しばらく経ってからお試しください。'
          : '問題が解決しない場合は、サポートまでお問い合わせください。';

        const toastOptions: Parameters<typeof toast>[1] = {
          description,
        };

        if (onRetry) {
          toastOptions.action = {
            label: actionMessage || '再試行',
            onClick: onRetry,
          };
        }

        if (severity === 'critical' || severity === 'high') {
          toast.error(message, toastOptions);
        } else if (severity === 'medium') {
          toast.warning(message, toastOptions);
        } else {
          toast.info(message, toastOptions);
        }
      }
    };

    processError();

    return () => {
      ignore = true;
    };
  }, [error, context, actionMessage, onRetry, metadata, showToast]);

  // UIはToastとして表示されるため、このコンポーネント自体は何もレンダリングしない
  return null;
}

export default ErrorToast;
