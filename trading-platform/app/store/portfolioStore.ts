import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Portfolio, Position, Order } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { getRiskManagementService } from '../lib/services/RiskManagementService';
import { AI_TRADING } from '../lib/constants';
import { useJournalStore } from './index';

interface PortfolioState {
  portfolio: Portfolio;
  aiStatus: 'active' | 'stopped';

  // Actions
  updatePortfolio: (positions: Position[]) => void;
  executeOrder: (order: OrderRequest) => OrderResult;
  closePosition: (symbol: string, exitPrice: number) => OrderResult;
  toggleAI: () => void;
  setCash: (amount: number) => void;
}

function calculatePortfolioStats(positions: Position[]) {
  let totalValue = 0;
  let totalProfit = 0;
  let dailyPnL = 0;

  for (const p of positions) {
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

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
      },
      aiStatus: 'active',

      updatePortfolio: (positions) => set((state) => ({
        portfolio: { ...state.portfolio, positions, ...calculatePortfolioStats(positions) }
      })),

      executeOrder: (order) => {
        let result: OrderResult = { success: false };

        // --- 1. PRE-FLIGHT VALIDATION (Atomic Read) ---
        const { portfolio } = get();
        const riskService = getRiskManagementService();
        const riskValidation = riskService.validateOrder(order, portfolio);

        if (!riskValidation.allowed) {
          return { success: false, error: `Risk Denied: ${riskValidation.reasons.join('; ')}` };
        }

        const totalCost = order.quantity * order.price;
        if (order.side === 'LONG' && portfolio.cash < totalCost) {
          return { success: false, error: 'Insufficient Funds' };
        }

        // --- 2. ATOMIC STATE UPDATE (Single Transaction) ---
        set((state) => {
          // Double-check funds inside set to prevent race conditions
          if (order.side === 'LONG' && state.portfolio.cash < totalCost) return state;

          const orderId = `at_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const existingIdx = state.portfolio.positions.findIndex(p => p.symbol === order.symbol && p.side === order.side);
          const positions = [...state.portfolio.positions];

          if (existingIdx >= 0) {
            const p = positions[existingIdx];
            positions[existingIdx] = {
              ...p,
              quantity: p.quantity + order.quantity,
              avgPrice: (p.avgPrice * p.quantity + order.price * order.quantity) / (p.quantity + order.quantity),
              currentPrice: order.price,
            };
          } else {
            positions.push({
              symbol: order.symbol,
              name: order.name,
              market: order.market,
              side: order.side,
              quantity: order.quantity,
              avgPrice: order.price,
              currentPrice: order.price,
              change: 0,
              entryDate: new Date().toISOString(),
            });
          }

          const newCash = order.side === 'LONG' ? state.portfolio.cash - totalCost : state.portfolio.cash + totalCost;
          const stats = calculatePortfolioStats(positions);

          const newOrder = {
            id: orderId,
            symbol: order.symbol,
            side: (order.side === 'LONG' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
            type: order.orderType,
            quantity: order.quantity,
            price: order.price,
            status: 'FILLED' as const,
            date: new Date().toISOString(),
            timestamp: Date.now(),
          };

          result = { success: true, orderId, remainingCash: newCash };

          return {
            portfolio: {
              ...state.portfolio,
              cash: newCash,
              positions,
              orders: [...state.portfolio.orders, newOrder],
              ...stats,
            }
          };
        });

        // --- 3. POST-EXECUTION HOOKS (Non-blocking) ---
        if (result.success) {
          setTimeout(() => {
            // Add journal entry for the executed order
            const journalEntry = {
              id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              symbol: order.symbol,
              date: new Date().toISOString(),
              signalType: order.side === 'LONG' ? 'BUY' : 'SELL',
              entryPrice: order.price,
              quantity: order.quantity,
              status: 'OPEN' as const,
              notes: `Order executed: ${order.side === 'LONG' ? 'BUY' : 'SELL'} ${order.quantity} ${order.symbol} at ${order.price}`,
            };
            useJournalStore.getState().addJournalEntry(journalEntry);

            // Trigger psychology analysis and sync with backend
            import('../lib/services/PsychologyService').then(({ psychologyService }) => {
              const { portfolio } = get();
              psychologyService.analyze(portfolio.orders, portfolio.positions);
            });
          }, 10);
        }

        return result;
      },

      closePosition: (symbol, exitPrice) => {
        let result: OrderResult = { success: false };
        let closedPosition: Position | null = null;
        set((state) => {
          const idx = state.portfolio.positions.findIndex(p => p.symbol === symbol);
          if (idx < 0) return state;

          const p = state.portfolio.positions[idx];
          const profit = p.side === 'LONG' ? (exitPrice - p.avgPrice) * p.quantity : (p.avgPrice - exitPrice) * p.quantity;
          const newPositions = state.portfolio.positions.filter(pos => pos.symbol !== symbol);
          const newCash = state.portfolio.cash + (p.avgPrice * p.quantity) + profit;

          closedPosition = { ...p, exitPrice, profit, change: (exitPrice - p.avgPrice) / p.avgPrice };
          result = { success: true, remainingCash: newCash };
          return {
            portfolio: {
              ...state.portfolio,
              positions: newPositions,
              cash: newCash,
              ...calculatePortfolioStats(newPositions),
            }
          };
        });

        // Post-execution: Update journal entry
        if (result.success && closedPosition) {
          setTimeout(() => {
            const journal = useJournalStore.getState().journal;
            // Find existing OPEN entry for this symbol and side
            const existingEntry = journal.find(
              e => e.symbol === symbol && e.status === 'OPEN' && e.signalType === (closedPosition!.side === 'LONG' ? 'BUY' : 'SELL')
            );
            if (existingEntry) {
              const profitPercent = (closedPosition!.profit! / (closedPosition!.avgPrice * closedPosition!.quantity)) * 100;
              useJournalStore.getState().updateJournalEntry(existingEntry.id, {
                exitPrice: closedPosition!.exitPrice,
                profit: closedPosition!.profit,
                profitPercent,
                status: 'CLOSED',
                notes: `Position closed at ${closedPosition!.exitPrice}. P&L: ${closedPosition!.profit?.toFixed(2)}`,
              });
            } else {
              // Create new CLOSED entry if OPEN not found
              const newEntry = {
                id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                symbol: closedPosition!.symbol,
                date: new Date().toISOString(),
                signalType: closedPosition!.side === 'LONG' ? 'BUY' : 'SELL',
                entryPrice: closedPosition!.avgPrice,
                exitPrice: closedPosition!.exitPrice,
                quantity: closedPosition!.quantity,
                profit: closedPosition!.profit,
                profitPercent: (closedPosition!.profit! / (closedPosition!.avgPrice * closedPosition!.quantity)) * 100,
                status: 'CLOSED' as const,
                notes: `Position closed. P&L: ${closedPosition!.profit?.toFixed(2)}`,
              };
              useJournalStore.getState().addJournalEntry(newEntry);
            }
          }, 10);
        }

        return result;
      },

      toggleAI: () => set((state) => ({ aiStatus: state.aiStatus === 'active' ? 'stopped' : 'active' })),
      setCash: (amount) => set((state) => ({ portfolio: { ...state.portfolio, cash: amount } })),
    }),
    {
      name: 'trader-pro-portfolio-storage',
    }
  )
);