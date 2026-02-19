import { create } from 'zustand';
import { devLog, devError } from '@/app/lib/utils/dev-logger';
import { persist } from 'zustand/middleware';
import { Portfolio, Position } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { getRiskManagementService } from '../lib/services/RiskManagementService';
import { AI_TRADING } from '@/app/constants';



interface PortfolioState {
  portfolio: Portfolio;
  aiStatus: 'active' | 'stopped';
  _isProcessingOrder: boolean;

  // Actions
  updatePortfolio: (positions: Position[]) => void;
  executeOrder: (order: OrderRequest) => OrderResult;
  closePosition: (symbol: string, exitPrice: number) => OrderResult;
  toggleAI: () => void;
  setCash: (amount: number) => void;
}

let orderLock = false;

/**
 * Calculate aggregate statistics for the portfolio based on current positions.
 */
function calculatePortfolioStats(positions: Position[]) {
  let totalValue = 0; // Sum of current market value of all positions
  let totalProfit = 0; // Cumulative unrealized profit/loss
  let dailyPnL = 0; // Profit/loss based on current day's change

  for (const p of positions) {
    const value = p.currentPrice * p.quantity;
    const pnl = p.side === 'LONG'
      ? (p.currentPrice - p.avgPrice) * p.quantity
      : (p.avgPrice - p.currentPrice) * p.quantity;

    totalValue += value;
    totalProfit += pnl;
    dailyPnL += (p.change || 0) * p.quantity;
  }

  return { totalValue, totalProfit, dailyPnL };
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => {
      /**
       * Internal helper to update portfolio and automatically recalculate stats.
       */
      const syncPortfolio = (updater: (state: PortfolioState) => Partial<Portfolio>) => {
        set((state) => {
          const updatedParts = updater(state);
          const newPositions = updatedParts.positions || state.portfolio.positions;
          const stats = calculatePortfolioStats(newPositions);

          return {
            portfolio: {
              ...state.portfolio,
              ...updatedParts,
              ...stats,
            }
          };
        });
      };

      return {
        portfolio: {
          positions: [],
          orders: [],
          totalValue: 0,
          totalProfit: 0,
          dailyPnL: 0,
          cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
        },
        aiStatus: 'active',
        _isProcessingOrder: false,

        updatePortfolio: (positions) => syncPortfolio(() => ({ positions })),

        executeOrder: (orderRequest) => {
          if (orderLock) {
            return { success: false, error: 'Order processing in progress. Please retry.' };
          }

          orderLock = true;
          try {
            let result: OrderResult = { success: false };
            const { portfolio } = get();

            let finalQuantity = orderRequest.quantity;
            let finalStopLoss = orderRequest.stopLoss;
            let finalTakeProfit = orderRequest.takeProfit;

            if (!orderRequest.skipRiskManagement) {
              const riskService = getRiskManagementService();
              const riskValidation = riskService.validateOrder(orderRequest, portfolio);

              if (!riskValidation.allowed) {
                return { success: false, error: `Risk Denied: ${riskValidation.reasons.join('; ')}` };
              }
              if (riskValidation.adjustedQuantity !== undefined) finalQuantity = riskValidation.adjustedQuantity;
              if (riskValidation.stopLossPrice !== undefined) finalStopLoss = riskValidation.stopLossPrice;
              if (riskValidation.takeProfitPrice !== undefined) finalTakeProfit = riskValidation.takeProfitPrice;
            }

            const totalCost = finalQuantity * orderRequest.price;
            if (orderRequest.side === 'LONG' && portfolio.cash < totalCost) {
              return { success: false, error: 'Insufficient Funds' };
            }

            // Atomic execution
            syncPortfolio((state) => {
              if (orderRequest.side === 'LONG' && state.portfolio.cash < totalCost) return {};

              const orderId = `at_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const existingIdx = state.portfolio.positions.findIndex(p => p.symbol === orderRequest.symbol && p.side === orderRequest.side);
              const positions = [...state.portfolio.positions];

              if (existingIdx >= 0) {
                const p = positions[existingIdx];
                positions[existingIdx] = {
                  ...p,
                  quantity: p.quantity + finalQuantity,
                  avgPrice: (p.avgPrice * p.quantity + orderRequest.price * finalQuantity) / (p.quantity + finalQuantity),
                  currentPrice: orderRequest.price,
                  stopLoss: finalStopLoss,
                  takeProfit: finalTakeProfit,
                  riskConfig: orderRequest.riskConfig,
                };
              } else {
                positions.push({
                  symbol: orderRequest.symbol,
                  name: orderRequest.name,
                  market: orderRequest.market,
                  side: orderRequest.side,
                  quantity: finalQuantity,
                  avgPrice: orderRequest.price,
                  currentPrice: orderRequest.price,
                  change: 0,
                  entryDate: new Date().toISOString(),
                  stopLoss: finalStopLoss,
                  takeProfit: finalTakeProfit,
                  riskConfig: orderRequest.riskConfig,
                });
              }

              const newCash = orderRequest.side === 'LONG' ? state.portfolio.cash - totalCost : state.portfolio.cash + totalCost;
              devLog('[portfolioStore] Executing Order:', {
                symbol: orderRequest.symbol,
                side: orderRequest.side,
                qty: finalQuantity,
                oldCash: state.portfolio.cash,
                newCash,
                totalCost
              });

              const newOrder = {
                id: orderId,
                symbol: orderRequest.symbol,
                side: (orderRequest.side === 'LONG' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
                type: orderRequest.orderType,
                quantity: finalQuantity,
                price: orderRequest.price,
                status: 'FILLED' as const,
                date: new Date().toISOString(),
                timestamp: Date.now(),
                stopLoss: finalStopLoss,
                takeProfit: finalTakeProfit,
              };

              const newPos = positions[existingIdx >= 0 ? existingIdx : positions.length - 1];
              result = { success: true, orderId, remainingCash: newCash, newPosition: { ...newPos } };

              return {
                cash: newCash,
                positions,
                orders: [...state.portfolio.orders, newOrder],
              };
            });

            if (result.success) {
              setTimeout(() => {
                import('../lib/services/PsychologyService').then(({ psychologyService }) => {
                  const { portfolio: currentPortfolio } = get();
                  psychologyService.analyze(currentPortfolio.orders, currentPortfolio.positions);
                }).catch((err) => {
                  devError('[portfolioStore] PsychologyService analysis failed:', err);
                });
              }, 10);
            }

            return result;
          } finally {
            orderLock = false;
          }
        },

        closePosition: (symbol, exitPrice) => {
          if (orderLock) {
            return { success: false, error: 'Order processing in progress. Please retry.' };
          }

          orderLock = true;
          try {
            let result: OrderResult = { success: false };
            syncPortfolio((state) => {
              const idx = state.portfolio.positions.findIndex(p => p.symbol === symbol);
              if (idx < 0) return {};

              const p = state.portfolio.positions[idx];
              const profit = p.side === 'LONG' ? (exitPrice - p.avgPrice) * p.quantity : (p.avgPrice - exitPrice) * p.quantity;
              const newPositions = state.portfolio.positions.filter(pos => pos.symbol !== symbol);
              const newCash = state.portfolio.cash + (p.avgPrice * p.quantity) + profit; // Return initial capital + profit

              // Save to History (IndexedDB)
              // We do this asynchronously to not block the UI update
              import('../lib/storage/IndexedDBService').then(({ indexedDBService }) => {
                const closedTrade = {
                  id: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  symbol: p.symbol,
                  side: p.side === 'LONG' ? 'SELL' : 'BUY', // Closing side
                  type: 'MARKET',
                  quantity: p.quantity,
                  price: exitPrice,
                  status: 'FILLED',
                  date: new Date().toISOString(),
                  timestamp: Date.now(),
                  pnl: profit, // Add PnL for history
                  entryPrice: p.avgPrice,
                  exitPrice: exitPrice,
                };
                // Note: The type mismatch might occur if StoredTrade expects different fields
                // Ensure we interact correctly with the service
                indexedDBService.saveTrade(closedTrade as any).catch(err =>
                  devError('[portfolioStore] Failed to save trade to history:', err)
                );
              });

              result = { success: true, remainingCash: newCash };
              return {
                positions: newPositions,
                cash: newCash,
              };
            });
            return result;
          } finally {
            orderLock = false;
          }
        },

        toggleAI: () => set((state) => ({ aiStatus: state.aiStatus === 'active' ? 'stopped' : 'active' })),
        setCash: (amount) => syncPortfolio(() => ({ cash: amount })),
      };
    },
    {
      name: 'trader-pro-portfolio-storage',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(name, JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(name);
          }
        },
      },
      skipHydration: true, // Handle hydration manually to prevent mismatches
    }
  )
);