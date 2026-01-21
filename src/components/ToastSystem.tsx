'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/components/shared/utils/common';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description: string | undefined;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearToasts }}
    >
      {children}
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm',
        'animate-in slide-in-from-right-2 fade-in duration-300',
        getToastStyles(toast.type)
      )}
      role='alert'
      aria-live='assertive'
    >
      <div className='flex-1 space-y-1'>
        <div className='font-semibold text-sm'>{toast.title}</div>
        {toast.description && (
          <div className='text-sm opacity-90'>{toast.description}</div>
        )}
      </div>

      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className='px-3 py-1 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors'
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => onRemove(toast.id)}
        className='w-5 h-5 flex items-center justify-center text-current opacity-60 hover:opacity-100 transition-opacity'
        aria-label='Close notification'
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className='fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full'>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

// Convenience hooks for different toast types
export const useSuccessToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (
      title: string,
      description?: string,
      options?: Partial<Pick<Toast, 'duration' | 'action'>>
    ) => addToast({ type: 'success', title, description, ...options }),
    [addToast]
  );
};

export const useErrorToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (
      title: string,
      description?: string,
      options?: Partial<Pick<Toast, 'duration' | 'action'>>
    ) => addToast({ type: 'error', title, description, ...options }),
    [addToast]
  );
};

export const useWarningToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (
      title: string,
      description?: string,
      options?: Partial<Pick<Toast, 'duration' | 'action'>>
    ) => addToast({ type: 'warning', title, description, ...options }),
    [addToast]
  );
};

export const useInfoToast = () => {
  const { addToast } = useToast();
  return useCallback(
    (
      title: string,
      description?: string,
      options?: Partial<Pick<Toast, 'duration' | 'action'>>
    ) => addToast({ type: 'info', title, description, ...options }),
    [addToast]
  );
};
