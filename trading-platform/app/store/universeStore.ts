/**
 * Universe Store for ULT Trading Platform
 * 
 * Manages the stock universe state with Zustand for
 * reactive UI updates and persistence.
 */

const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => { if (isDev) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) console.warn(...args); };
const devError = (...args: unknown[]) => { if (isDev) console.error(...args); };

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUniverseManager, UniverseStock, UniverseStats, SymbolValidationResult } from '@/app/lib/universe/UniverseManager';

/**
 * Universe store interface
 */
interface UniverseStore {
  // State
  stocks: UniverseStock[];
  stats: UniverseStats | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  addStock: (symbol: string) => Promise<UniverseStock>;
  removeStock: (symbol: string) => boolean;
  updateStock: (symbol: string, updates: Partial<UniverseStock>) => void;
  validateSymbol: (symbol: string) => Promise<SymbolValidationResult>;
  searchStocks: (query: string) => UniverseStock[];
  setStockActive: (symbol: string, active: boolean) => boolean;
  updateUniverse: () => Promise<void>;
  refreshStats: () => void;
  clear: () => void;
  
  // Getters
  getStock: (symbol: string) => UniverseStock | undefined;
  getStocksByMarket: (market: 'japan' | 'usa') => UniverseStock[];
  getStocksBySector: (sector: string) => UniverseStock[];
}

/**
 * Create universe store
 */
export const useUniverseStore = create<UniverseStore>()(
  persist(
    (set, get) => ({
      // Initial state
      stocks: [],
      stats: null,
      isLoading: false,
      error: null,
      isInitialized: false,

      /**
       * Initialize universe with default stocks
       */
      initialize: async () => {
        set({ isLoading: true, error: null });

        try {
          const manager = getUniverseManager();
          await manager.initialize();
          
          const stocks = manager.getAllStocks();
          const stats = manager.getStats();
          
          set({
            stocks,
            stats,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error) {
          devError('Failed to initialize universe:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize universe',
            isLoading: false,
          });
        }
      },

      /**
       * Add a stock to the universe
       */
      addStock: async (symbol) => {
        set({ isLoading: true, error: null });

        try {
          const manager = getUniverseManager();
          const stock = await manager.addStock(symbol, true);
          
          const stocks = manager.getAllStocks();
          const stats = manager.getStats();
          
          set({
            stocks,
            stats,
            isLoading: false,
          });

          return stock;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add stock';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Remove a stock from the universe
       */
      removeStock: (symbol) => {
        const manager = getUniverseManager();
        const success = manager.removeStock(symbol);
        
        if (success) {
          const stocks = manager.getAllStocks();
          const stats = manager.getStats();
          
          set({
            stocks,
            stats,
          });
        }

        return success;
      },

      /**
       * Update a stock
       */
      updateStock: (symbol, updates) => {
        const manager = getUniverseManager();
        const stock = manager.getStock(symbol);
        
        if (stock) {
          Object.assign(stock, updates);
          
          const stocks = manager.getAllStocks();
          set({ stocks });
        }
      },

      /**
       * Validate a symbol
       */
      validateSymbol: async (symbol) => {
        set({ isLoading: true, error: null });

        try {
          const manager = getUniverseManager();
          const result = await manager.validateSymbol(symbol);
          
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to validate symbol',
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Search stocks by name or symbol
       */
      searchStocks: (query) => {
        const manager = getUniverseManager();
        return manager.searchStocks(query);
      },

      /**
       * Set stock active status
       */
      setStockActive: (symbol, active) => {
        const manager = getUniverseManager();
        const success = manager.setStockActive(symbol, active);
        
        if (success) {
          const stocks = manager.getAllStocks();
          const stats = manager.getStats();
          
          set({
            stocks,
            stats,
          });
        }

        return success;
      },

      /**
       * Update universe data
       */
      updateUniverse: async () => {
        set({ isLoading: true, error: null });

        try {
          const manager = getUniverseManager();
          await manager.updateUniverse();
          
          const stocks = manager.getAllStocks();
          const stats = manager.getStats();
          
          set({
            stocks,
            stats,
            isLoading: false,
          });
        } catch (error) {
          devError('Failed to update universe:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update universe',
            isLoading: false,
          });
        }
      },

      /**
       * Refresh statistics
       */
      refreshStats: () => {
        const manager = getUniverseManager();
        const stats = manager.getStats();
        set({ stats });
      },

      /**
       * Clear universe
       */
      clear: () => {
        const manager = getUniverseManager();
        manager.clear();
        
        set({
          stocks: [],
          stats: null,
          isInitialized: false,
        });
      },

      /**
       * Get a stock by symbol
       */
      getStock: (symbol) => {
        const manager = getUniverseManager();
        return manager.getStock(symbol);
      },

      /**
       * Get stocks by market
       */
      getStocksByMarket: (market) => {
        const manager = getUniverseManager();
        return manager.getStocksByMarket(market);
      },

      /**
       * Get stocks by sector
       */
      getStocksBySector: (sector) => {
        const manager = getUniverseManager();
        return manager.getStocksBySector(sector);
      },
    }),
    {
      name: 'universe-storage',
      partialize: (state) => ({
        stocks: state.stocks,
        stats: state.stats,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
