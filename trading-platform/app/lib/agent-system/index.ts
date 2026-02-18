import { logger } from '@/app/core/logger';
/**
 * ULT Trading Platform - Agent System Entry Point
 *
 * Usage: npx tsx app/lib/agent-system/index.ts
 */

import { main } from './launcher';

// Execute the launcher
main().catch((error: unknown) => {
  logger.error('笶・Agent system failed:', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

