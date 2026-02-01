import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Portfolio, Position, Order, AIStatus, Theme as AppTheme, Signal as AIAnalysis, OHLCV as MarketData } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { AI_TRADING } from '../lib/constants';

// Define the comprehensive state interface used by legacy components
interface TradingStore {
  // Theme
  theme: AppTheme;
  toggleTheme: () => void;

  // Watchlist
  watchlist: Stock[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Portfolio
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => OrderResult;
  setCash: (amount: number) => void;

  // AI & Analysis
  aiStatus: 'active' | 'stopped';
  toggleAI: () => void;

  // Order Execution
  executeOrder: (symbol: string, side: 'LONG' | 'SHORT', quantity: number, price: number) => Promise<boolean>;
  executeOrderAtomic: (order: Order) => void;
  executeOrderAtomicV2: (order: OrderRequest) => OrderResult;

  // Deprecated but potentially used fields
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;

  // Connection Status (Mock for now)
  isConnected: boolean;
  toggleConnection: () => void;

  // Market Data (Mock for compatibility)
  batchUpdateStockData: (data: Stock[]) => void;
}

// Helper for portfolio stats with caching
interface PortfolioState {
  positions: Position[];
  orders: Order[];
  totalValue: number;
  totalProfit: number;
  dailyPnL: number;
  cash: number;
}

function calculatePortfolioStats(positions: Position[]) {
  let totalValue = 0;
  let totalProfit = 0;
  let dailyPnL = 0;

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const value = p.currentPrice * p.quantity;
    const pnl = p.side === 'LONG'
      ? (p.currentPrice - p.avgPrice) * p.quantity
      : (p.avgPrice - p.currentPrice) * p.quantity;

    totalValue += value;
    totalProfit += pnl;
    dailyPnL += p.change * p.quantity;
  }
  
  return { totalValue, totalProfit, dailyPnL };
}

// Incremental update helper for portfolio stats
function updatePortfolioStatsIncremental(
  currentStats: { totalValue: number; totalProfit: number; dailyPnL: number },
  changedPosition: Position,
  previousPosition?: Position
): { totalValue: number; totalProfit: number; dailyPnL: number } {
  if (previousPosition) {
    // Calculate delta for changed position
    const valueDelta = changedPosition.currentPrice * changedPosition.quantity - 
                      previousPosition.currentPrice * previousPosition.quantity;
    const profitDelta = (changedPosition.side === 'LONG'
      ? (changedPosition.currentPrice - changedPosition.avgPrice) * changedPosition.quantity
      : (changedPosition.avgPrice - changedPosition.currentPrice) * changedPosition.quantity
    ) - (previousPosition.side === 'LONG'
      ? (previousPosition.currentPrice - previousPosition.avgPrice) * previousPosition.quantity
      : (previousPosition.avgPrice - previousPosition.currentPrice) * previousPosition.quantity
    );
    const pnlDelta = (changedPosition.change * changedPosition.quantity) - 
                     (previousPosition.change * previousPosition.quantity);
    
    return {
      totalValue: currentStats.totalValue + valueDelta,
      totalProfit: currentStats.totalProfit + profitDelta,
      dailyPnL: currentStats.dailyPnL + pnlDelta
    };
  } else {
    // Add new position
    const value = changedPosition.currentPrice * changedPosition.quantity;
    const profit = changedPosition.side === 'LONG'
      ? (changedPosition.currentPrice - changedPosition.avgPrice) * changedPosition.quantity
      : (changedPosition.avgPrice - changedPosition.currentPrice) * changedPosition.quantity;
    const pnl = changedPosition.change * changedPosition.quantity;
    
    return {
      totalValue: currentStats.totalValue + value,
      totalProfit: currentStats.totalProfit + profit,
      dailyPnL: currentStats.dailyPnL + pnl
    };
  }
}

export const useTradingStore = create<TradingStore>()(
  persist(
    (set, get) => ({
      // Theme Defaults
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Watchlist Defaults
      watchlist: [],
      addToWatchlist: (stock) => set((state) => {
        if (state.watchlist.some((s) => s.symbol === stock.symbol)) return state;
        return { watchlist: [...state.watchlist, stock] };
      }),
      removeFromWatchlist: (symbol) => set((state) => ({
        watchlist: state.watchlist.filter((s) => s.symbol !== symbol),
      })),

      // Portfolio Defaults
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
      },
      updatePortfolio: (positions) => set((state) => {
        const stats = calculatePortfolioStats(positions);
        return {
          portfolio: { ...state.portfolio, positions, ...stats }
        };
      }),
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
          portfolio: { ...state.portfolio, positions, ...stats }
        };
      }),
      closePosition: (symbol, exitPrice) => {
        let result: OrderResult = { success: false };
        
        set((state) => {
          const position = state.portfolio.positions.find(p => p.symbol === symbol);
          if (!position) {
            result = { success: false, error: 'Position not found' };
            return state;
          }

          const profit = position.side === 'LONG'
            ? (exitPrice - position.avgPrice) * position.quantity
            : (position.avgPrice - exitPrice) * position.quantity;

          const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
          const stats = calculatePortfolioStats(positions);
          const newCash = state.portfolio.cash + (position.avgPrice * position.quantity) + profit;

          result = {
            success: true,
            remainingCash: newCash,
          };

          return {
            portfolio: {
              ...state.portfolio,
              positions,
              ...stats,
              cash: newCash,
            },
          };
        });
        
        return result;
      },
      setCash: (amount) => set((state) => ({
        portfolio: { ...state.portfolio, cash: amount },
      })),

      // AI Status
      aiStatus: 'active',
      toggleAI: () => set((state) => ({
        aiStatus: state.aiStatus === 'active' ? 'stopped' : 'active'
      })),

      // Order Execution
      executeOrder: async (symbol, side, quantity, price) => {
        const order: Order = {
          id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          side: side === 'LONG' ? 'BUY' : 'SELL',
          type: 'MARKET',
          quantity,
          price,
          status: 'FILLED',
          date: new Date().toISOString(),
          timestamp: Date.now()
        };

        get().executeOrderAtomic(order);
        return true;
      },

       executeOrderAtomic: (order) => set((state) => {
         const { portfolio } = state;
         
         // Critical validation: Reject invalid prices
         if (!order.price || order.price <= 0 || !Number.isFinite(order.price)) {
           console.error('Invalid order price:', order.price);
           return state;
         }
         
         const price = order.price;
         const orderCost = price * order.quantity;

         // Determine position side based on order side
         const isLongPosition = order.side === 'BUY' || order.side === 'LONG';

         // Basic validation
         if (isLongPosition && portfolio.cash < orderCost) {
           return state; // Insufficient funds
         }

         // Update cash
         let newCash = portfolio.cash;
         if (isLongPosition) {
           newCash -= orderCost;
         } else {
           // Short selling logic often requires margin, keeping simple here
           newCash += orderCost;
         }

         // Add position
         const newPosition: Position = {
           symbol: order.symbol,
           name: order.symbol,
           side: isLongPosition ? 'LONG' : 'SHORT',
           quantity: order.quantity,
           avgPrice: price,
           currentPrice: price,
           change: 0,
           // profit: 0,
           // profitPercent: 0,
           market: 'japan', // Default
           // sector: 'Unknown',
           // volume: 0,
           entryDate: new Date().toISOString(),
         };

         // Reuse addPosition logic inside
         const positions = [...portfolio.positions];
         const existingIndex = positions.findIndex(p => p.symbol === newPosition.symbol && p.side === newPosition.side);

         if (existingIndex >= 0) {
           const existing = positions[existingIndex];
           const totalCost = (existing.avgPrice * existing.quantity) + (newPosition.avgPrice * newPosition.quantity);
           const totalQty = existing.quantity + newPosition.quantity;
           
           // Protect against division by zero
           if (totalQty <= 0) {
             console.error('Invalid total quantity:', totalQty);
             return state;
           }
           
           positions[existingIndex] = {
             ...existing,
             quantity: totalQty,
             avgPrice: totalCost / totalQty,
             currentPrice: newPosition.currentPrice
           };
         } else {
           positions.push(newPosition);
         }

         const stats = calculatePortfolioStats(positions);

         return {
           portfolio: {
             ...portfolio,
             positions,
             cash: newCash,
             orders: [...portfolio.orders, order],
             ...stats
           }
         };
       }),

      /**
       * アトミックな注文実行（OrderRequestを使用）
       * 残高確認、ポジション追加、現金減算を単一のトランザクションで実行
       * @param order 注文リクエスト
       * @returns 注文結果
       */
      executeOrderAtomicV2: (order: OrderRequest): OrderResult => {
        let result: OrderResult = { success: false };
        
        set((state) => {
          const { portfolio } = state;
          const totalCost = order.quantity * order.price;
          
          // 1. バリデーション（読み取り）
          if (order.side === 'LONG' && portfolio.cash < totalCost) {
            result = { 
              success: false, 
              error: `Insufficient funds. Required: ${totalCost}, Available: ${portfolio.cash}` 
            };
            return state;
          }

          // 2. 既存ポジションチェック
          const existingPosition = portfolio.positions.find(p => p.symbol === order.symbol && p.side === order.side);
          
          // 3. 新しいポジション作成
          const newPosition: Position = existingPosition
            ? {
                ...existingPosition,
                quantity: existingPosition.quantity + order.quantity,
                avgPrice: (existingPosition.avgPrice * existingPosition.quantity + order.price * order.quantity) 
                         / (existingPosition.quantity + order.quantity),
                currentPrice: order.price,
              }
            : {
                symbol: order.symbol,
                name: order.name,
                market: order.market,
                side: order.side,
                quantity: order.quantity,
                avgPrice: order.price,
                currentPrice: order.price,
                change: 0,
                entryDate: new Date().toISOString(),
              };

          // 4. アトミックな状態更新（単一のset）
          const newCash = order.side === 'LONG' 
            ? portfolio.cash - totalCost 
            : portfolio.cash + totalCost;
          
          const positions = existingPosition
            ? portfolio.positions.map(p => 
                p.symbol === order.symbol && p.side === order.side ? newPosition : p
              )
            : [...portfolio.positions, newPosition];
          
          const stats = calculatePortfolioStats(positions);
          
          result = {
            success: true,
            orderId: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            remainingCash: newCash,
            newPosition,
          };

          return {
            portfolio: {
              ...portfolio,
              cash: newCash,
              positions,
              orders: [
                ...portfolio.orders,
                {
                  id: result.orderId!,
                  symbol: order.symbol,
                  side: order.side === 'LONG' ? 'BUY' : 'SELL',
                  type: order.orderType,
                  quantity: order.quantity,
                  price: order.price,
                  status: 'FILLED',
                  date: new Date().toISOString(),
                  timestamp: Date.now(),
                }
              ],
              ...stats,
            },
          };
        });

        return result;
      },

      selectedStock: null,
      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),

      batchUpdateStockData: () => { /* Mock implementation */ },
    }),
    {
      name: 'trading-platform-storage-legacy',
    }
  )
);
