import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme as AppTheme, Stock } from '../types';

export interface UIState {
  theme: AppTheme;
  isConnected: boolean;
  selectedStock: Stock | null;
  showKeyboardShortcuts: boolean;
  toggleTheme: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  toggleConnection: () => void;
  setSelectedStock: (stock: Stock | null) => void;
  setKeyboardShortcuts: (visible: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isConnected: true,
      selectedStock: null,
      showKeyboardShortcuts: false,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setConnectionStatus: (isConnected) => set({ isConnected }),
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
      setSelectedStock: (stock) => set({ selectedStock: stock }),
      setKeyboardShortcuts: (visible) => set({ showKeyboardShortcuts: visible }),
    }),
    {
      name: 'trader-pro-ui-storage',
    }
  )
);
