import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Portfolio, Position, Order } from '../types';
import { OrderRequest, OrderResult } from '../types/order';
import { getRiskManagementService } from '../lib/services/RiskManagementService';
import { AI_TRADING } from '../lib/constants';

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
              market: order.market as any,
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
            side: order.side === 'LONG' ? 'BUY' : 'SELL' as any,
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
        set((state) => {
          const idx = state.portfolio.positions.findIndex(p => p.symbol === symbol);
          if (idx < 0) return state;

          const p = state.portfolio.positions[idx];
          const profit = p.side === 'LONG' ? (exitPrice - p.avgPrice) * p.quantity : (p.avgPrice - exitPrice) * p.quantity;
          const newPositions = state.portfolio.positions.filter(pos => pos.symbol !== symbol);
          const newCash = state.portfolio.cash + (p.avgPrice * p.quantity) + profit;
          
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