/**
 * DI Container Helper for Testing
 * 
 * Provides utilities to mock services in tests
 */

import { container } from '@/app/lib/di/container';
import { TOKENS } from '@/app/lib/di/tokens';

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
  container.register<T>(token, createMockService(mock));
}

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  container.reset();
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
