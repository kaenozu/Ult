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
    dailyPnL += (p.change || 0) * p.quantity;
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

      executeOrder: (orderRequest) => {
        let result: OrderResult = { success: false };

        // --- 1. PRE-FLIGHT VALIDATION (Atomic Read) ---
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
          
          // Use adjusted values from risk management
          if (riskValidation.adjustedQuantity !== undefined) finalQuantity = riskValidation.adjustedQuantity;
          if (riskValidation.stopLossPrice !== undefined) finalStopLoss = riskValidation.stopLossPrice;
          if (riskValidation.takeProfitPrice !== undefined) finalTakeProfit = riskValidation.takeProfitPrice;
        }

        const totalCost = finalQuantity * orderRequest.price;
        if (orderRequest.side === 'LONG' && portfolio.cash < totalCost) {
          return { success: false, error: 'Insufficient Funds' };
        }

        // --- 2. ATOMIC STATE UPDATE (Single Transaction) ---
        set((state) => {
          // Double-check funds inside set to prevent race conditions
          if (orderRequest.side === 'LONG' && state.portfolio.cash < totalCost) return state;

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
            });
          }

          const newCash = orderRequest.side === 'LONG' ? state.portfolio.cash - totalCost : state.portfolio.cash + totalCost;
          const stats = calculatePortfolioStats(positions);

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
          };

          const newPos = positions[existingIdx >= 0 ? existingIdx : positions.length - 1];
          result = { 
            success: true, 
            orderId, 
            remainingCash: newCash,
            newPosition: { ...newPos }
          };

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
              const { portfolio: currentPortfolio } = get();
              psychologyService.analyze(currentPortfolio.orders, currentPortfolio.positions);
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
