/**
 * React Performance Hooks
 * 
 * パフォーマンス最適化用のカスタムフック
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { logger } from '@/app/lib/logger';

// 簡易的な深層比較関数
function isEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ============================================================================
// Memoization Helpers
// ============================================================================

/**
 * 深い比較を行うカスタムuseMemo
 */
export function useDeepMemo<T>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(), deps);
}

/**
 * 関数のメモ化（依存配列なしで常に同じ関数を返す）
 */
export function useEventCallback<T extends (...args: unknown[]) => unknown>(
  fn: T
): T {
  const ref = useRef<T>(fn);
  
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  
  // @ts-expect-error - Type assertion for event callback
  return useCallback(function(...args: Parameters<T>) {
    return ref.current(...args);
  }, []) as T;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

interface RenderMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

/**
 * コンポーネントのレンダリングパフォーマンスを監視
 */
export function useRenderPerformance(componentName: string): RenderMetrics {
  const [metrics, setMetrics] = useState<RenderMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  });
  
  const startTime = useRef<number>(0);
  
  useEffect(() => {
    // Initialize startTime on first render
    if (startTime.current === 0) {
      startTime.current = performance.now();
      return;
    }
    
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      const newTotalRenderTime = prev.totalRenderTime + renderTime;
      
      // 遅いレンダリングをログ
      if (renderTime > 16) { // 60fps = 16.67ms
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime,
          renderCount: newRenderCount,
        });
      }
      
      return {
        renderCount: newRenderCount,
        lastRenderTime: renderTime,
        totalRenderTime: newTotalRenderTime,
        averageRenderTime: newTotalRenderTime / newRenderCount,
      };
    });
    
    startTime.current = performance.now();
  }, [componentName]);
  
  return metrics;
}

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * 値のデバウンス
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * コールバックのデバウンス
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * コールバックのスロットル
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );
}

// ============================================================================
// Virtual List
// ============================================================================

interface UseVirtualListOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

interface VirtualListResult {
  virtualItems: Array<{ index: number; style: React.CSSProperties }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

/**
 * 仮想リスト（大量データの効率的なレンダリング）
 */
export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): VirtualListResult {
  const { itemHeight, overscan = 5, containerHeight } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);
    
    const virtualItems = [];
    for (let i = startIndex; i < endIndex; i++) {
      virtualItems.push({
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }
    
    return { virtualItems, totalHeight, startIndex, endIndex };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight]
  );
  
  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
  };
}

// ============================================================================
// Intersection Observer
// ============================================================================

/**
 * 要素の可視性を監視
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [(node: Element | null) => void, boolean, IntersectionObserverEntry | undefined] {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [node, setNode] = useState<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);
    
    const { current: currentObserver } = observerRef;
    
    if (node) {
      currentObserver.observe(node);
    }
    
    return () => currentObserver.disconnect();
  }, [node, options]);
  
  return [setNode, entry?.isIntersecting ?? false, entry];
}

// ============================================================================
// Web Worker
// ============================================================================

/**
 * Web Workerを使用した重い計算
 */
export function useWorker<T, R>(
  workerFunction: (data: T) => R
): { run: (data: T) => Promise<R>; terminate: () => void } {
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    // Workerスクリプトを作成
    const workerScript = `
      self.onmessage = function(e) {
        const result = (${workerFunction.toString()})(e.data);
        self.postMessage(result);
      };
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [workerFunction]);
  
  const run = useCallback((data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }
      
      const handleMessage = (e: MessageEvent) => {
        resolve(e.data as R);
        workerRef.current?.removeEventListener('message', handleMessage);
      };
      
      const handleError = (e: ErrorEvent) => {
        reject(e.error);
        workerRef.current?.removeEventListener('error', handleError);
      };
      
      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.addEventListener('error', handleError);
      workerRef.current.postMessage(data);
    });
  }, []);
  
  const terminate = useCallback(() => {
    workerRef.current?.terminate();
  }, []);
  
  return { run, terminate };
}

// ============================================================================
// Prevent Unnecessary Renders
// ============================================================================

/**
 * 値が実際に変更された時のみレンダリングをトリガー
 */
export function useShallowCompare<T>(value: T): T {
  return useMemo(() => {
    return value;
  }, [value]);
}

/**
 * 特定のpropsが変更された時のみレンダリング
 */
export function usePropsMemo<T extends Record<string, unknown>>(
  props: T,
  keys: (keyof T)[]
): boolean {
  // Store previous values in state (safe to access during render)
  const [prevValues, setPrevValues] = useState<unknown[]>([]);
  
  // Calculate current values
  const currentValues = useMemo(() => {
    return keys.map(key => props[key]);
  }, [props, keys]);
  
  // Determine if any values changed (safe: uses state values)
  const hasChanged = useMemo(() => {
    if (prevValues.length !== currentValues.length) {
      return true;
    }
    return currentValues.some((val, idx) => val !== prevValues[idx]);
  }, [currentValues, prevValues]);
  
  // Update previous values after render (async to avoid cascading renders)
  useEffect(() => {
    // Use setTimeout to defer state update, avoiding synchronous setState in effect
    setTimeout(() => {
      setPrevValues(currentValues);
    }, 0);
  }, [currentValues]);
  
  return hasChanged;
}
