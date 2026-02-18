import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Signal } from '@/app/types';

interface SignalHistoryState {
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  updateSignalResult: (symbol: string, timestamp: number, result: 'HIT' | 'MISS' | 'PENDING') => void;
  clearHistory: () => void;
}

export const useSignalHistoryStore = create<SignalHistoryState>()(
  persist(
    (set) => ({
      signals: [],
      addSignal: (signal) => set((state) => ({
        signals: [{ ...signal, timestamp: signal.timestamp || Date.now() }, ...state.signals].slice(0, 100)
      })),
      updateSignalResult: (symbol, timestamp, result) => set((state) => ({
        signals: state.signals.map(s => 
          s.symbol === symbol && s.timestamp === timestamp
            ? { ...s, result } as unknown as Signal
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
