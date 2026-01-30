import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, Position } from '../types';
import { usePortfolioStore } from './portfolioStore';

// ============================================================================
// Order Execution Types
// ============================================================================

export interface OrderExecutionResult {
  success: boolean;
  order?: Order;
  position?: Position;
  error?: string;
  errorCode?: OrderErrorCode;
}

export type OrderErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_ORDER'
  | 'POSITION_NOT_FOUND'
  | 'MARKET_CLOSED'
  | 'RATE_LIMIT'
  | 'CONCURRENT_EXECUTION'
  | 'UNKNOWN_ERROR';

export interface OrderExecutionOptions {
  skipBalanceCheck?: boolean;
  validateOnly?: boolean;
}

// ============================================================================
// Atomic Order Execution State
// ============================================================================

interface OrderExecutionState {
  isExecuting: boolean;
  lastExecutionTime: number;
  executionQueue: string[];
}

const initialOrderExecutionState: OrderExecutionState = {
  isExecuting: false,
  lastExecutionTime: 0,
  executionQueue: [],
};

interface OrderExecutionStore {
  orderExecutionState: OrderExecutionState;
  executeOrder: (order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' }) => void;
  executeOrderAtomic: (order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' }, options?: OrderExecutionOptions) => OrderExecutionResult;
}

/**
 * Validates an order before execution.
 * Performs all consistency checks without modifying state.
 */
function validateOrder(
  order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' },
  options: OrderExecutionOptions
): { valid: boolean; error?: OrderErrorCode; message?: string } {
  // Validate order parameters
  if (order.quantity <= 0) {
    return { valid: false, error: 'INVALID_ORDER', message: 'Quantity must be greater than 0' };
  }

  if (order.price <= 0) {
    return { valid: false, error: 'INVALID_ORDER', message: 'Price must be greater than 0' };
  }

  if (!order.symbol || !order.name) {
    return { valid: false, error: 'INVALID_ORDER', message: 'Symbol and name are required' };
  }

  // Check for concurrent execution (rate limiting)
  const now = Date.now();
  const timeSinceLastExecution = now - initialOrderExecutionState.lastExecutionTime;
  if (timeSinceLastExecution < 50) { // 50ms debounce
    return { valid: false, error: 'CONCURRENT_EXECUTION', message: 'Order execution too frequent' };
  }

  // Check balance for LONG orders (unless skipBalanceCheck is true)
  if (!options.skipBalanceCheck && order.side === 'LONG') {
    const totalCost = order.quantity * order.price;
    const { portfolio } = usePortfolioStore.getState();
    if (portfolio.cash < totalCost) {
      return { valid: false, error: 'INSUFFICIENT_FUNDS', message: `Insufficient funds. Required: ${totalCost}, Available: ${portfolio.cash}` };
    }
  }

  return { valid: true };
}

/**
 * Atomic order execution implementation.
 * This function performs all validation and returns the result without modifying state.
 * State updates are handled by the caller (executeOrderAtomic) to ensure atomicity.
 */
function executeOrderAtomicImpl(
  order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' },
  options: OrderExecutionOptions
): OrderExecutionResult {
  // Step 1: Validate the order
  const validation = validateOrder(order, options);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.message,
      errorCode: validation.error,
    };
  }

  // Step 2: If validateOnly option is set, return success without executing
  if (options.validateOnly) {
    return {
      success: true,
    };
  }

  // Step 3: Create the position object
  const newPosition: Position = {
    symbol: order.symbol,
    name: order.name,
    market: order.market,
    side: order.side,
    quantity: order.quantity,
    avgPrice: order.price,
    currentPrice: order.price,
    change: 0,
    entryDate: new Date().toISOString().split('T')[0],
  };

  // Step 4: Return success with position data
  // Actual state update is performed atomically by the caller
  return {
    success: true,
    position: newPosition,
  };
}

function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useOrderExecutionStore = create<OrderExecutionStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // Order Execution State
      // ============================================================================
      orderExecutionState: initialOrderExecutionState,

      // ============================================================================
      // Legacy Order Execution (Non-atomic - DEPRECATED)
      // ============================================================================
      executeOrder: (order) => {
        const totalCost = order.quantity * order.price;
        const { portfolio } = usePortfolioStore.getState();
        
        // Basic check, though OrderPanel handles UI disabled state
        if (order.side === 'LONG' && portfolio.cash < totalCost) {
          return;
        }

        const positions = [...portfolio.positions];
        const newPosition: Position = {
          symbol: order.symbol,
          name: order.name,
          market: order.market,
          side: order.side,
          quantity: order.quantity,
          avgPrice: order.price,
          currentPrice: order.price,
          change: 0,
          entryDate: new Date().toISOString().split('T')[0],
        };

        const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

        if (existingIndex >= 0) {
          const existing = positions[existingIndex];
          const combinedCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
          const totalQty = existing.quantity + newPosition.quantity;

          positions[existingIndex] = {
            ...existing,
            quantity: totalQty,
            avgPrice: combinedCost / totalQty,
            currentPrice: newPosition.currentPrice,
          };
        } else {
          positions.push(newPosition);
        }

        // Recalculate totals
        const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
        const totalProfit = positions.reduce((sum, p) => {
          const pnl = p.side === 'LONG'
            ? (p.currentPrice - p.avgPrice) * p.quantity
            : (p.avgPrice - p.currentPrice) * p.quantity;
          return sum + pnl;
        }, 0);
        const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

        // Deduct cash for both BUY and SELL as per original logic (Short selling collateral/margin implied)
        const newCash = portfolio.cash - totalCost;

        usePortfolioStore.getState().updatePortfolio(positions);
        usePortfolioStore.getState().setCash(newCash);
      },

      // ============================================================================
      // Atomic Order Execution (RECOMMENDED)
      // ============================================================================
      executeOrderAtomic: (order, options = {}) => {
        const state = get();

        // Check for concurrent execution (rate limiting) first
        const now = Date.now();
        const timeSinceLastExecution = now - state.orderExecutionState.lastExecutionTime;
        if (timeSinceLastExecution < 50) { // 50ms debounce
          return {
            success: false,
            error: 'Order execution too frequent',
            errorCode: 'CONCURRENT_EXECUTION',
          };
        }

        // Perform validation after rate limiting check
        const validation = validateOrder(order, options);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.message,
            errorCode: validation.error,
          };
        }

        // Update execution state to indicate we're executing
        set((currentState) => ({
          orderExecutionState: {
            ...currentState.orderExecutionState,
            isExecuting: true,
          },
        }));

        try {
          const result = executeOrderAtomicImpl(order, options);

          if (result.success && result.position) {
            // Apply state updates atomically
            set((currentState) => {
              const totalCost = order.quantity * order.price;
              
              const { portfolio } = usePortfolioStore.getState();
              const positions = [...portfolio.positions];

              const existingIndex = positions.findIndex(
                p => p.symbol === result.position!.symbol && p.side === result.position!.side
              );

              if (existingIndex >= 0) {
                // Update existing position with weighted average
                const existing = positions[existingIndex];
                const combinedCost = (existing.avgPrice * existing.quantity) +
                                    (result.position!.avgPrice * result.position!.quantity);
                const totalQty = existing.quantity + result.position!.quantity;

                positions[existingIndex] = {
                  ...existing,
                  quantity: totalQty,
                  avgPrice: combinedCost / totalQty,
                  currentPrice: result.position!.currentPrice,
                };
              } else {
                // Add new position
                positions.push(result.position!);
              }

              // Recalculate portfolio statistics
              const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
              const totalProfit = positions.reduce((sum, p) => {
                const pnl = p.side === 'LONG'
                  ? (p.currentPrice - p.avgPrice) * p.quantity
                  : (p.avgPrice - p.currentPrice) * p.quantity;
                return sum + pnl;
              }, 0);
              const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

              // Create order record
              const newOrder: Order = {
                id: generateOrderId(),
                symbol: order.symbol,
                type: order.type,
                side: order.side === 'LONG' ? 'BUY' : 'SELL',
                quantity: order.quantity,
                price: order.price,
                status: 'FILLED',
                date: new Date().toISOString(),
              };

              usePortfolioStore.getState().updatePortfolio(positions);
              usePortfolioStore.getState().setCash(portfolio.cash - totalCost);

              return {
                orderExecutionState: {
                  ...currentState.orderExecutionState,
                  lastExecutionTime: Date.now(),
                  isExecuting: false,
                },
              };
            });
          }

          return result;
        } finally {
          // Ensure execution state is reset
          set((currentState) => ({
            orderExecutionState: {
              ...currentState.orderExecutionState,
              isExecuting: false,
            },
          }));
        }
      },
    }),
    {
      name: 'order-execution-storage',
    }
  )
);