/**
 * Initialize DI Container
 * 
 * This file should be imported early in the application lifecycle
 * to ensure all services are registered before they are needed.
 */

import { initializeContainer, registerService, TOKENS } from '@/app/lib/di/container';
import { logger } from '@/app/core/logger';

/**
 * Register all platform services
 */
export function registerPlatformServices(): void {
  // Note: Services will be registered when they are imported
  // This prevents circular dependencies and enables lazy loading
  
  logger.info('[DI] Platform services ready to be registered');
}

/**
 * Initialize container with all services
 */
export function initializeDI(): void {
  try {
    initializeContainer();
    registerPlatformServices();
    logger.info('[DI] Container initialized successfully');
  } catch (error) {
    logger.error('[DI] Failed to initialize container:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
