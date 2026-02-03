import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Portfolio, Position, Order, AIStatus, Theme as AppTheme, Signal as AIAnalysis, OHLCV as MarketData } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { AI_TRADING } from '../lib/constants';
import { kellyCalculator } from '../lib/risk/KellyCalculator';
import { PositionSizeRecommendation } from '../types/risk';
import { getRiskManagementService } from '../lib/services/RiskManagementService';

// Helper function to check if order side is a buy/long position
function isBuyOrLong(side: Order['side'] | 'LONG' | 'SHORT'): boolean {
  return side === 'BUY' || side === 'LONG';
}

// Helper function to convert order side to position side
function orderSideToPositionSide(side: Order['side']): 'LONG' | 'SHORT' {
  return isBuyOrLong(side) ? 'LONG' : 'SHORT';
}

// Define stock data update interface
interface StockDataUpdate {
  symbol: string;
  price?: number;
  change?: number;
  volume?: number;
  [key: string]: unknown;
}

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
  executeOrder: (order: OrderRequest) => OrderResult;
  /** @deprecated Use executeOrder instead */
  executeOrderAtomicV2: (order: OrderRequest) => OrderResult;

  // Kelly Criterion Position Sizing
  calculatePositionSize: (symbol: string, signal?: AIAnalysis) => PositionSizeRecommendation | null;
  getPortfolioStats: () => { winRate: number; avgWin: number; avgLoss: number; totalTrades: number };

  // Deprecated but potentially used fields
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;

  // Connection Status (Mock for now)
  isConnected: boolean;
  toggleConnection: () => void;

  // Market Data (Mock for compatibility)
  batchUpdateStockData: (data: StockDataUpdate[]) => void;
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
      executeOrder: (order: OrderRequest): OrderResult => {
        let result: OrderResult = { success: false };
        
        // Get current portfolio state
        const portfolio = get().portfolio;
        
        // ============================================================================
        // CRITICAL: Automated Risk Management System
        // ============================================================================
        
        // Initialize risk management service
        const riskService = getRiskManagementService();
        
        // Validate order against all risk management rules
        const riskValidation = riskService.validateOrder(order, portfolio);
        
        // If order is not allowed, return error with detailed reasons
        if (!riskValidation.allowed) {
          const criticalViolations = riskValidation.violations
            .filter(v => v.severity === 'critical')
            .map(v => v.message)
            .join('; ');
          
          return {
            success: false,
            error: `Risk Management: ${criticalViolations || riskValidation.reasons.join('; ')}`,
          };
        }
        
        // Apply risk management adjustments to order
        if (riskValidation.adjustedQuantity && riskValidation.adjustedQuantity !== order.quantity) {
          console.log(`[Risk Management] Position size adjusted: ${order.quantity} → ${riskValidation.adjustedQuantity}`);
          order.quantity = riskValidation.adjustedQuantity;
        }
        
        if (riskValidation.stopLossPrice && !order.stopLoss) {
          console.log(`[Risk Management] Auto stop loss: ${riskValidation.stopLossPrice}`);
          order.stopLoss = riskValidation.stopLossPrice;
        }
        
        if (riskValidation.takeProfitPrice && !order.takeProfit) {
          console.log(`[Risk Management] Auto take profit: ${riskValidation.takeProfitPrice}`);
          order.takeProfit = riskValidation.takeProfitPrice;
        }
        
        // Log risk management actions
        if (riskValidation.reasons.length > 0) {
          console.log('[Risk Management] Applied adjustments:', riskValidation.reasons);
        }
        
        if (riskValidation.violations.length > 0) {
          const warnings = riskValidation.violations
            .filter(v => v.severity !== 'critical')
            .map(v => v.message);
          if (warnings.length > 0) {
            console.warn('[Risk Management] Warnings:', warnings);
          }
        }
        
        // ============================================================================
        // Order Execution (after risk validation)
        // ============================================================================
        
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

      /**
       * Legacy alias for executeOrder
       * @deprecated
       */
      executeOrderAtomicV2: (order: OrderRequest): OrderResult => {
        return get().executeOrder(order);
      },

      /**
       * Calculate optimal position size using Kelly Criterion
       * Based on portfolio statistics and current signal
       */
      calculatePositionSize: (symbol: string, signal?: AIAnalysis): PositionSizeRecommendation | null => {
        const state = get();
        const stats = get().getPortfolioStats();
        
        // 最低限のトレード履歴が必要
        if (stats.totalTrades < 10) {
          return null;
        }

        const portfolioValue = state.portfolio.cash + state.portfolio.totalValue;
        
        // Kelly計算用のパラメータを構築
        const kellyParams = {
          winRate: stats.winRate,
          avgWin: stats.avgWin,
          avgLoss: stats.avgLoss,
          portfolioValue,
        };

        // 現在のポジション情報を収集
        const currentPositions = state.portfolio.positions.map(p => ({
          symbol: p.symbol,
          value: p.currentPrice * p.quantity,
        }));

        // ATR情報を取得（シグナルから）
        const atr = signal?.atr;

        // Kelly推奨を計算
        const recommendation = kellyCalculator.getRecommendation(
          kellyParams,
          symbol,
          atr,
          currentPositions
        );

        return recommendation;
      },

      /**
       * Get portfolio trading statistics for Kelly calculation
       */
      getPortfolioStats: () => {
        const state = get();
        const orders = state.portfolio.orders;
        
        // FILLEDオーダーのみを集計
        const filledOrders = orders.filter(o => o.status === 'FILLED');
        
        if (filledOrders.length === 0) {
          return {
            winRate: 0.5, // デフォルト50%
            avgWin: 0,
            avgLoss: 0,
            totalTrades: 0,
          };
        }

        // 損益を計算（簡略版 - 実装では実際のP&Lを使用）
        // 同じシンボルのBUY/SELL ペアを探してP&Lを計算
        const trades: { profit: number }[] = [];
        const symbolOrders: Record<string, Order[]> = {};
        
        // シンボル別にオーダーをグループ化
        filledOrders.forEach(order => {
          if (!symbolOrders[order.symbol]) {
            symbolOrders[order.symbol] = [];
          }
          symbolOrders[order.symbol].push(order);
        });

        // 各シンボルでトレードペアを作成
        Object.values(symbolOrders).forEach(orders => {
          const buys = orders.filter(o => o.side === 'BUY');
          const sells = orders.filter(o => o.side === 'SELL');
          
          // 簡略版: 各BUYに対して次のSELLでP&Lを計算
          // 実際にクローズされた数量を使用
          for (let i = 0; i < Math.min(buys.length, sells.length); i++) {
            const closedQuantity = Math.min(buys[i].quantity, sells[i].quantity);
            const profit = (sells[i].price - buys[i].price) * closedQuantity;
            trades.push({ profit });
          }
        });

        if (trades.length === 0) {
          return {
            winRate: 0.5,
            avgWin: 0,
            avgLoss: 0,
            totalTrades: 0,
          };
        }

        // 勝ちトレードと負けトレードを分離
        const winningTrades = trades.filter(t => t.profit > 0);
        const losingTrades = trades.filter(t => t.profit < 0);

        // デフォルト値（最小限のトレード履歴がある場合）
        const DEFAULT_AVG_WIN = 100; // デフォルト平均利益（単位: 通貨）
        const DEFAULT_AVG_LOSS = 50; // デフォルト平均損失（単位: 通貨）

        const winRate = winningTrades.length / trades.length;
        const avgWin = winningTrades.length > 0
          ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
          : DEFAULT_AVG_WIN;
        const avgLoss = losingTrades.length > 0
          ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length)
          : DEFAULT_AVG_LOSS;

        return {
          winRate,
          avgWin,
          avgLoss,
          totalTrades: trades.length,
        };
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
