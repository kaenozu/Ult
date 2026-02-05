/**
 * Store Utilities - Common patterns for Zustand stores
 * 
 * Provides reusable patterns and utilities for creating consistent stores
 * across the application.
 */

import { create, StateCreator, StoreApi } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

// ============================================================================
// Common Store State Patterns
// ============================================================================

/**
 * Loading state pattern - can be included in any store
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Pagination state pattern - for stores with paginated data
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

/**
 * Filter state pattern - for stores with filterable data
 */
export interface FilterState<T = Record<string, unknown>> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilters: () => void;
  resetFilters: (defaultFilters: T) => void;
}

/**
 * Sort state pattern - for stores with sortable data
 */
export interface SortState<T = string> {
  sortBy: T;
  sortOrder: 'asc' | 'desc';
  setSort: (sortBy: T, order?: 'asc' | 'desc') => void;
  toggleSort: (sortBy: T) => void;
}

// ============================================================================
// Store Creator Helpers
// ============================================================================

/**
 * Create loading state actions
 */
export const createLoadingActions = <T extends LoadingState>(
  set: StoreApi<T>['setState']
): Pick<LoadingState, 'setLoading' | 'setError' | 'clearError'> => ({
  setLoading: (loading: boolean) => set((state) => ({ ...state, isLoading: loading })),
  setError: (error: string | null) => set((state) => ({ ...state, error })),
  clearError: () => set((state) => ({ ...state, error: null })),
});

/**
 * Create pagination state actions
 */
export const createPaginationActions = <T extends PaginationState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState']
): Pick<PaginationState, 'setPage' | 'setPageSize' | 'nextPage' | 'prevPage'> => ({
  setPage: (page: number) => set((state) => ({ ...state, page: Math.max(0, page) })),
  setPageSize: (pageSize: number) => set((state) => ({ ...state, pageSize, page: 0 })),
  nextPage: () => {
    const { page } = get();
    set((state) => ({ ...state, page: page + 1 }));
  },
  prevPage: () => {
    const { page } = get();
    set((state) => ({ ...state, page: Math.max(0, page - 1) }));
  },
});

/**
 * Create filter state actions
 */
export const createFilterActions = <T extends FilterState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState']
): Pick<FilterState, 'setFilter' | 'setFilters' | 'clearFilters' | 'resetFilters'> => ({
  setFilter: (key, value) => {
    const { filters } = get();
    set((state) => ({ ...state, filters: { ...filters, [key]: value } }));
  },
  setFilters: (newFilters) => {
    const { filters } = get();
    set((state) => ({ ...state, filters: { ...filters, ...newFilters } }));
  },
  clearFilters: () => set((state) => ({ ...state, filters: {} as T['filters'] })),
  resetFilters: (defaultFilters) => set((state) => ({ ...state, filters: defaultFilters })),
});

/**
 * Create sort state actions
 */
export const createSortActions = <T extends SortState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState']
): Pick<SortState, 'setSort' | 'toggleSort'> => ({
  setSort: (sortBy, order) => {
    set((state) => ({ 
      ...state,
      sortBy, 
      sortOrder: order || 'asc'
    }));
  },
  toggleSort: (sortBy) => {
    const { sortBy: currentSortBy, sortOrder } = get();
    if (currentSortBy === sortBy) {
      set((state) => ({ ...state, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' }));
    } else {
      set((state) => ({ ...state, sortBy, sortOrder: 'asc' }));
    }
  },
});

// ============================================================================
// Persist Configuration Helpers
// ============================================================================

/**
 * Standard persist configuration with common options
 */
export const createPersistConfig = <T>(
  name: string,
  options: Partial<PersistOptions<T>> = {}
): PersistOptions<T> => ({
  name: `trading-platform-${name}`,
  version: 1,
  ...options,
});

/**
 * Create a store with standard persist configuration
 */
export const createPersistedStore = <T>(
  name: string,
  initializer: StateCreator<T, [], [['zustand/persist', T]]>,
  persistOptions: Partial<PersistOptions<T>> = {}
) => {
  return create<T>()(
    persist(initializer, createPersistConfig(name, persistOptions))
  );
};

// ============================================================================
// Store Composition Helpers
// ============================================================================

/**
 * Compose multiple store slices into a single store
 * Usage:
 * const useMyStore = create<StoreType>()((set, get, api) => ({
 *   ...createLoadingSlice(set, get),
 *   ...createPaginationSlice(set, get),
 *   // ... other slices
 * }));
 */

export type StoreSlice<T, S = T> = (
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
  api: StoreApi<T>
) => S;

/**
 * Create a loading slice for store composition
 */
export const createLoadingSlice = <T extends LoadingState>(
  set: StoreApi<T>['setState']
): LoadingState => ({
  isLoading: false,
  error: null,
  ...createLoadingActions(set),
});

/**
 * Create a pagination slice for store composition
 */
export const createPaginationSlice = <T extends PaginationState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
  initialPageSize = 10
): PaginationState => ({
  page: 0,
  pageSize: initialPageSize,
  totalCount: 0,
  ...createPaginationActions(set, get),
});

/**
 * Create a filter slice for store composition
 */
export const createFilterSlice = <T extends FilterState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
  defaultFilters: T['filters']
): FilterState<T['filters']> => ({
  filters: defaultFilters,
  ...createFilterActions(set, get),
});

/**
 * Create a sort slice for store composition
 */
export const createSortSlice = <T extends SortState>(
  set: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
  defaultSortBy: T['sortBy']
): SortState<T['sortBy']> => ({
  sortBy: defaultSortBy,
  sortOrder: 'asc',
  ...createSortActions(set, get),
});

// ============================================================================
// Store Enhancers
// ============================================================================

/**
 * Enable Redux DevTools for debugging
 */
export const withDevTools = <T extends object>(
  initializer: StateCreator<T>
): StateCreator<T> => {
  if (process.env.NODE_ENV === 'development') {
    return (set, get, api) => ({
      ...initializer(set, get, api),
      // Add devtools marker
      __devtools: true,
    });
  }
  return initializer;
};

// ============================================================================
// Common Selectors
// ============================================================================

/**
 * Create a memoized selector for computed values
 */
export const createSelector = <T, R>(
  selector: (state: T) => R
): ((state: T) => R) => {
  let lastState: T | undefined;
  let lastResult: R | undefined;
  
  return (state: T) => {
    if (state !== lastState) {
      lastState = state;
      lastResult = selector(state);
    }
    return lastResult!;
  };
};

// ============================================================================
// Store Reset Utilities
// ============================================================================

/**
 * Create a reset function that resets store to initial state
 */
export const createResetAction = <T extends object>(
  set: StoreApi<T>['setState'],
  initialState: T
) => ({
  reset: () => set(initialState),
});