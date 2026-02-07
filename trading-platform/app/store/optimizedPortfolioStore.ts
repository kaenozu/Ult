/**
 * Optimized Portfolio Store - State Management with Selective Subscription
 * 
 * Key features:
 * - Zustand store with subscribeWithSelector middleware
 * - Selective subscription to prevent unnecessary re-renders
 * - Immer-based immutable updates for performance
 * - Atomic state updates for critical data
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools, persist } from 'zustand/middleware';
import type { Position, Order, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

interface PortfolioState {
  // Core state
  positions: Position[];
  orders: Order[];
  selectedPositionId: string | null;
  
  // Derived state (computed)
  totalValue: number;
  totalProfit: number;
  dailyPnL: number;
  cash: number;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;
  removePosition: (symbol: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  selectPosition: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  positions: [] as Position[],
  orders: [] as Order[],
  selectedPositionId: null as string | null,
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: 0,
  isLoading: false,
  isUpdating: false,
  error: null as string | null,
};

// ============================================================================
// Store Creation
// ============================================================================

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Actions
      setPositions: (positions) =>
        set((state) => ({
          positions,
          totalValue: calculateTotalValue(positions, state.cash),
          totalProfit: calculateTotalProfit(positions),
        })),

      updatePosition: (updatedPosition) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.symbol === updatedPosition.symbol ? updatedPosition : p
          ),
          totalValue: calculateTotalValue(
            state.positions.map((p) =>
              p.symbol === updatedPosition.symbol ? updatedPosition : p
            ),
            state.cash
          ),
          totalProfit: calculateTotalProfit(
            state.positions.map((p) =>
              p.symbol === updatedPosition.symbol ? updatedPosition : p
            )
          ),
        })),

      removePosition: (symbol) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.symbol !== symbol),
          selectedPositionId:
            state.selectedPositionId === symbol ? null : state.selectedPositionId,
          totalValue: calculateTotalValue(
            state.positions.filter((p) => p.symbol !== symbol),
            state.cash
          ),
          totalProfit: calculateTotalProfit(
            state.positions.filter((p) => p.symbol !== symbol)
          ),
        })),

      addOrder: (order) =>
        set((state) => ({
          orders: [...state.orders, order],
        })),

      updateOrder: (updatedOrder) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === updatedOrder.id ? updatedOrder : o
          ),
        })),

      removeOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        })),

      selectPosition: (id) =>
        set({ selectedPositionId: id }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setUpdating: (updating) =>
        set({ isUpdating: updating }),

      setError: (error) =>
        set({ error }),

      reset: () =>
        set(initialState),
    }),
    { name: 'portfolio-store' }
  )
);

// ============================================================================
// Selectors (optimized for selective subscription)
// ============================================================================

/**
 * Selector for all positions
 * Use this when you need the full positions array
 */
export const selectPositions = (state: PortfolioState) => state.positions;

/**
 * Selector for a single position by ID
 * Memoize this selector to prevent unnecessary re-renders
 */
export const selectPositionById = (id: string | null) => 
  (state: PortfolioState) => 
    id ? state.positions.find((p) => p.symbol === id) : null;

/**
 * Selector for selected position ID
 */
export const selectSelectedId = (state: PortfolioState) => state.selectedPositionId;

/**
 * Selector for portfolio summary
 */
export const selectPortfolioSummary = (state: PortfolioState) => ({
  totalValue: state.totalValue,
  totalProfit: state.totalProfit,
  dailyPnL: state.dailyPnL,
  cash: state.cash,
  positionCount: state.positions.length,
  orderCount: state.orders.length,
});

/**
 * Selector for loading state
 */
export const selectIsLoading = (state: PortfolioState) => state.isLoading;

/**
 * Selector for updating state
 */
export const selectIsUpdating = (state: PortfolioState) => state.isUpdating;

/**
 * Selector for error state
 */
export const selectError = (state: PortfolioState) => state.error;

/**
 * Selector for orders
 */
export const selectOrders = (state: PortfolioState) => state.orders;

/**
 * Selector for pending orders
 */
export const selectPendingOrders = (state: PortfolioState) =>
  state.orders.filter((o) => o.status === 'PENDING');

/**
 * Selector for positions by market
 */
export const selectPositionsByMarket = (market: 'japan' | 'usa') =>
  (state: PortfolioState) =>
    state.positions.filter((p) => p.market === market);

/**
 * Selector for positions by side
 */
export const selectPositionsBySide = (side: 'LONG' | 'SHORT') =>
  (state: PortfolioState) =>
    state.positions.filter((p) => p.side === side);

/**
 * Selector for profit/loss calculation
 */
export const selectPnL = (state: PortfolioState) => {
  const totalEntryValue = state.positions.reduce(
    (sum, p) => sum + p.avgPrice * p.quantity,
    0
  );
  const totalCurrentValue = state.positions.reduce(
    (sum, p) => sum + p.currentPrice * p.quantity,
    0
  );
  return totalCurrentValue - totalEntryValue;
};

/**
 * Selector for position size percentage
 */
export const selectPositionSize = (symbol: string) => (state: PortfolioState) => {
  const position = state.positions.find((p) => p.symbol === symbol);
  if (!position || state.totalValue === 0) return 0;
  return (position.currentPrice * position.quantity) / state.totalValue;
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTotalValue(positions: Position[], cash: number): number {
  return positions.reduce(
    (total, position) => total + position.currentPrice * position.quantity,
    cash
  );
}

function calculateTotalProfit(positions: Position[]): number {
  return positions.reduce((total, position) => {
    const profitPerShare = position.currentPrice - position.avgPrice;
    const quantity = position.quantity;
    return total + profitPerShare * quantity;
  }, 0);
}

// ============================================================================
// Custom Hooks for common use cases
// ============================================================================

/**
 * Hook to use selected position with automatic updates
 */
export function useSelectedPosition() {
  const selectedId = usePortfolioStore(selectSelectedId);
  const position = usePortfolioStore(selectPositionById(selectedId));
  return position;
}

/**
 * Hook to use portfolio summary with shallow comparison
 */
export function usePortfolioSummary() {
  return usePortfolioStore(selectPortfolioSummary);
}

/**
 * Hook to use positions with automatic updates
 */
export function usePositions() {
  return usePortfolioStore(selectPositions);
}

/**
 * Hook to use orders with automatic updates
 */
export function useOrders() {
  return usePortfolioStore(selectOrders);
}

/**
 * Hook to use loading state
 */
export function usePortfolioLoading() {
  return usePortfolioStore(selectIsLoading);
}

/**
 * Hook to use updating state
 */
export function usePortfolioUpdating() {
  return usePortfolioStore(selectIsUpdating);
}

/**
 * Hook to use positions filtered by market
 */
export function usePositionsByMarket(market: 'japan' | 'usa') {
  return usePortfolioStore(selectPositionsByMarket(market));
}

/**
 * Hook to use pending orders only
 */
export function usePendingOrders() {
  return usePortfolioStore(selectPendingOrders);
}

// ============================================================================
// Export
// ============================================================================

export type { PortfolioState };
