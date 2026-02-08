/**
 * Common Test Utilities
 * 
 * Shared testing utilities and mock functions to reduce duplication
 * across test files and improve maintainability.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate mock OHLCV data
 */
export const createMockOHLCV = (overrides: Partial<{
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> = {}) => ({
  symbol: 'TEST',
  date: '2026-01-01',
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  volume: 1000000,
  ...overrides,
});

/**
 * Generate mock stock data
 */
export const createMockStock = (overrides: Partial<{
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}> = {}) => ({
  symbol: 'TEST',
  name: 'Test Stock',
  market: 'usa',
  sector: 'Technology',
  price: 100,
  change: 2.5,
  changePercent: 2.56,
  volume: 1000000,
  ...overrides,
});

/**
 * Generate mock signal data
 */
export const createMockSignal = (overrides: Partial<{
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reason: string;
  predictedChange: number;
  predictionDate: string;
}> = {}) => ({
  symbol: 'TEST',
  type: 'BUY' as const,
  confidence: 85,
  targetPrice: 110,
  stopLoss: 95,
  reason: 'Strong technical indicators',
  predictedChange: 5.2,
  predictionDate: '2026-01-01',
  ...overrides,
});

/**
 * Generate mock position data
 */
export const createMockPosition = (overrides: Partial<{
  symbol: string;
  name: string;
  market: 'japan' | 'usa';
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  change: number;
  entryDate: string;
}> = {}) => ({
  symbol: 'TEST',
  name: 'Test Stock',
  market: 'usa',
  side: 'LONG' as const,
  quantity: 100,
  avgPrice: 100,
  currentPrice: 105,
  change: 5,
  entryDate: '2026-01-01',
  ...overrides,
} as unknown);

/**
 * Generate mock order data
 */
export const createMockOrder = (overrides: Partial<{
  id: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  date: string;
}> = {}) => ({
  id: 'order-123',
  symbol: 'TEST',
  type: 'MARKET' as const,
  side: 'BUY' as const,
  quantity: 100,
  status: 'PENDING' as const,
  date: '2026-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Generate mock portfolio data
 */
export const createMockPortfolio = (overrides: Partial<{
  positions: unknown[];
  orders: unknown[];
  totalValue: number;
  totalProfit: number;
  dailyPnL: number;
  cash: number;
}>) => ({
  positions: [],
  orders: [],
  totalValue: 100000,
  totalProfit: 5000,
  dailyPnL: 200,
  cash: 200,
  ...overrides,
});

// ============================================================================
// Test Rendering Utilities
// ============================================================================

/**
 * Custom render function with common providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderOptions = {}
) => {
  // Add any providers here if needed (e.g., Redux, Theme, etc.)
  return render(ui, {
    ...options,
  });
};

// ============================================================================
// Mock API Responses
// ============================================================================

/**
 * Create mock successful API response
 */
export const createMockSuccessResponse = <T,>(data: T) => ({
  success: true,
  data,
  source: 'api' as const,
});

/**
 * Create mock error API response
 */
export const createMockErrorResponse = (error: string) => ({
  success: false,
  data: null,
  source: 'error' as const,
  error,
});

// ============================================================================
// Common Test Scenarios
// ============================================================================

/**
 * Test component with loading state
 */
export const testLoadingState = (Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown> = {}) => {
  it('should show loading state', () => {
    renderWithProviders(<Component {...props} loading />);
    // Add loading-specific assertions here
  });
};

/**
 * Test component with error state
 */
export const testErrorState = (Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown> = {}) => {
  it('should show error state', () => {
    renderWithProviders(<Component {...props} error="Test error" />);
    // Add error-specific assertions here
  });
};

/**
 * Test component accessibility
 */
export const testAccessibility = (Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown> = {}) => {
  it('should be accessible', async () => {
    const { container } = renderWithProviders(<Component {...props} />);
    // Add accessibility-specific assertions here
    expect(container).toBeInTheDocument();
  });
};

// ============================================================================
// Performance Test Utilities
// ============================================================================

/**
 * Measure render performance
 */
export const measureRenderPerformance = (Component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown> = {}, iterations: number = 10) => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderWithProviders(<Component {...props} />);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return {
    avgTime,
    minTime,
    maxTime,
    times,
  };
};

// ============================================================================
// Mock Service Functions
// ============================================================================

/**
 * Mock fetch API
 */
export const mockFetch = jest.fn();

/**
 * Setup mock fetch implementation
 */
export const setupMockFetch = (response: unknown, ok = true) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

// ============================================================================
// Common Test Helpers
// ============================================================================

/**
 * Wait for component to update
 */
export const waitForUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create a delay for testing async behavior
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random test data
 */
export const generateRandomNumber = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate random test string
 */
export const generateRandomString = (length: number = 10) => 
  Math.random().toString(36).substring(2, length + 2);

// ============================================================================
// Jest Configuration Helpers
// ============================================================================

/**
 * Setup common test environment
 */
export const setupTestEnvironment = () => {
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Mock fetch if not already mocked
  if (!global.fetch) {
    global.fetch = mockFetch;
  }
};

/**
 * Cleanup test environment
 */
export const cleanupTestEnvironment = () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
};