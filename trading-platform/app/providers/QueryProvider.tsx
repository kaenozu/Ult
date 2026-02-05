/**
 * React Query Configuration
 * 
 * React Query (TanStack Query) の設定
 * データフェッチング、キャッシング、同期の最適化
 */

'use client';

import { ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { logger } from '@/app/lib/logger';

// ============================================================================
// Query Client Configuration
// ============================================================================

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logger.error('Query error', error as Error, {
        queryKey: query.queryKey,
        meta: query.meta,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      logger.error('Mutation error', error as Error, {
        mutationId: mutation.mutationId,
        variables,
        context,
      });
    },
  }),
  defaultOptions: {
    queries: {
      // キャッシュ設定
      staleTime: 5 * 60 * 1000, // 5分間はfresh
      gcTime: 10 * 60 * 1000, // 10分間キャッシュ保持
      
      // 再フェッチ設定
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: 'always',
      
      // エラーハンドリング
      retry: (failureCount, error) => {
        // 4xxエラーはリトライしない
        if (error instanceof Response && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // エラーハンドリング
      throwOnError: false,
      
      // パフォーマンス
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// ============================================================================
// Provider Component
// ============================================================================

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  // Market Data
  market: {
    all: ['market'] as const,
    quote: (symbol: string) => [...queryKeys.market.all, 'quote', symbol] as const,
    history: (symbol: string, interval: string) =>
      [...queryKeys.market.all, 'history', symbol, interval] as const,
    batch: (symbols: string[]) =>
      [...queryKeys.market.all, 'batch', symbols.sort().join(',')] as const,
  },
  
  // Portfolio
  portfolio: {
    all: ['portfolio'] as const,
    positions: () => [...queryKeys.portfolio.all, 'positions'] as const,
    orders: () => [...queryKeys.portfolio.all, 'orders'] as const,
    summary: () => [...queryKeys.portfolio.all, 'summary'] as const,
  },
  
  // Trading
  trading: {
    all: ['trading'] as const,
    status: () => [...queryKeys.trading.all, 'status'] as const,
    signals: () => [...queryKeys.trading.all, 'signals'] as const,
    alerts: () => [...queryKeys.trading.all, 'alerts'] as const,
  },
  
  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  
  // News
  news: {
    all: ['news'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.news.all, 'list', filters] as const,
    sentiment: (symbol: string) => [...queryKeys.news.all, 'sentiment', symbol] as const,
  },
  
  // Backtest
  backtest: {
    all: ['backtest'] as const,
    results: (id: string) => [...queryKeys.backtest.all, 'results', id] as const,
    history: () => [...queryKeys.backtest.all, 'history'] as const,
  },
};

// ============================================================================
// Prefetch Helpers
// ============================================================================

export function prefetchMarketData(symbol: string): void {
  queryClient.prefetchQuery({
    queryKey: queryKeys.market.quote(symbol),
    queryFn: () => fetchMarketQuote(symbol),
    staleTime: 30 * 1000, // 30秒
  });
}

export function prefetchPortfolio(): void {
  queryClient.prefetchQuery({
    queryKey: queryKeys.portfolio.positions(),
    queryFn: fetchPortfolio,
    staleTime: 60 * 1000, // 1分
  });
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchMarketQuote(symbol: string) {
  const response = await fetch(`/api/market?type=quote&symbol=${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${symbol}`);
  }
  return response.json();
}

async function fetchPortfolio() {
  const response = await fetch('/api/portfolio');
  if (!response.ok) {
    throw new Error('Failed to fetch portfolio');
  }
  return response.json();
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

export function invalidatePortfolio(): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.portfolio.all,
  });
}

export function invalidateMarketData(symbol?: string): Promise<void> {
  if (symbol) {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.market.quote(symbol),
    });
  }
  return queryClient.invalidateQueries({
    queryKey: queryKeys.market.all,
  });
}

export function clearAllCache(): void {
  queryClient.clear();
}

// ============================================================================
// Optimistic Updates
// ============================================================================

export function optimisticUpdate<T>(
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
): void {
  queryClient.setQueryData<T>(queryKey, (old) => updater(old));
}

export function rollbackOptimisticUpdate(queryKey: readonly unknown[]): void {
  queryClient.invalidateQueries({ queryKey });
}
