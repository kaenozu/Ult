import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock } from '../types';

interface UIStore {
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;
  isConnected: boolean;
  toggleConnection: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      selectedStock: null,

      setSelectedStock: (stock) => set({ selectedStock: stock }),

      isConnected: true,

      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
    }),
    {
      name: 'ui-storage',
    }
  )
);