import React from 'react';
import { toast } from 'sonner';
import {
  AppError,
  isAppError,
  handleError,
  getUserErrorMessage,
  ErrorSeverity
} from '@/app/lib/errors';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

/**
 * Toast options
 */
interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Default duration based on severity
 */
const getDuration = (severity: ErrorSeverity): number => {
  switch (severity) {
    case 'critical':
      return Infinity; // Needs manual dismissal
    case 'high':
      return 10000;
    case 'medium':
      return 5000;
    case 'low':
      return 3000;
    default:
      return 5000;
  }
};

/**
 * Maps error severity to toast styles and icons
 */
const getSeverityConfig = (severity: ErrorSeverity) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return {
        style: {
          backgroundColor: '#fee2e2', // red-100
          color: '#991b1b', // red-800
          borderColor: '#fca5a5', // red-300
        },
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      };
    case 'medium':
      return {
        style: {
          backgroundColor: '#fef3c7', // yellow-100
          color: '#92400e', // yellow-800
          borderColor: '#fcd34d', // yellow-300
        },
        icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      };
    case 'low':
    default:
      return {
        style: {
          backgroundColor: '#e0f2fe', // sky-100
          color: '#075985', // sky-800
          borderColor: '#7dd3fc', // sky-300
        },
        icon: <Info className="w-5 h-5 text-sky-600" />,
      };
  }
};

/**
 * Display an error toast notification
 *
 * @param error Error object (AppError or standard Error)
 * @param context Optional context string for error reporting
 * @param options Additional toast options
 */
export const showErrorToast = (
  error: unknown,
  context?: string,
  options?: ToastOptions
): string | number => {
  const appError = isAppError(error) ? error : handleError(error, context);
  const message = getUserErrorMessage(appError);
  const config = getSeverityConfig(appError.severity);

  return toast(message, {
    description: appError.code,
    duration: options?.duration ?? getDuration(appError.severity),
    position: options?.position ?? 'bottom-right',
    icon: config.icon,
    style: {
      ...config.style,
      border: '1px solid',
    },
    action: options?.action,
  });
};

/**
 * Display a success toast notification
 *
 * @param message Success message
 * @param options Additional toast options
 */
export const showSuccessToast = (
  message: string,
  options?: ToastOptions
): string | number => {
  return toast.success(message, {
    duration: options?.duration ?? 3000,
    position: options?.position ?? 'bottom-right',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    style: {
      backgroundColor: '#dcfce7', // green-100
      color: '#166534', // green-800
      borderColor: '#86efac', // green-300
      border: '1px solid',
    },
    action: options?.action,
  });
};

/**
 * Display an info toast notification
 *
 * @param message Info message
 * @param options Additional toast options
 */
export const showInfoToast = (
  message: string,
  options?: ToastOptions
): string | number => {
  return toast(message, {
    duration: options?.duration ?? 4000,
    position: options?.position ?? 'bottom-right',
    icon: <Info className="w-5 h-5 text-blue-600" />,
    style: {
      backgroundColor: '#dbeafe', // blue-100
      color: '#1e40af', // blue-800
      borderColor: '#93c5fd', // blue-300
      border: '1px solid',
    },
    action: options?.action,
  });
};

/**
 * The ErrorToast is essentially a facade over sonner's toast.
 * To use it, simply ensure `<Toaster />` from `sonner` is rendered at the root of your app.
 * This file provides the utility functions to trigger the toasts.
 */
export const ErrorToast = {
  error: showErrorToast,
  success: showSuccessToast,
  info: showInfoToast,
  dismiss: toast.dismiss,
};

export default ErrorToast;
