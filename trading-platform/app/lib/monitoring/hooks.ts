/**
 * React Hooks for Performance Monitoring
 * 
 * Provides hooks to track component render performance and other metrics.
 */

import { useEffect, useRef } from 'react';
import { trackRender } from '@/app/lib/monitoring';
import { logger } from '@/app/core/logger';

/**
 * Hook to track component render performance
 * 
 * @param componentName - Name of the component to track
 * @param dependencies - Dependencies to trigger render tracking
 */
export function useRenderTracking(
  componentName: string,
  dependencies: React.DependencyList = []
): void {
  const renderCount = useRef(0);
  const startTime = useRef<number>(0);

  // Track render start
  startTime.current = performance.now();

  useEffect(() => {
    renderCount.current++;
    const duration = performance.now() - startTime.current;
    
    // Only track if render took meaningful time
    if (duration > 1) {
      trackRender(componentName, duration, renderCount.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * Hook to measure async operation performance
 * 
 * @param operationName - Name of the operation to track
 * @returns Function to wrap async operations
 */
export function useOperationTracking(operationName: string) {
  return async <T,>(operation: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      trackRender(operationName, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackRender(`${operationName}.error`, duration);
      throw error;
    }
  };
}

/**
 * Hook to track component mount/unmount
 * 
 * @param componentName - Name of the component
 */
export function useComponentLifecycle(componentName: string): void {
  useEffect(() => {
    const mountTime = performance.now();
    logger.info(`[Lifecycle] ${componentName} mounted at ${mountTime.toFixed(2)}ms`, undefined, 'Monitoring');

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;
      logger.info(
        `[Lifecycle] ${componentName} unmounted after ${lifetime.toFixed(2)}ms`,
        undefined,
        'Monitoring'
      );
    };
  }, [componentName]);
}
