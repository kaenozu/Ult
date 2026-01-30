import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Position, Portfolio, JournalEntry, Theme, AIStatus, Signal, PaperTrade, Order } from '../types';
import { AI_TRADING, POSITION_SIZING, MARKET_CORRELATION } from '@/app/lib/constants';
import { aiTradeService } from '@/app/lib/AITradeService';

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

export interface TradingStore {
  theme: Theme;
  toggleTheme: () => void;
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateStockData: (symbol: string, data: Partial<Stock>) => void;
  batchUpdateStockData: (updates: { symbol: string, data: Partial<Stock> }[]) => void;
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  /**
   * @deprecated Use executeOrderAtomic instead for proper atomic execution with error handling
   */
  executeOrder: (order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' }) => void;
  /**
   * Atomically execute an order with proper consistency checks and error handling.
   * This is the recommended method for order execution.
   */
  executeOrderAtomic: (order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' }, options?: OrderExecutionOptions) => OrderExecutionResult;
  closePosition: (symbol: string, exitPrice: number) => void;
  setCash: (amount: number) => void;
  journal: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  toggleConnection: () => void;
  aiStatus: AIStatus;
  processAITrades: (symbol: string, currentPrice: number, signal: Signal | null) => void;
  // Order execution state
  orderExecutionState: OrderExecutionState;
}

const initialPortfolio: Portfolio = {
  positions: [],
  orders: [],
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
};

const initialAIStatus: AIStatus = {
  virtualBalance: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
  totalProfit: 0,
  trades: [],
};

function calculatePortfolioStats(positions: Position[]) {
  const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalProfit = positions.reduce((sum, p) => {
    const pnl = p.side === 'LONG'
      ? (p.currentPrice - p.avgPrice) * p.quantity
      : (p.avgPrice - p.currentPrice) * p.quantity;
    return sum + pnl;
  }, 0);
  const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
  return { totalValue, totalProfit, dailyPnL };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Atomic Order Execution Implementation
// ============================================================================

/**
 * Validates an order before execution.
 * Performs all consistency checks without modifying state.
 */
function validateOrder(
  state: TradingStore,
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
  const timeSinceLastExecution = now - state.orderExecutionState.lastExecutionTime;
  if (timeSinceLastExecution < 50) { // 50ms debounce
    return { valid: false, error: 'CONCURRENT_EXECUTION', message: 'Order execution too frequent' };
  }

  // Check balance for LONG orders (unless skipBalanceCheck is true)
  if (!options.skipBalanceCheck && order.side === 'LONG') {
    const totalCost = order.quantity * order.price;
    if (state.portfolio.cash < totalCost) {
      return { valid: false, error: 'INSUFFICIENT_FUNDS', message: `Insufficient funds. Required: ${totalCost}, Available: ${state.portfolio.cash}` };
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
  state: TradingStore,
  order: { symbol: string; name: string; market: 'japan' | 'usa'; side: 'LONG' | 'SHORT'; quantity: number; price: number; type: 'MARKET' | 'LIMIT' },
  options: OrderExecutionOptions
): OrderExecutionResult {
  // Step 1: Validate the order
  const validation = validateOrder(state, order, options);
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

/**
 * tradingStore.ts - Master Store
 * 全てのアプリケーション状態のソース・オブ・トゥルースです。
 * 分割された各ストア・ファイル（watchlistStore.ts 等）はこのストアのファサードとして機能します。
 */
export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      watchlist: [],

      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.find(s => s.symbol === stock.symbol)) {
          return state;
        }
        return { watchlist: [...state.watchlist, stock] };
      }),

      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter(s => s.symbol !== symbol),
      })),

      updateStockData: (symbol, data) => set((state) => {
        const newWatchlist = state.watchlist.map(s =>
          s.symbol === symbol ? { ...s, ...data } : s
        );

        const newPositions = state.portfolio.positions.map(p =>
          p.symbol === symbol ? {
            ...p,
            currentPrice: data.price ?? p.currentPrice,
            change: data.change ?? p.change
          } : p
        );

        const stats = calculatePortfolioStats(newPositions);

        return {
          watchlist: newWatchlist,
          portfolio: {
            ...state.portfolio,
            positions: newPositions,
            ...stats
          }
        };
      }),

      batchUpdateStockData: (updates) => set((state) => {
        const updateMap = new Map(updates.map(u => [u.symbol, u.data]));
        const newPositions = state.portfolio.positions.map(p => {
          const update = updateMap.get(p.symbol);
          return update && update.price ? { ...p, currentPrice: update.price } : p;
        });

        // Recalculate stats since prices might have changed
        const stats = calculatePortfolioStats(newPositions);

        return {
          watchlist: state.watchlist.map(s => {
            const update = updateMap.get(s.symbol);
            return update ? { ...s, ...update } : s;
          }),
          portfolio: {
            ...state.portfolio,
            positions: newPositions,
            ...stats
          }
        };
      }),

      portfolio: initialPortfolio,

      updatePortfolio: (positions) => set((state) => {
        const stats = calculatePortfolioStats(positions);
        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
          },
        };
      }),

      // ============================================================================
      // Order Execution State
      // ============================================================================
      orderExecutionState: initialOrderExecutionState,

      // ============================================================================
      // Legacy Order Execution (Non-atomic - DEPRECATED)
      // ============================================================================
      executeOrder: (order) => set((state) => {
        const totalCost = order.quantity * order.price;
        // Basic check, though OrderPanel handles UI disabled state
        if (order.side === 'LONG' && state.portfolio.cash < totalCost) {
            return state;
        }

        const positions = [...state.portfolio.positions];
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
        const stats = calculatePortfolioStats(positions);

        // Deduct cash for both BUY and SELL as per original logic (Short selling collateral/margin implied)
        const newCash = state.portfolio.cash - totalCost;

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
            cash: newCash,
          },
        };
      }),

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
        const validation = validateOrder(state, order, options);
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
          const result = executeOrderAtomicImpl(state, order, options);
          
          if (result.success && result.position) {
            // Apply state updates atomically
            set((currentState) => {
              const totalCost = order.quantity * order.price;
              const positions = [...currentState.portfolio.positions];
              
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
              const stats = calculatePortfolioStats(positions);

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

              return {
                portfolio: {
                  ...currentState.portfolio,
                  positions,
                  orders: [...currentState.portfolio.orders, newOrder],
                  ...stats,
                  cash: currentState.portfolio.cash - totalCost,
                },
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

      addPosition: (newPosition) => set((state) => {
        const positions = [...state.portfolio.positions];
        const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

        if (existingIndex >= 0) {
          const existing = positions[existingIndex];
          const totalCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
          const totalQty = existing.quantity + newPosition.quantity;

          positions[existingIndex] = {
            ...existing,
            quantity: totalQty,
            avgPrice: totalCost / totalQty,
            currentPrice: newPosition.currentPrice,
            change: newPosition.change
          };
        } else {
          positions.push(newPosition);
        }

        const stats = calculatePortfolioStats(positions);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
          },
        };
      }),

      closePosition: (symbol, exitPrice) => set((state) => {
        const position = state.portfolio.positions.find(p => p.symbol === symbol);
        if (!position) return state;

        const profit = position.side === 'LONG'
          ? (exitPrice - position.avgPrice) * position.quantity
          : (position.avgPrice - exitPrice) * position.quantity;

        const profitPercent = position.side === 'LONG'
          ? ((exitPrice - position.avgPrice) / position.avgPrice) * 100
          : ((position.avgPrice - exitPrice) / position.avgPrice) * 100;

        const entry: JournalEntry = {
          id: Date.now().toString(),
          symbol,
          date: position.entryDate,
          signalType: position.side === 'LONG' ? 'BUY' : 'SELL',
          entryPrice: position.avgPrice,
          exitPrice,
          quantity: position.quantity,
          profit,
          profitPercent,
          notes: '',
          status: 'CLOSED',
        };

        const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
        const stats = calculatePortfolioStats(positions);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
            cash: state.portfolio.cash + (position.avgPrice * position.quantity) + profit,
          },
          journal: [...state.journal, entry],
        };
      }),

      setCash: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          cash: amount,
        },
      })),

      journal: [],

      addJournalEntry: (entry) => set((state) => ({
        journal: [...state.journal, entry],
      })),

      selectedStock: null,

      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,

      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),

      aiStatus: initialAIStatus,

      processAITrades: (symbol, currentPrice, signal) => {
        const { aiStatus } = get();
        const { portfolio } = get();

        // AITradeService を使用して新しい状態を計算
        const result = aiTradeService.processTrades(symbol, currentPrice, signal, aiStatus);

        if (result) {
          set({ aiStatus: result.newStatus });
        }
      }
    }),
    {
      name: 'trading-platform-storage',
      partialize: (state) => ({
        theme: state.theme,
        watchlist: state.watchlist,
        journal: state.journal,
        portfolio: state.portfolio,
        aiStatus: state.aiStatus,
      }),
    }
  )
);
