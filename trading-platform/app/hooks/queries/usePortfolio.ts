/**
 * Portfolio Hooks
 * 
 * React Queryを使用したポートフォリオ・注文データ取得フック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidatePortfolio } from '@/app/providers/QueryProvider';
import { logger } from '@/app/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface Position {
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  marketValue: number;
}

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  createdAt: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  cash: number;
  buyingPower: number;
}

// ============================================================================
// Query Functions
// ============================================================================

async function fetchPortfolio(): Promise<{
  positions: Position[];
  summary: PortfolioSummary;
}> {
  const response = await fetch('/api/portfolio');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchOrders(filters?: {
  status?: string;
  symbol?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Order[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.symbol) params.append('symbol', filters.symbol);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const queryString = params.toString();
  const response = await fetch(`/api/orders${queryString ? `?${queryString}` : ''}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.orders || [];
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * ポートフォリオデータを取得
 */
export function usePortfolio(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.portfolio.positions(),
    queryFn: fetchPortfolio,
    staleTime: 60 * 1000, // 1分
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // デフォルト1分
    meta: {
      context: 'Portfolio',
    },
  });
}

/**
 * 注文履歴を取得
 */
export function useOrders(filters?: Parameters<typeof fetchOrders>[0]) {
  return useQuery({
    queryKey: [...queryKeys.portfolio.orders(), filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 30 * 1000,
  });
}

/**
 * ポートフォリオサマリーのみ取得（軽量版）
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(),
    queryFn: async () => {
      const portfolio = await fetchPortfolio();
      return portfolio.summary;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

interface PlaceOrderInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

/**
 * 注文を作成
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_order',
          ...input,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // 注文成功後、ポートフォリオと注文履歴を更新
      invalidatePortfolio();
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.orders() });
      logger.info('Order placed successfully');
    },
    onError: (error) => {
      logger.error('Failed to place order', error as Error);
    },
  });
}

interface ClosePositionInput {
  symbol: string;
  quantity?: number; // 未指定の場合は全数量
}

/**
 * ポジションを閉じる
 */
export function useClosePosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ClosePositionInput) => {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_position',
          ...input,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close position');
      }
      
      return response.json();
    },
    onSuccess: (_, input) => {
      invalidatePortfolio();
      logger.info('Position closed', { symbol: input.symbol });
    },
    onError: (error, input) => {
      logger.error('Failed to close position', error as Error, { symbol: input.symbol });
    },
  });
}

interface CancelOrderInput {
  orderId: string;
}

/**
 * 注文をキャンセル
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CancelOrderInput) => {
      const response = await fetch(`/api/orders/${input.orderId}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.orders() });
      logger.info('Order cancelled');
    },
  });
}

// ============================================================================
// Optimistic Updates
// ============================================================================

/**
 * 楽観的更新付きの注文作成
 */
export function usePlaceOrderOptimistic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) => {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_order',
          ...input,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }
      
      return response.json();
    },
    onMutate: async (input) => {
      // 現在の注文リストを取得
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolio.orders() });
      const previousOrders = queryClient.getQueryData<Order[]>(
        queryKeys.portfolio.orders()
      );
      
      // 楽観的に新規注文を追加
      const optimisticOrder: Order = {
        id: `temp-${Date.now()}`,
        symbol: input.symbol,
        side: input.side,
        type: input.type,
        quantity: input.quantity,
        price: input.price,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData<Order[]>(queryKeys.portfolio.orders(), (old = []) => [
        optimisticOrder,
        ...old,
      ]);
      
      return { previousOrders };
    },
    onError: (err, input, context) => {
      // エラー時はロールバック
      if (context?.previousOrders) {
        queryClient.setQueryData(queryKeys.portfolio.orders(), context.previousOrders);
      }
      logger.error('Failed to place order', err as Error, { symbol: input.symbol });
    },
    onSettled: () => {
      // 成功・失敗に関わらず最新データをフェッチ
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.orders() });
    },
  });
}
