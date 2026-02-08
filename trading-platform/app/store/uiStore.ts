import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme as AppTheme, Stock } from '../types';

interface UIState {
  theme: AppTheme;
  isConnected: boolean;
  selectedStock: Stock | null;
  toggleTheme: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  toggleConnection: () => void;
  setSelectedStock: (stock: Stock | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isConnected: true,
      selectedStock: null,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setConnectionStatus: (isConnected) => set({ isConnected }),
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
      setSelectedStock: (stock) => set({ selectedStock: stock }),
    }),
    {
      name: 'trader-pro-ui-storage',
    }
  )
);