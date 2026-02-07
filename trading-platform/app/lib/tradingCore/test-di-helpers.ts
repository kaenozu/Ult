/**
 * DI Container Helper for Testing
 * 
 * Provides utilities to mock services in tests
 */

import { UnifiedTradingPlatform, TOKENS } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { container } from '@/app/lib/di/container';

/**
 * Create a mock service for DI container
 */
export function createMockService<T>(mock: Partial<T>): () => T {
  return () => mock as T;
}

/**
 * Register a mock service
 */
export function registerMockService<T>(token: symbol, mock: Partial<T>): void {
  UnifiedTradingPlatform.registerService(token, createMockService(mock));
}

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  UnifiedTradingPlatform.resetDIContainer();
}

/**
 * Setup common mocks for trading platform tests
 */
export function setupTestMocks(): void {
  // Register common mock services here
  // Example:
  // registerMockService(TOKENS.MultiExchangeDataFeed, {
  //   connect: jest.fn().mockResolvedValue(undefined),
  //   subscribe: jest.fn(),
  //   // ...
  // });
}
