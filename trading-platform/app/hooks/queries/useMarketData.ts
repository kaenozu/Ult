/**
 * Market Data Hooks
 * 
 * React Queryを使用した市場データ取得フック
 */

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateMarketData } from '@/app/providers/QueryProvider';
import { logger } from '@/app/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// Query Functions
// ============================================================================

async function fetchMarketQuote(symbol: string): Promise<MarketQuote> {
  const response = await fetch(
    `/api/market?type=quote&symbol=${encodeURIComponent(symbol)}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${symbol}: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchHistoricalData(
  symbol: string,
  interval: string,
  startDate?: string
): Promise<HistoricalData[]> {
  const params = new URLSearchParams({
    type: 'history',
    symbol,
    interval,
    ...(startDate && { startDate }),
  });
  
  const response = await fetch(`/api/market?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch history for ${symbol}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, MarketQuote>> {
  const symbolsParam = symbols.join(',');
  const response = await fetch(
    `/api/market?type=quote&symbol=${encodeURIComponent(symbolsParam)}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch batch quotes: ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 単一銘柄の株価を取得
 */
export function useMarketQuote(symbol: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.market.quote(symbol),
    queryFn: () => fetchMarketQuote(symbol),
    enabled: !!symbol && options?.enabled !== false,
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 1分ごとに再フェッチ
    meta: {
      context: 'MarketQuote',
      symbol,
    },
  });
}

/**
 * 複数銘柄の株価を一括取得
 */
export function useBatchMarketQuotes(symbols: string[]) {
  return useQuery({
    queryKey: queryKeys.market.batch(symbols),
    queryFn: () => fetchBatchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * 銘柄ごとに個別のクエリで取得（並列取得）
 */
export function useMultipleMarketQuotes(symbols: string[]) {
  return useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: queryKeys.market.quote(symbol),
      queryFn: () => fetchMarketQuote(symbol),
      enabled: !!symbol,
      staleTime: 30 * 1000,
    })),
  });
}

/**
 * ヒストリカルデータを取得
 */
export function useHistoricalData(
  symbol: string,
  interval: string = '1d',
  startDate?: string
) {
  return useQuery({
    queryKey: queryKeys.market.history(symbol, interval),
    queryFn: () => fetchHistoricalData(symbol, interval, startDate),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 30 * 60 * 1000, // 30分
  });
}

/**
 * リアルタイム株価の購読（ポーリング方式）
 */
export function useRealtimeQuote(symbol: string, interval: number = 5000) {
  return useQuery({
    queryKey: queryKeys.market.quote(symbol),
    queryFn: () => fetchMarketQuote(symbol),
    enabled: !!symbol,
    refetchInterval: interval,
    staleTime: interval / 2,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * キャッシュを手動で更新
 */
export function useRefreshMarketData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (symbol?: string) => {
      if (symbol) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.market.quote(symbol),
        });
      } else {
        await invalidateMarketData();
      }
    },
    onSuccess: (_, symbol) => {
      logger.info('Market data refreshed', { symbol: symbol || 'all' });
    },
  });
}

// ============================================================================
// Optimistic Updates
// ============================================================================

/**
 * 楽観的更新付きの株価データ更新
 */
export function useOptimisticQuoteUpdate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      symbol,
      update,
    }: {
      symbol: string;
      update: Partial<MarketQuote>;
    }) => {
      const queryKey = queryKeys.market.quote(symbol);
      
      // 現在のデータを保存
      const previousData = queryClient.getQueryData<MarketQuote>(queryKey);
      
      // 楽観的更新
      if (previousData) {
        queryClient.setQueryData<MarketQuote>(queryKey, {
          ...previousData,
          ...update,
        });
      }
      
      try {
        // 実際のAPI呼び出し
        const response = await fetch('/api/market/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, ...update }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update');
        }
        
        return response.json();
      } catch (error) {
        // エラー時はロールバック
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        throw error;
      }
    },
  });
}
