import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIStatus, Signal } from '../types';
import { AI_TRADING } from '@/app/lib/constants';
import { aiTradeService } from '@/app/lib/AITradeService';

interface AIState {
    aiStatus: AIStatus;
    processAITrades: (symbol: string, currentPrice: number, signal: Signal | null) => void;
}

const initialAIStatus: AIStatus = {
    virtualBalance: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
    totalProfit: 0,
    trades: [],
};

export const useAIStore = create<AIState>()(
    persist(
        (set, get) => ({
            aiStatus: initialAIStatus,

            processAITrades: (symbol, currentPrice, signal) => {
                const result = aiTradeService.processTrades(symbol, currentPrice, signal, get().aiStatus);
                if (result) {
                    set({ aiStatus: result.newStatus });
                }
            },
        }),
        {
            name: 'trading-platform-ai',
        }
    )
);
