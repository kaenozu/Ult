import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme as AppTheme, Stock } from '../types';
import type { BeginnerModeConfig } from '@/app/types/beginner-signal';
import { DEFAULT_BEGINNER_CONFIG } from '@/app/types/beginner-signal';

export interface UIState {
  theme: AppTheme;
  isConnected: boolean;
  selectedStock: Stock | null;
  showKeyboardShortcuts: boolean;
  beginnerMode: BeginnerModeConfig;
  toggleTheme: () => void;
  setConnectionStatus: (isConnected: boolean) => void;
  toggleConnection: () => void;
  setSelectedStock: (stock: Stock | null) => void;
  setKeyboardShortcuts: (visible: boolean) => void;
  updateBeginnerMode: (settings: Partial<BeginnerModeConfig>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isConnected: true,
      selectedStock: null,
      showKeyboardShortcuts: false,
      beginnerMode: { ...DEFAULT_BEGINNER_CONFIG, enabled: true },
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setConnectionStatus: (isConnected) => set({ isConnected }),
      toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
      setSelectedStock: (stock) => set({ selectedStock: stock }),
      setKeyboardShortcuts: (visible) => set({ showKeyboardShortcuts: visible }),
      updateBeginnerMode: (settings) => set((state) => ({
        beginnerMode: {
          ...state.beginnerMode,
          ...settings,
          enabled: true // Always stay enabled
        }
      })),
    }),
    {
      name: 'trader-pro-ui-storage',
    }
  )
);
