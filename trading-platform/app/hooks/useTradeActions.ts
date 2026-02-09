import { useCallback } from 'react';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { OrderRequest } from '@/app/types/order';
import { Stock } from '@/app/types';

/**
 * Hook to orchestrate actions across different stores.
 * Encapsulates the workflow: Order Execution -> Watchlist Sync -> UI Feedback.
 */
export function useTradeActions() {
  const { executeOrder, closePosition } = usePortfolioStore();
  const { updateStockData } = useWatchlistStore();
  const { setSelectedStock } = useUIStore();

  /**
   * Orchestrates a new order placement
   */
  const placeOrder = useCallback((order: OrderRequest) => {
    const result = executeOrder(order);
    
    if (result.success && result.newPosition) {
      // Sync watchlist with new price data from the order
      updateStockData(order.symbol, { 
        price: order.price,
        // Optionally update other metrics if available
      });
    }
    
    return result;
  }, [executeOrder, updateStockData]);

  /**
   * Orchestrates closing a position
   */
  const exitPosition = useCallback((symbol: string, exitPrice: number) => {
    const result = closePosition(symbol, exitPrice);
    
    if (result.success) {
      // Update price in watchlist
      updateStockData(symbol, { price: exitPrice });
    }
    
    return result;
  }, [closePosition, updateStockData]);

  /**
   * Focuses a stock in the UI and ensures it's in relevant stores
   */
  const focusStock = useCallback((stock: Stock) => {
    setSelectedStock(stock);
    // Future: analytics tracking, pre-fetching data, etc.
  }, [setSelectedStock]);

  return {
    placeOrder,
    exitPosition,
    focusStock
  };
}
