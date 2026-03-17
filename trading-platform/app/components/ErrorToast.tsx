'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import {
  AppError,
  extractErrorInfo,
  isAppError,
  handleError,
  reportError
} from '@/app/lib/errors';

// ============================================================================
// Error Toast Utility
// ============================================================================

/**
 * Show an error toast for a given error
 */
export const showErrorToast = (
  error: unknown,
  options?: {
    context?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }
): string | number => {
  // Extract standardized error info
  const appError = isAppError(error) ? error : handleError(error, options?.context);
  const info = extractErrorInfo(appError);

  // Determine toast type based on severity
  const severity = info.severity;

  // Create toast
  if (severity === 'critical' || severity === 'high') {
    return toast.error(info.message, {
      description: info.details || `Error Code: ${info.code}`,
      duration: severity === 'critical' ? Number.POSITIVE_INFINITY : 5000,
      action: options?.action,
    });
  } else if (severity === 'medium') {
    return toast.warning(info.message, {
      description: info.details,
      duration: 4000,
      action: options?.action,
    });
  } else {
    // Info/Low severity
    return toast.info(info.message, {
      description: info.details,
      duration: 3000,
      action: options?.action,
    });
  }
};

/**
 * Handle async operation with standardized error toast and logging
 */
export const handleAsyncWithToast = async <T,>(
  operation: () => Promise<T>,
  options?: {
    context?: string;
    loadingMessage?: string;
    successMessage?: string | ((data: T) => string);
    reportError?: boolean;
    rethrow?: boolean;
  }
): Promise<T | undefined> => {
  let toastId: string | number | undefined;

  if (options?.loadingMessage) {
    toastId = toast.loading(options.loadingMessage);
  }

  try {
    const result = await operation();

    if (toastId) {
      toast.dismiss(toastId);
    }

    if (options?.successMessage) {
      const message = typeof options.successMessage === 'function'
        ? options.successMessage(result)
        : options.successMessage;
      toast.success(message);
    }

    return result;
  } catch (error) {
    if (toastId) {
      toast.dismiss(toastId);
    }

    // Convert to AppError
    const appError = isAppError(error) ? error : handleError(error, options?.context);

    // Show toast
    showErrorToast(appError, { context: options?.context });

    // Optional reporting
    if (options?.reportError !== false) {
      reportError(appError, { context: options?.context });
    }

    if (options?.rethrow) {
      throw appError;
    }

    return undefined;
  }
};

// ============================================================================
// Error Toast Component
// ============================================================================

/**
 * A component to automatically show a toast when mounted with an error
 * Useful for catching and displaying errors at the component level
 */
export function ErrorToast({
  error,
  context,
  onDismiss
}: {
  error: unknown;
  context?: string;
  onDismiss?: () => void;
}) {
  const onDismissRef = React.useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (error) {
      const toastId = showErrorToast(error, { context });

      // Call onDismiss when component unmounts
      return () => {
        if (onDismissRef.current) {
          onDismissRef.current();
        }
      };
    }
  }, [error, context]);

  return null;
}
