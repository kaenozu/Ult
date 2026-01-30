import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position, Portfolio, Order } from '../types';
import { AI_TRADING } from '@/app/lib/constants';

interface PortfolioStore {
  portfolio: Portfolio;
  updatePortfolio: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  closePosition: (symbol: string, exitPrice: number) => void;
  setCash: (amount: number) => void;
}

const initialPortfolio: Portfolio = {
  positions: [],
  orders: [],
  totalValue: 0,
  totalProfit: 0,
  dailyPnL: 0,
  cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
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

function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
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

        const positions = state.portfolio.positions.filter(p => p.symbol !== symbol);
        const stats = calculatePortfolioStats(positions);

        return {
          portfolio: {
            ...state.portfolio,
            positions,
            ...stats,
            cash: state.portfolio.cash + (position.avgPrice * position.quantity) + profit,
          },
        };
      }),

      setCash: (amount) => set((state) => ({
        portfolio: {
          ...state.portfolio,
          cash: amount,
        },
      })),
    }),
    {
      name: 'portfolio-storage',
    }
  )
);