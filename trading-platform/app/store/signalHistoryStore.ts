import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Signal } from '@/app/types';

interface SignalHistoryState {
  signals: Signal[];
  addSignal: (signal: Signal) => void;
  clearHistory: () => void;
}

export const useSignalHistoryStore = create<SignalHistoryState>()(
  persist(
    (set) => ({
      signals: [],
      addSignal: (signal) => set((state) => ({
        signals: [signal, ...state.signals].slice(0, 100)
      })),
      clearHistory: () => set({ signals: [] }),
    }),
    {
      name: 'signal-history-storage',
    }
  )
);
