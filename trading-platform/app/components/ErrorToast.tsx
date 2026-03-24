'use client';

import React from 'react';
import { toast } from 'sonner';
import { AppError, ErrorSeverity, getUserErrorDetails } from '@/app/lib/errors';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';

/**
 * Severity based styling and icon mappings for toasts
 */
const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: React.ReactNode; colorClass: string }> = {
  critical: { icon: <XCircle className="w-5 h-5 text-red-500" />, colorClass: 'text-red-500' },
  high: { icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, colorClass: 'text-orange-500' },
  medium: { icon: <AlertCircle className="w-5 h-5 text-yellow-500" />, colorClass: 'text-yellow-500' },
  low: { icon: <Info className="w-5 h-5 text-blue-500" />, colorClass: 'text-blue-500' },
};

/**
 * Component for rendering custom toast content with title, description, and an optional retry action
 */
const ErrorToastContent: React.FC<{
  title: string;
  description?: string;
  severity: ErrorSeverity;
  onRetry?: () => void;
}> = ({ title, description, severity, onRetry }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm ${config.colorClass}`}>{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              onRetry();
              toast.dismiss();
            }}
            className="text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Utility to display an error toast using sonner and the unified error handling architecture.
 *
 * @param error - The error to display (can be any thrown value, will be parsed)
 * @param options - Additional display options
 */
export const showErrorToast = (
  error: unknown,
  options?: {
    title?: string;
    onRetry?: () => void;
    duration?: number;
  }
) => {
  const details = getUserErrorDetails(error);

  // Extract severity if it's an AppError
  let severity: ErrorSeverity = 'medium';
  if (error instanceof AppError) {
    severity = error.severity;
  } else if (typeof error === 'object' && error !== null && 'severity' in error) {
    severity = (error as any).severity as ErrorSeverity;
  }

  // Calculate appropriate duration
  const defaultDuration = severity === 'critical' ? 10000 : severity === 'high' ? 8000 : 5000;

  toast.custom((t) => (
    <ErrorToastContent
      title={options?.title || details.message}
      description={options?.title ? details.message : details.details}
      severity={severity}
      onRetry={details.recoverable ? options?.onRetry : undefined}
    />
  ), {
    duration: options?.duration || defaultDuration,
  });
};

/**
 * Component export (optional depending on if you want to mount the Toaster here,
 * but usually Toaster is mounted at the root and we just export the utility)
 * It's kept here as a dummy export to satisfy "create an ErrorToast component"
 * conceptually, if not needed as a React node itself.
 */
export function ErrorToast() {
  return null;
}
