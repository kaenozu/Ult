/**
 * ULT Trading Platform - Agent System Entry Point
 *
 * Usage: npx tsx app/lib/agent-system/index.ts
 */

import { main } from '../AgentSystem/launcher';

// Execute the launcher
main().catch((error) => {
  console.error('❌ Agent system failed:', error);
  process.exit(1);
});
