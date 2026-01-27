import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position, Portfolio, JournalEntry } from '../types';
import { AI_TRADING } from '@/app/lib/constants';

interface PortfolioState {
    portfolio: Portfolio;
    journal: JournalEntry[];
    updatePortfolio: (positions: Position[]) => void;
    addPosition: (position: Position) => void;
    closePosition: (symbol: string, exitPrice: number) => void;
    setCash: (amount: number) => void;
    addJournalEntry: (entry: JournalEntry) => void;
    updatePositionPrices: (updates: { symbol: string, price: number, change: number }[]) => void;
}

const initialPortfolio: Portfolio = {
    positions: [],
    orders: [],
    totalValue: 0,
    totalProfit: 0,
    dailyPnL: 0,
    cash: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
};

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set, get) => ({
            portfolio: initialPortfolio,
            journal: [],

            updatePortfolio: (positions) => set((state) => {
                const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
                const totalProfit = positions.reduce((sum, p) => {
                    const pnl = p.side === 'LONG'
                        ? (p.currentPrice - p.avgPrice) * p.quantity
                        : (p.avgPrice - p.currentPrice) * p.quantity;
                    return sum + pnl;
                }, 0);
                const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);
                return {
                    portfolio: {
                        ...state.portfolio,
                        positions,
                        totalValue,
                        totalProfit,
                        dailyPnL,
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

                const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
                const totalProfit = positions.reduce((sum, p) => {
                    const pnl = p.side === 'LONG'
                        ? (p.currentPrice - p.avgPrice) * p.quantity
                        : (p.avgPrice - p.currentPrice) * p.quantity;
                    return sum + pnl;
                }, 0);
                const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

                return {
                    portfolio: {
                        ...state.portfolio,
                        positions,
                        totalValue,
                        totalProfit,
                        dailyPnL,
                        cash: state.portfolio.cash - (newPosition.avgPrice * newPosition.quantity),
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
                    date: position.entryDate || new Date().toISOString(),
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
                const totalValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
                const totalProfit = positions.reduce((sum, p) => {
                    const pnl = p.side === 'LONG'
                        ? (p.currentPrice - p.avgPrice) * p.quantity
                        : (p.avgPrice - p.currentPrice) * p.quantity;
                    return sum + pnl;
                }, 0);
                const dailyPnL = positions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

                return {
                    portfolio: {
                        ...state.portfolio,
                        positions,
                        totalValue,
                        totalProfit,
                        dailyPnL,
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

            addJournalEntry: (entry) => set((state) => ({
                journal: [...state.journal, entry],
            })),

            updatePositionPrices: (updates) => set((state) => {
                const updateMap = new Map(updates.map(u => [u.symbol, u]));
                const newPositions = state.portfolio.positions.map(p => {
                    const update = updateMap.get(p.symbol);
                    return update ? { ...p, currentPrice: update.price, change: update.change } : p;
                });

                const totalValue = newPositions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
                const totalProfit = newPositions.reduce((sum, p) => {
                    const pnl = p.side === 'LONG'
                        ? (p.currentPrice - p.avgPrice) * p.quantity
                        : (p.avgPrice - p.currentPrice) * p.quantity;
                    return sum + pnl;
                }, 0);
                const dailyPnL = newPositions.reduce((sum, p) => sum + (p.change * p.quantity), 0);

                return {
                    portfolio: {
                        ...state.portfolio,
                        positions: newPositions,
                        totalValue,
                        totalProfit,
                        dailyPnL,
                    }
                };
            }),
        }),
        {
            name: 'trading-platform-portfolio',
        }
    )
);
