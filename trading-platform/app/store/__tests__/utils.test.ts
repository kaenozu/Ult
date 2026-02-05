import { create } from 'zustand';
import {
  LoadingState,
  PaginationState,
  FilterState,
  SortState,
  createLoadingActions,
  createPaginationActions,
  createFilterActions,
  createSortActions,
  createLoadingSlice,
  createPaginationSlice,
  createFilterSlice,
  createSortSlice,
  createSelector,
  createResetAction,
  createPersistConfig,
} from '../utils';

describe('Store Utilities', () => {
  describe('createLoadingActions', () => {
    type TestStore = LoadingState;
    
    const createTestStore = () => create<TestStore>((set) => ({
      isLoading: false,
      error: null,
      ...createLoadingActions(set),
    }));

    it('should set loading state', () => {
      const store = createTestStore();
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);
    });

    it('should set error state', () => {
      const store = createTestStore();
      store.getState().setError('Test error');
      expect(store.getState().error).toBe('Test error');
    });

    it('should clear error state', () => {
      const store = createTestStore();
      store.getState().setError('Test error');
      store.getState().clearError();
      expect(store.getState().error).toBeNull();
    });
  });

  describe('createPaginationActions', () => {
    type TestStore = PaginationState;
    
    const createTestStore = () => create<TestStore>((set, get) => ({
      page: 0,
      pageSize: 10,
      totalCount: 100,
      ...createPaginationActions(set, get),
    }));

    it('should set page', () => {
      const store = createTestStore();
      store.getState().setPage(5);
      expect(store.getState().page).toBe(5);
    });

    it('should not set negative page', () => {
      const store = createTestStore();
      store.getState().setPage(-5);
      expect(store.getState().page).toBe(0);
    });

    it('should set page size', () => {
      const store = createTestStore();
      store.getState().setPageSize(20);
      expect(store.getState().pageSize).toBe(20);
    });

    it('should reset page when setting page size', () => {
      const store = createTestStore();
      store.getState().setPage(5);
      store.getState().setPageSize(20);
      expect(store.getState().page).toBe(0);
    });

    it('should increment page', () => {
      const store = createTestStore();
      store.getState().nextPage();
      expect(store.getState().page).toBe(1);
    });

    it('should decrement page', () => {
      const store = createTestStore();
      store.getState().setPage(5);
      store.getState().prevPage();
      expect(store.getState().page).toBe(4);
    });

    it('should not decrement below 0', () => {
      const store = createTestStore();
      store.getState().prevPage();
      expect(store.getState().page).toBe(0);
    });
  });

  describe('createFilterActions', () => {
    interface Filters {
      search: string;
      status: string;
    }
    
    type TestStore = FilterState<Filters>;
    
    const defaultFilters: Filters = {
      search: '',
      status: 'all',
    };
    
    const createTestStore = () => create<TestStore>((set, get) => ({
      filters: { ...defaultFilters },
      ...createFilterActions(set, get),
    }));

    it('should set single filter', () => {
      const store = createTestStore();
      store.getState().setFilter('search', 'test');
      expect(store.getState().filters.search).toBe('test');
    });

    it('should set multiple filters', () => {
      const store = createTestStore();
      store.getState().setFilters({ search: 'test', status: 'active' });
      expect(store.getState().filters).toEqual({
        search: 'test',
        status: 'active',
      });
    });

    it('should merge filters', () => {
      const store = createTestStore();
      store.getState().setFilter('search', 'test');
      store.getState().setFilters({ status: 'active' });
      expect(store.getState().filters).toEqual({
        search: 'test',
        status: 'active',
      });
    });

    it('should clear all filters', () => {
      const store = createTestStore();
      store.getState().setFilters({ search: 'test', status: 'active' });
      store.getState().clearFilters();
      expect(store.getState().filters).toEqual({});
    });

    it('should reset to default filters', () => {
      const store = createTestStore();
      store.getState().setFilters({ search: 'test', status: 'active' });
      store.getState().resetFilters(defaultFilters);
      expect(store.getState().filters).toEqual(defaultFilters);
    });
  });

  describe('createSortActions', () => {
    type SortBy = 'name' | 'date' | 'price';
    
    type TestStore = SortState<SortBy>;
    
    const createTestStore = () => create<TestStore>((set, get) => ({
      sortBy: 'name',
      sortOrder: 'asc',
      ...createSortActions(set, get),
    }));

    it('should set sort by and order', () => {
      const store = createTestStore();
      store.getState().setSort('date', 'desc');
      expect(store.getState().sortBy).toBe('date');
      expect(store.getState().sortOrder).toBe('desc');
    });

    it('should default to asc when order not specified', () => {
      const store = createTestStore();
      store.getState().setSort('price');
      expect(store.getState().sortBy).toBe('price');
      expect(store.getState().sortOrder).toBe('asc');
    });

    it('should toggle sort order for same field', () => {
      const store = createTestStore();
      store.getState().toggleSort('name');
      expect(store.getState().sortOrder).toBe('desc');
      store.getState().toggleSort('name');
      expect(store.getState().sortOrder).toBe('asc');
    });

    it('should set asc when toggling different field', () => {
      const store = createTestStore();
      store.getState().setSort('name', 'desc');
      store.getState().toggleSort('date');
      expect(store.getState().sortBy).toBe('date');
      expect(store.getState().sortOrder).toBe('asc');
    });
  });

  describe('Store Slices', () => {
    it('createLoadingSlice should create loading state', () => {
      type TestStore = LoadingState;
      const store = create<TestStore>((set) => ({
        ...createLoadingSlice(set),
      }));
      
      expect(store.getState().isLoading).toBe(false);
      expect(store.getState().error).toBeNull();
      
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);
    });

    it('createPaginationSlice should create pagination state', () => {
      type TestStore = PaginationState;
      const store = create<TestStore>((set, get) => ({
        ...createPaginationSlice(set, get, 25),
      }));
      
      expect(store.getState().page).toBe(0);
      expect(store.getState().pageSize).toBe(25);
      
      store.getState().nextPage();
      expect(store.getState().page).toBe(1);
    });

    it('createFilterSlice should create filter state', () => {
      interface Filters {
        category: string;
      }
      
      type TestStore = FilterState<Filters>;
      const defaultFilters = { category: 'all' };
      
      const store = create<TestStore>((set, get) => ({
        ...createFilterSlice(set, get, defaultFilters),
      }));
      
      expect(store.getState().filters).toEqual(defaultFilters);
      
      store.getState().setFilter('category', 'tech');
      expect(store.getState().filters.category).toBe('tech');
    });

    it('createSortSlice should create sort state', () => {
      type SortBy = 'name' | 'date';
      
      type TestStore = SortState<SortBy>;
      
      const store = create<TestStore>((set, get) => ({
        ...createSortSlice(set, get, 'name'),
      }));
      
      expect(store.getState().sortBy).toBe('name');
      expect(store.getState().sortOrder).toBe('asc');
      
      store.getState().toggleSort('date');
      expect(store.getState().sortBy).toBe('date');
    });
  });

  describe('createSelector', () => {
    interface State {
      items: number[];
      filter: string;
    }
    
    it('should memoize selector results', () => {
      const state: State = {
        items: [1, 2, 3, 4, 5],
        filter: '',
      };
      
      let callCount = 0;
      const selector = createSelector<State, number>((s) => {
        callCount++;
        return s.items.reduce((a, b) => a + b, 0);
      });
      
      // First call - should compute
      const result1 = selector(state);
      expect(result1).toBe(15);
      expect(callCount).toBe(1);
      
      // Second call with same state - should not compute
      const result2 = selector(state);
      expect(result2).toBe(15);
      expect(callCount).toBe(1);
      
      // Call with different state - should compute
      const newState = { ...state, filter: 'test' };
      const result3 = selector(newState);
      expect(result3).toBe(15);
      expect(callCount).toBe(2);
    });
  });

  describe('createResetAction', () => {
    interface State {
      value: number;
      name: string;
      reset: () => void;
    }
    
    it('should reset state to initial', () => {
      const initialState = {
        value: 0,
        name: 'default',
      };
      
      const store = create<State>((set) => ({
        ...initialState,
        ...createResetAction(set, initialState),
      }));
      
      // Modify state
      store.setState({ value: 100, name: 'changed' });
      expect(store.getState().value).toBe(100);
      expect(store.getState().name).toBe('changed');
      
      // Reset
      store.getState().reset();
      expect(store.getState().value).toBe(0);
      expect(store.getState().name).toBe('default');
    });
  });

  describe('createPersistConfig', () => {
    it('should create default persist config', () => {
      const config = createPersistConfig('test-store');
      
      expect(config.name).toBe('trading-platform-test-store');
      expect(config.version).toBe(1);
    });

    it('should merge custom options', () => {
      const config = createPersistConfig('test-store', {
        version: 2,
        partialize: (state) => ({ key: 'value' }),
      });
      
      expect(config.name).toBe('trading-platform-test-store');
      expect(config.version).toBe(2);
      expect(config.partialize).toBeDefined();
    });
  });

  describe('Complex Store Composition', () => {
    interface ComplexState extends LoadingState, PaginationState {
      data: string[];
      addData: (item: string) => void;
    }
    
    it('should compose multiple slices', () => {
      const store = create<ComplexState>((set, get) => ({
        // Loading slice
        ...createLoadingSlice(set),
        // Pagination slice
        ...createPaginationSlice(set, get, 20),
        // Custom state
        data: [],
        addData: (item) => set((state) => ({ data: [...state.data, item] })),
      }));
      
      // Test loading slice
      expect(store.getState().isLoading).toBe(false);
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);
      
      // Test pagination slice
      expect(store.getState().pageSize).toBe(20);
      store.getState().nextPage();
      expect(store.getState().page).toBe(1);
      
      // Test custom state
      expect(store.getState().data).toEqual([]);
      store.getState().addData('item1');
      expect(store.getState().data).toEqual(['item1']);
    });
  });
});
