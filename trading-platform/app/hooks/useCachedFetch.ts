import { useEffect, useRef, useState, useCallback, useReducer } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface FetchConfig {
  ttl?: number; // キャッシュ有効期間（ミリ秒）
  retryCount?: number; // リトライ回数
  retryDelay?: number; // リトライ間隔（ミリ秒）
  enabled?: boolean; // フェッチを有効にするか
}

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isValidating: boolean; // バックグラウンドでの再検証中
}

type FetchAction<T> = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'VALIDATE_START' }
  | { type: 'VALIDATE_END' };

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, data: action.payload, isLoading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'VALIDATE_START':
      return { ...state, isValidating: true };
    case 'VALIDATE_END':
      return { ...state, isValidating: false };
    default:
      return state;
  }
}

/**
 * グローバルキャッシュストア
 * コンポーネント間でキャッシュを共有
 */
class GlobalCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private subscribers = new Map<string, Set<(data: unknown) => void>>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
    
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(data));
    }
  }
  
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback as (data: unknown) => void);
    
    return () => {
      this.subscribers.get(key)?.delete(callback as (data: unknown) => void);
    };
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const globalCache = new GlobalCache();

/**
 * キャッシュ付きデータフェッチフック
 * SWRライクな機能を提供
 */
export function useCachedFetch<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config: FetchConfig = {}
): FetchState<T> & { mutate: () => Promise<void> } {
  const { 
    ttl = 60000, // デフォルト1分
    retryCount = 3, 
    retryDelay = 1000,
    enabled = true 
  } = config;
  
  const [state, dispatch] = useReducer(fetchReducer<T>, {
    data: null,
    isLoading: enabled,
    error: null,
    isValidating: false
  });
  
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const executeFetch = useCallback(async (isBackground = false) => {
    if (!key || !enabled) return;
    
    // キャッシュをチェック
    const cached = globalCache.get<T>(key);
    if (cached && !isBackground) {
      dispatch({ type: 'FETCH_SUCCESS', payload: cached });
      return;
    }
    
    if (isBackground) {
      dispatch({ type: 'VALIDATE_START' });
    } else {
      dispatch({ type: 'FETCH_START' });
    }
    
    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const data = await fetcher();
      
      // キャッシュに保存
      globalCache.set(key, data, ttl);
      
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
      retryCountRef.current = 0;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => executeFetch(isBackground), retryDelay * retryCountRef.current);
      } else {
        dispatch({ type: 'FETCH_ERROR', payload: error as Error });
      }
    } finally {
      if (isBackground) {
        dispatch({ type: 'VALIDATE_END' });
      }
    }
  }, [key, fetcher, ttl, retryCount, retryDelay, enabled]);
  
  // 初回フェッチとキャッシュ購読
  useEffect(() => {
    if (!key || !enabled) return;
    
    // キャッシュから即座に表示
    const cached = globalCache.get<T>(key);
    if (cached) {
      dispatch({ type: 'FETCH_SUCCESS', payload: cached });
    }
    
    // バックグラウンドで再検証
    executeFetch(true);
    
    // キャッシュ更新を購読
    const unsubscribe = globalCache.subscribe<T>(key, (data) => {
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    });
    
    return () => {
      unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, enabled, executeFetch]);
  
  // 手動での再フェッチ
  const mutate = useCallback(async () => {
    if (key) {
      globalCache.invalidate(key);
      await executeFetch();
    }
  }, [key, executeFetch]);
  
  return { ...state, mutate };
}

/**
 * 楽観的更新用フック
 * UIを即座に更新し、バックグラウンドでAPI呼び出し
 */
export function useOptimisticUpdate<T>(
  key: string,
  updater: (data: T) => Promise<T>,
  onError?: (error: Error) => void
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  
  const update = useCallback(async (newData: T) => {
    const previousData = globalCache.get<T>(key);
    
    // 楽観的にキャッシュを更新
    setOptimisticData(newData);
    if (previousData) {
      globalCache.set(key, newData, Infinity); // 一時的に永続化
    }
    
    try {
      const result = await updater(newData);
      globalCache.set(key, result, 60000);
      setOptimisticData(null);
      return result;
    } catch (error) {
      // エラー時は元のデータに戻す
      if (previousData) {
        globalCache.set(key, previousData, 60000);
      }
      setOptimisticData(null);
      onError?.(error as Error);
      throw error;
    }
  }, [key, updater, onError]);
  
  return { update, optimisticData };
}

/**
 * 無限スクロール用フック
 * ページネーション付きデータの効率的な取得
 */
export function useInfiniteScroll<T>(
  keyPrefix: string,
  fetcher: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  config: { pageSize?: number; threshold?: number } = {}
) {
  const { pageSize = 20, threshold = 100 } = config;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsRef = useRef<T[]>([]);
  
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const key = `${keyPrefix}-page-${page}`;
      let result = globalCache.get<{ data: T[]; hasMore: boolean }>(key);
      
      if (!result) {
        result = await fetcher(page);
        globalCache.set(key, result, 300000); // 5分キャッシュ
      }
      
      itemsRef.current = [...itemsRef.current, ...result.data];
      setHasMore(result.hasMore);
      setPage(p => p + 1);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore, keyPrefix, fetcher]);
  
  const reset = useCallback(() => {
    setPage(1);
    setHasMore(true);
    itemsRef.current = [];
    globalCache.invalidatePattern(new RegExp(`^${keyPrefix}-page-`));
  }, [keyPrefix]);
  
  return {
    items: itemsRef.current,
    loadMore,
    hasMore,
    isLoadingMore,
    reset
  };
}

/**
 * ポーリング用フック
 * 定期的なデータ更新
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  config: { enabled?: boolean; onError?: (error: Error) => void } = {}
) {
  const { enabled = true, onError } = config;
  const [data, setData] = useState<T | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const poll = async () => {
      try {
        const result = await fetcher();
        setData(result);
      } catch (error) {
        onError?.(error as Error);
      }
    };
    
    // 初回実行
    poll();
    
    // 定期実行
    intervalRef.current = setInterval(poll, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetcher, interval, enabled, onError]);
  
  return data;
}
