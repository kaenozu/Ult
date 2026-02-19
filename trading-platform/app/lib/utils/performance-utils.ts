import { useCallback, useMemo } from 'react';
import { devWarn, devError } from '@/app/lib/utils/dev-logger';
import type { DependencyList } from 'react';



/**
 * パフォーマンス最適化ユーティリティ
 * 
 * ベストプラクティスに基づくReactパフォーマンス最適化のためのユーティリティ関数
 */

/**
 * 高コストな計算の結果をメモ化
 * @param factory メモ化する関数
 * @param deps 依存配列
 * @returns メモ化された値
 */
export function useMemoized<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

/**
 * コールバック関数を安定化
 * @param callback コールバック関数
 * @param deps 依存配列
 * @returns メモ化されたコールバック
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  return useCallback(callback, deps);
}

/**
 * オブジェクトを浅く比較してメモ化
 * 子コンポーネントへのpropsとして使うオブジェクトに最適
 */
export function useShallowMemo<T extends Record<string, unknown>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}

/**
 * リストアイテムのキー生成（Reactのreconciliation最適化）
 */
export function generateItemKey(prefix: string, id: string | number): string {
  return `${prefix}-${id}`;
}

/**
 * バッチ処理ユーティリティ
 * 大量のデータをチャンクに分割して処理
 */
export function createBatchedProcessor<T>(
  batchSize: number = 100,
  delayMs: number = 0
) {
  return async function processBatched(
    items: T[],
    processor: (batch: T[]) => Promise<void> | void
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processor(batch);
      
      if (delayMs > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };
}

/**
 * スロットリング関数
 * 高頻度なイベント（スクロール、リサイズなど）の処理を最適化
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * デバウンス関数
 * 入力イベントなどの処理を遅延させ、最後のイベントのみを処理
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * メモ化されたコンポーネントprops比較関数
 * 特定のpropsのみを比較対象とする場合に使用
 */
export function createPropsComparator<P extends Record<string, unknown>>(
  keys: (keyof P)[]
) {
  return (prevProps: P, nextProps: P): boolean => {
    return keys.every(key => prevProps[key] === nextProps[key]);
  };
}

/**
 * レンダリング回数を制限するフック
 * デバッグ用や、過剰なレンダリングを防止する場合に使用
 */
export function useRenderLimit(maxRenders: number = 10) {
  let renderCount = 0;
  
  return function shouldRender(): boolean {
    renderCount++;
    if (renderCount > maxRenders) {
      devWarn(`Component rendered ${renderCount} times, exceeding limit of ${maxRenders}`);
      return false;
    }
    return true;
  };
}

/**
 * 大きなリスト用の仮想化ヘルパー
 * 表示範囲のみをレンダリング
 */
export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVisibleRange(
  scrollTop: number,
  totalItems: number,
  config: VirtualizationConfig
): { startIndex: number; endIndex: number; virtualHeight: number } {
  const { itemHeight, containerHeight, overscan = 3 } = config;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount);
  const virtualHeight = totalItems * itemHeight;
  
  return { startIndex, endIndex, virtualHeight };
}

/**
 * 画像の遅延読み込み用Intersection Observer設定
 */
export function createLazyLoadObserver(
  onIntersect: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onIntersect(entry);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });
}

/**
 * メモリリーク防止用のクリーンアップヘルパー
 */
export function createCleanupManager() {
  const cleanups: Array<() => void> = [];
  
  return {
    add: (cleanup: () => void) => cleanups.push(cleanup),
    runAll: () => {
      cleanups.forEach(cleanup => {
        try {
          cleanup();
        } catch (e) {
          devError('Cleanup error:', e);
        }
      });
      cleanups.length = 0;
    }
  };
}
