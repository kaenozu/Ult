import { useCallback, useMemo } from 'react';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useJournalStore } from '@/app/store/journalStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import type { Stock, Position, Order } from '@/app/types';

/**
 * 最適化されたストアセレクターフック
 * 必要なデータのみを購読し、不要な再レンダリングを防止
 */

// Portfolio Store Selectors
export function usePortfolioPositions(): Position[] {
  return usePortfolioStore(useCallback(state => state.portfolio.positions, []));
}

export function usePortfolioOrders(): Order[] {
  return usePortfolioStore(useCallback(state => state.portfolio.orders, []));
}

export function usePortfolioCash(): number {
  return usePortfolioStore(useCallback(state => state.portfolio.cash, []));
}

export function usePortfolioValue(): number {
  return usePortfolioStore(useCallback(state => state.portfolio.totalValue, []));
}

export function usePortfolioPnL(): { totalProfit: number; dailyPnL: number } {
  return usePortfolioStore(
    useCallback(
      state => ({
        totalProfit: state.portfolio.totalProfit,
        dailyPnL: state.portfolio.dailyPnL
      }),
      []
    )
  );
}

export function usePositionForSymbol(symbol: string): Position | undefined {
  return usePortfolioStore(
    useCallback(
      state => state.portfolio.positions.find(p => p.symbol === symbol),
      [symbol]
    )
  );
}

export function useClosePosition() {
  return usePortfolioStore(useCallback(state => state.closePosition, []));
}

// Journal Store Selectors
export function useJournalEntries() {
  return useJournalStore(useCallback(state => state.journal, []));
}

export function useJournalMetrics() {
  return useJournalStore(
    useCallback(
      state => {
        const entries = state.journal;
        const closedTrades = entries.filter(e => e.status === 'CLOSED');
        const winningTrades = closedTrades.filter(e => (e.profit || 0) > 0);
        
        return {
          totalTrades: entries.length,
          closedTrades: closedTrades.length,
          winRate: closedTrades.length > 0 
            ? (winningTrades.length / closedTrades.length) * 100 
            : 0,
          totalProfit: closedTrades.reduce((sum, e) => sum + (e.profit || 0), 0)
        };
      },
      []
    )
  );
}

// Watchlist Store Selectors
export function useWatchlistItems(): Stock[] {
  return useWatchlistStore(useCallback(state => state.watchlist, []));
}

export function useIsInWatchlist(symbol: string): boolean {
  return useWatchlistStore(
    useCallback(
      state => state.watchlist.some(s => s.symbol === symbol),
      [symbol]
    )
  );
}

export function useWatchlistActions() {
  const addToWatchlist = useWatchlistStore(useCallback(state => state.addToWatchlist, []));
  const removeFromWatchlist = useWatchlistStore(useCallback(state => state.removeFromWatchlist, []));
  
  return useMemo(
    () => ({ addToWatchlist, removeFromWatchlist }),
    [addToWatchlist, removeFromWatchlist]
  );
}

/**
 * 複数のポートフォリオメトリクスを一度に取得
 * 関連するデータが変更された時のみ再レンダリング
 */
export function usePortfolioSummary() {
  return usePortfolioStore(
    useCallback(
      state => ({
        totalValue: state.portfolio.totalValue,
        totalProfit: state.portfolio.totalProfit,
        dailyPnL: state.portfolio.dailyPnL,
        cash: state.portfolio.cash,
        positionCount: state.portfolio.positions.length,
        orderCount: state.portfolio.orders.length
      }),
      []
    )
  );
}

/**
 * ポジションのパフォーマンスメトリクス
 * メモ化されて計算コストを削減
 */
export function usePositionMetrics(symbol: string) {
  const position = usePositionForSymbol(symbol);
  
  return useMemo(() => {
    if (!position) return null;
    
    const currentValue = position.quantity * position.currentPrice;
    const investedValue = position.quantity * position.avgPrice;
    const unrealizedPnL = currentValue - investedValue;
    const unrealizedPnLPercent = (unrealizedPnL / investedValue) * 100;
    
    return {
      currentValue,
      investedValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      daysHeld: Math.floor(
        (Date.now() - new Date(position.entryDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    };
  }, [position]);
}

/**
 * ウォッチリストの統計情報
 */
export function useWatchlistStats() {
  const watchlist = useWatchlistItems();
  
  return useMemo(() => {
    const japanStocks = watchlist.filter(s => s.market === 'japan').length;
    const usaStocks = watchlist.filter(s => s.market === 'usa').length;
    const gainers = watchlist.filter(s => s.change > 0).length;
    const losers = watchlist.filter(s => s.change < 0).length;
    
    return {
      total: watchlist.length,
      japanStocks,
      usaStocks,
      gainers,
      losers,
      unchanged: watchlist.length - gainers - losers
    };
  }, [watchlist]);
}

/**
 * 取引履歴のフィルタリングとソート
 * 高コストな計算をメモ化
 */
export function useFilteredOrders(
  filter: {
    symbol?: string;
    side?: 'BUY' | 'SELL';
    status?: 'PENDING' | 'FILLED' | 'CANCELLED';
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const orders = usePortfolioOrders();
  
  return useMemo(() => {
    return orders.filter(order => {
      if (filter.symbol && order.symbol !== filter.symbol) return false;
      if (filter.side && order.side !== filter.side) return false;
      if (filter.status && order.status !== filter.status) return false;
      
      const orderDate = new Date(order.date);
      if (filter.startDate && orderDate < filter.startDate) return false;
      if (filter.endDate && orderDate > filter.endDate) return false;
      
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filter.symbol, filter.side, filter.status, filter.startDate, filter.endDate]);
}

/**
 * パフォーマンスモニタリング用フック
 * デバッグや最適化の検証に使用
 */
export function useStoreRenderCount(storeName: string) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  
  React.useEffect(() => {
    if (renderCount.current > 50) {
      console.warn(`${storeName} has rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
}

import React from 'react';
