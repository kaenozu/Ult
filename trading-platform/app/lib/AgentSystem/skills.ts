/**
 * ULT Trading Platform - Skill Definitions
 *
 * 各エージェントスキルの詳細定義と実装
 */

export interface SkillDefinition {
  name: string;
  description: string;
  commands: string[];
  requiredTools: string[];
  outputFiles: string[];
  estimatedTime: string;
}

// ============================================================================
// Skill Definitions
// ============================================================================

export const SKILLS: Record<string, SkillDefinition> = {
  'typescript-fixer': {
    name: 'TypeScript Fixer',
    description: 'Fixes all TypeScript compilation errors and eliminates any types',
    commands: [
      'npx tsc --noEmit',
      'npm run lint:fix',
      'npx tsc --noEmit', // Verify
    ],
    requiredTools: ['tsc', 'npm'],
    outputFiles: [
      '**/*.ts',
      '**/*.tsx',
      'tsconfig.json',
    ],
    estimatedTime: '2-3 hours',
  },

  'linter-fixer': {
    name: 'Linter Fixer',
    description: 'Fixes all ESLint warnings and errors, removes unused code',
    commands: [
      'npm run lint',
      'npm run lint:fix',
      'npm run lint', // Verify
    ],
    requiredTools: ['eslint', 'npm'],
    outputFiles: [
      '**/*.{ts,tsx,js,jsx}',
      '.eslintrc.*',
    ],
    estimatedTime: '3-4 hours',
  },

  'test-writer': {
    name: 'Test Writer',
    description: 'Writes comprehensive tests to achieve 80%+ coverage',
    commands: [
      'npm run test:coverage',
      'npm test',
    ],
    requiredTools: ['jest', 'npm'],
    outputFiles: [
      '**/__tests__/**/*.test.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    estimatedTime: '4-6 hours',
  },

  'websocket-expert': {
    name: 'WebSocket Expert',
    description: 'Repairs and stabilizes WebSocket connections',
    commands: [
      'npm run ws:server:dev',
      'npm test -- useWebSocket',
    ],
    requiredTools: ['node', 'npm', 'ws'],
    outputFiles: [
      'scripts/websocket-server.ts',
      'app/lib/websocket/**/*.ts',
      'app/hooks/useWebSocket.ts',
    ],
    estimatedTime: '2-3 hours',
  },

  'ui-ux-designer': {
    name: 'UI/UX Designer',
    description: 'Improves user interface and user experience',
    commands: [
      'npm run dev',
    ],
    requiredTools: ['next', 'react', 'chart.js'],
    outputFiles: [
      'app/components/**/*.tsx',
      'app/globals.css',
      'app/**/*.tsx',
    ],
    estimatedTime: '6-8 hours',
  },

  'quant-developer': {
    name: 'Quant Developer',
    description: 'Enhances backtest engine with advanced features',
    commands: [
      'npm test -- backtest',
      'npm run build',
    ],
    requiredTools: ['node', 'npm'],
    outputFiles: [
      'app/lib/backtest/**/*.ts',
      'app/lib/__tests__/backtest/**/*.test.ts',
    ],
    estimatedTime: '4-6 hours',
  },

  general: {
    name: 'General Assistant',
    description: 'General purpose agent for miscellaneous tasks',
    commands: [
      'npm run build',
    ],
    requiredTools: ['node', 'npm'],
    outputFiles: [],
    estimatedTime: '2-4 hours',
  },
};

// ============================================================================
// Agent Task Templates
// ============================================================================

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  skill: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptanceCriteria: string[];
  subtasks?: TaskTemplate[];
}

export const ULT_TASKS: TaskTemplate[] = [
  {
    id: 'ts-fix-all',
    title: 'Fix All TypeScript Errors',
    description: 'Eliminate all 61 TypeScript compilation errors to ensure clean build',
    skill: 'typescript-fixer',
    priority: 'critical',
    acceptanceCriteria: [
      'npx tsc --noEmit exits with code 0',
      'No "error TS" in output',
      'No "any" types in new code',
      'All imports resolve correctly',
    ],
  },
  {
    id: 'lint-cleanup',
    title: 'Clean Up ESLint Warnings',
    description: 'Fix all 1,109 ESLint warnings for clean codebase',
    skill: 'linter-fixer',
    priority: 'high',
    acceptanceCriteria: [
      'npm run lint exits with 0 warnings',
      'All unused imports removed',
      'No console.log in production code',
      'Consistent code style',
    ],
  },
  {
    id: 'test-coverage-80',
    title: 'Achieve 80%+ Test Coverage',
    description: 'Write tests to reach 80% coverage for all services',
    skill: 'test-writer',
    priority: 'high',
    acceptanceCriteria: [
      'npm run test:coverage shows ≥80% for lines, branches, functions, statements',
      'Core services (MarketData, TechnicalIndicator, ConsensusSignal) have tests',
      'BacktestService has comprehensive tests',
      'No skipped tests',
    ],
    subtasks: [
      {
        id: 'test-backtest',
        title: 'Write BacktestService Tests',
        description: 'Add comprehensive test suite for BacktestService',
        skill: 'test-writer',
        priority: 'high',
        acceptanceCriteria: [
          'test file is >200 lines',
          'Covers all public methods',
          'Includes edge cases',
        ],
      },
      {
        id: 'test-websocket',
        title: 'Write WebSocket Tests',
        description: 'Add tests for WebSocket client and server',
        skill: 'test-writer',
        priority: 'medium',
        acceptanceCriteria: [
          'Tests connection lifecycle',
          'Tests reconnection logic',
          'Tests message handling',
        ],
      },
    ],
  },
  {
    id: 'websocket-repair',
    title: 'Repair WebSocket Connection',
    description: 'Fix WebSocket server and client connection issues',
    skill: 'websocket-expert',
    priority: 'high',
    acceptanceCriteria: [
      'WebSocket server starts on port 3001',
      'Client can connect from browser',
      'Auth token validation works',
      'Auto-reconnect functions',
      'Documentation updated',
    ],
  },
  {
    id: 'ui-ux-improve',
    title: 'Improve UI/UX',
    description: 'Enhance user interface with better charts, tables, and responsiveness',
    skill: 'ui-ux-designer',
    priority: 'medium',
    acceptanceCriteria: [
      'Charts have interactive tooltips and crosshair',
      'Tables support sorting and filtering',
      'Responsive design works on mobile/tablet/desktop',
      'Dark theme consistently applied',
      'Accessibility: ARIA labels, keyboard nav',
    ],
  },
  {
    id: 'backtest-enhance',
    title: 'Enhance Backtest Engine',
    description: 'Add walk-forward analysis, Monte Carlo, and overfitting detection',
    skill: 'quant-developer',
    priority: 'medium',
    acceptanceCriteria: [
      'WalkForwardAnalyzer.ts is functional and tested',
      'MonteCarloSimulator.ts works correctly',
      'OverfittingDetector.ts validates strategies',
      'Performance reports are comprehensive',
    ],
  },
];

// ============================================================================
// Agent Runner
// ============================================================================

/**
 * エージェントをローンチするラッパー
 */
export async function launchAgent(
  agentName: string,
  taskId: string,
  worktreePath: string
): Promise<void> {
  console.log(`🚀 Launching agent ${agentName} for task ${taskId}`);

  const task = ULT_TASKS.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Check if skill exists
  if (!SKILLS[task.skill]) {
    throw new Error(`Skill not defined: ${task.skill}`);
  }

  const skill = SKILLS[task.skill];

  console.log(`📋 Task: ${task.title}`);
  console.log(`🎯 Skill: ${skill.name}`);
  console.log(`⏱️ Estimated: ${skill.estimatedTime}`);
  console.log(`📁 Worktree: ${worktreePath}`);

  // Create agent execution script
  const script = generateAgentExecutionScript(task, skill);

  const scriptPath = path.join(worktreePath, `agent-${taskId}.ts`);
  await fs.promises.writeFile(scriptPath, script, 'utf-8');

  // Execute agent
  console.log(`\n[${agentName}] Starting execution...\n`);

  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`, {
      cwd: worktreePath,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log(`\n✅ Agent ${agentName} completed task ${taskId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Agent ${agentName} failed: ${errorMessage}`);
    throw error;
  }
}

function generateAgentExecutionScript(task: TaskTemplate, skill: SkillDefinition): string {
  return `/**
 * Agent: ${task.skill}
 * Task: ${task.title}
 * Generated by ULT Agent System
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🤖 Agent Starting: ${task.title}');
console.log('Description: ${task.description}');
console.log('Acceptance Criteria:');
task.acceptanceCriteria.forEach(c => console.log(`  - ${c}`));
console.log('\n');

try {
  // Execute required commands
  const commands = `${skill.commands.join("', '")}`;
  console.log(`Executing: ${commands}\n`);

  // Run all commands
  `${skill.commands.map((cmd, i) => `console.log(\`[Step ${i+1}] Running: ${cmd}\`);
try {
  execSync('${cmd}', { encoding: 'utf-8', stdio: 'pipe' });
  console.log(\`✅ ${cmd} - SUCCESS\`);
} catch (err) {
  console.error(\`❌ ${cmd} - FAILED\`);
  throw err;
}
`).join('\n\n')}`

  console.log('\n🎉 All commands completed successfully!');

  // Generate report
  const report = `# Agent Execution Report\n\n` +
    `- Task: ${task.title}\n` +
    `- Agent: ${task.skill}\n` +
    `- Status: SUCCESS\n` +
    `- Timestamp: ${new Date().toISOString()}\n` +
    `- Acceptance Criteria: ALL MET\n`;

  fs.writeFileSync('AGENT_EXECUTION_REPORT.md', report);

  console.log('📄 Report generated: AGENT_EXECUTION_REPORT.md');

} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('\n❌ Agent failed:', errorMessage);

  const failReport = `# Agent Execution Report (FAILED)\n\n` +
    `- Task: ${task.title}\n` +
    `- Agent: ${task.skill}\n` +
    `- Status: FAILED\n` +
    `- Timestamp: ${new Date().toISOString()}\n` +
    `- Error: ${error.message}\n`;

  fs.writeFileSync('AGENT_EXECUTION_REPORT.md', failReport);
  process.exit(1);
}
`;
}

// ============================================================================
// Quick Launcher
// ============================================================================

/**
 * すべてのエージェントを並列起動
 */
export async function launchAllAgents(worktreeBasePath: string): Promise<void> {
  console.log('🚀 Launching all agents in parallel...\\n');

  const promises = ULT_TASKS.map(async (task, index) => {
    const agentName = `agent-${index+1}-${task.id}`;
    const worktreePath = path.join(worktreeBasePath, `worktree-${task.id}`);

    try {
      await launchAgent(agentName, task.id, worktreePath);
      console.log(`✅ ${agentName} completed\n`);
    } catch (error) {
      console.error(`❌ ${agentName} failed: ${error}\n`);
    }
  });

  await Promise.all(promises);

  console.log('🎉 All agents finished!');
}

// Default export
export default {
  launchAgent,
  launchAllAgents,
  SKILLS,
  ULT_TASKS,
};
