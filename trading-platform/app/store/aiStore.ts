import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIStatus, Signal } from '../types';
import { AI_TRADING } from '@/app/lib/constants';
import { aiTradeService } from '@/app/lib/AITradeService';

interface AIStore {
  aiStatus: AIStatus;
  processAITrades: (symbol: string, currentPrice: number, signal: Signal | null) => void;
}

const initialAIStatus: AIStatus = {
  virtualBalance: AI_TRADING.INITIAL_VIRTUAL_BALANCE,
  totalProfit: 0,
  trades: [],
};

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      aiStatus: initialAIStatus,

      processAITrades: (symbol, currentPrice, signal) => {
        const { aiStatus } = get();

        // AITradeService を使用して新しい状態を計算
        const result = aiTradeService.processTrades(symbol, currentPrice, signal, aiStatus);

        if (result) {
          set({ aiStatus: result.newStatus });
        }
      }
    }),
    {
      name: 'ai-storage',
    }
  )
);