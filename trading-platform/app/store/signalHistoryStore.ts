import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Signal } from '@/app/types';

interface SignalHistoryState {
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  updateSignalResult: (symbol: string, generatedAt: string, result: 'HIT' | 'MISS' | 'PENDING') => void;
  clearHistory: () => void;
}

export const useSignalHistoryStore = create<SignalHistoryState>()(
  persist(
    (set) => ({
      signals: [],
      addSignal: (signal) => set((state) => ({
        signals: [{ ...signal, generatedAt: signal.generatedAt || new Date().toISOString() }, ...state.signals].slice(0, 100)
      })),
      updateSignalResult: (symbol, generatedAt, result) => set((state) => ({
        signals: state.signals.map(s => 
          s.symbol === symbol && s.generatedAt === generatedAt 
            ? { ...s, result } 
            : s
        )
      })),
      clearHistory: () => set({ signals: [] }),
    }),
    {
      name: 'signal-history-storage',
    }
  )
);
