/**
 * ULT Trading Platform - Agent System Entry Point
 *
 * Usage: npx tsx app/lib/agent-system/index.ts
 */

import { main } from '../AgentSystem/launcher';

// Execute the launcher
main().catch((error: unknown) => {
  console.error('笶・Agent system failed:', error);
  process.exit(1);
});

