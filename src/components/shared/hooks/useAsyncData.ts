import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseAsyncDataOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface UseAsyncDataResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for async data fetching with comprehensive error handling
 * Provides loading states, error recovery, and retry logic
 */
export function useAsyncData<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { onSuccess, onError, retryCount = 3, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug('Starting async data fetch', {
        retryAttempts,
        maxRetries: retryCount,
      });

      const result = await asyncFn();
      setData(result);
      setRetryAttempts(0);

      onSuccess?.(result);
      logger.debug('Async data fetch successful');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      logger.error('Async data fetch failed', {
        error: error.message,
        retryAttempts,
        maxRetries: retryCount,
      });

      // Retry logic
      if (retryAttempts < retryCount) {
        setRetryAttempts(prev => prev + 1);
        setTimeout(
          () => {
            logger.info(
              `Retrying async data fetch (${retryAttempts + 1}/${retryCount})`
            );
            execute();
          },
          retryDelay * Math.pow(2, retryAttempts)
        ); // Exponential backoff
        return;
      }

      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, onSuccess, onError, retryCount, retryDelay, retryAttempts]);

  const refetch = useCallback(async () => {
    setRetryAttempts(0);
    await execute();
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setRetryAttempts(0);
  }, []);

  useEffect(() => {
    execute();
  }, deps);

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    refetch,
    reset,
  };
}

/**
 * Hook for optimistic updates with rollback capability
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const optimisticUpdate = useCallback(
    async (newData: T) => {
      const previousData = data;
      setData(newData);
      setIsUpdating(true);
      setError(null);

      try {
        const result = await updateFn(newData);
        setData(result);
        logger.info('Optimistic update successful');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setData(previousData); // Rollback on failure

        logger.error('Optimistic update failed, rolled back', {
          error: error.message,
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [data, updateFn]
  );

  return {
    data,
    isUpdating,
    error,
    update: optimisticUpdate,
    reset: () => setData(initialData),
  };
}

/**
 * Hook for debounced search/filter functionality
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for managing complex form state with validation
 */
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Partial<Record<keyof T, string>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const setTouchedField = useCallback(<K extends keyof T>(field: K) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateForm = useCallback(() => {
    if (!validate) return true;

    const validationErrors = validate(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void) => {
      setIsSubmitting(true);
      try {
        if (validateForm()) {
          await onSubmit(values);
          logger.info('Form submitted successfully');
        } else {
          logger.warn('Form validation failed');
        }
      } catch (error) {
        logger.error('Form submission failed', { error });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched: setTouchedField,
    handleSubmit,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}
