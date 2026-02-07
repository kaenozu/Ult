import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme as AppTheme } from '../types';

interface UIState {
  theme: AppTheme;
  isConnected: boolean;
  toggleTheme: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  toggleConnection: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isConnected: true,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setConnectionStatus: (isConnected) => set({ isConnected }),
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
    }),
    {
      name: 'trader-pro-ui-storage',
    }
  )
);