import { create } from 'zustand';
import { Stock } from '../types';

interface UIState {
    selectedStock: Stock | null;
    setSelectedStock: (stock: Stock | null) => void;
    isConnected: boolean;
    toggleConnection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    selectedStock: null,
    setSelectedStock: (stock) => set({ selectedStock: stock }),
    isConnected: true,
    toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
}));
