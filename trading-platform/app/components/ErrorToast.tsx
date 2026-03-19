import { toast } from 'sonner';
import { isAppError, handleError, getUserErrorMessage } from '@/app/lib/errors';
import type { ErrorSeverity } from '@/app/lib/errors';

/**
 * カスタムエラーを解析し、sonnerのtoastで表示する
 */
export function showErrorToast(error: unknown, context: string = 'App'): void {
  // unknownエラーをAppErrorとしてパース
  const appError = isAppError(error) ? error : handleError(error, context);
  const userMessage = getUserErrorMessage(appError);

  // 重大度に応じた設定
  const severity = appError.severity as ErrorSeverity;

  const toastOptions = {
    duration: severity === 'critical' ? 10000 : 5000,
  };

  if (severity === 'critical') {
    toast.error(appError.name || '重大なエラー', {
      description: userMessage,
      ...toastOptions,
    });
  } else if (severity === 'high') {
    toast.error(appError.name || 'エラー', {
      description: userMessage,
      ...toastOptions,
    });
  } else if (severity === 'medium') {
    toast.warning(appError.name || '警告', {
      description: userMessage,
      ...toastOptions,
    });
  } else {
    // low, info etc.
    toast.info(appError.name || '通知', {
      description: userMessage,
      ...toastOptions,
    });
  }
}
