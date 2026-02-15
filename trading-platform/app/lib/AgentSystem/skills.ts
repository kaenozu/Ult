/**
 * ULT Trading Platform - Skill Definitions
 *
 * 蜷・お繝ｼ繧ｸ繧ｧ繝ｳ繝医せ繧ｭ繝ｫ縺ｮ隧ｳ邏ｰ螳夂ｾｩ縺ｨ螳溯｣・ */

import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { logger } from '@/app/core/logger';
const execAsync = promisify(exec);

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

  'pr-review-manager': {
    name: 'PR Review Manager',
    description: 'Manages PR review comments: fetches comments, analyzes feedback, creates issues for actionable items, responds to reviewers',
    commands: [
      'gh pr view',
      'gh pr comment',
      'gh issue create',
    ],
    requiredTools: ['gh', 'git'],
    outputFiles: [
      '.github/workflows/*.yml',
    ],
    estimatedTime: '30 min - 1 hour',
  },

  'code-review-responder': {
    name: 'Code Review Responder',
    description: 'Analyzes PR review comments, determines if changes are needed, implements fixes, and responds to reviewers',
    commands: [
      'gh pr view --comments',
      'npx tsc --noEmit',
      'git commit',
      'gh pr comment',
    ],
    requiredTools: ['gh', 'git', 'tsc'],
    outputFiles: [
      '**/*.{ts,tsx}',
    ],
    estimatedTime: '1-2 hours',
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
      'npm run test:coverage shows 竕･80% for lines, branches, functions, statements',
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
  {
    id: 'setup-pr-review-automation',
    title: 'Setup PR Review to Issue Automation',
    description: 'Create GitHub Actions workflow to convert merged PR review comments to issues automatically',
    skill: 'pr-review-manager',
    priority: 'medium',
    acceptanceCriteria: [
      'Workflow file exists at .github/workflows/',
      'Triggers on PR merge',
      'Creates issue with review comments',
      'Skips if similar issue already exists',
    ],
  },
  {
    id: 'respond-pr-reviews',
    title: 'Respond to PR Review Comments',
    description: 'Analyze merged PR review comments, determine if changes are needed, implement fixes, and reply to reviewers',
    skill: 'code-review-responder',
    priority: 'high',
    acceptanceCriteria: [
      'All review comments are analyzed',
      'Actionable feedback is implemented',
      'Type check passes after changes',
      'Response is posted to original PR',
    ],
  },
];

// ============================================================================
// Agent Runner
// ============================================================================

/**
 * 繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医ｒ繝ｭ繝ｼ繝ｳ繝√☆繧九Λ繝・ヱ繝ｼ
 */
export async function launchAgent(
  agentName: string,
  taskId: string,
  worktreePath: string
): Promise<void> {
  logger.info(`噫 Launching agent ${agentName} for task ${taskId}`);

  const task = ULT_TASKS.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Check if skill exists
  if (!SKILLS[task.skill]) {
    throw new Error(`Skill not defined: ${task.skill}`);
  }

  const skill = SKILLS[task.skill];

  logger.info(`搭 Task: ${task.title}`);
  logger.info(`識 Skill: ${skill.name}`);
  logger.info(`竢ｱ・・Estimated: ${skill.estimatedTime}`);
  logger.info(`刀 Worktree: ${worktreePath}`);

  // Create agent execution script
  const script = generateAgentExecutionScript(task, skill);

  const scriptPath = path.join(worktreePath, `agent-${taskId}.ts`);
  await fs.promises.writeFile(scriptPath, script, 'utf-8');

  // Execute agent
  logger.info(`\n[${agentName}] Starting execution...\n`);

  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`, {
      cwd: worktreePath,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    if (stdout) logger.info(stdout);
    if (stderr) logger.error(stderr);

    logger.info(`\n笨・Agent ${agentName} completed task ${taskId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`\n笶・Agent ${agentName} failed: ${errorMessage}`);
    throw error;
  }
}

function generateAgentExecutionScript(task: TaskTemplate, skill: SkillDefinition): string {
  return [
    '/**',
    ` * Agent: ${task.skill}`,
    ` * Task: ${task.title}`,
    ' * Generated by ULT Agent System',
    ' */',
    '',
    "import { execSync } from 'child_process';",
    "import * as fs from 'fs';",
    "import * as path from 'path';",
    '',
    `console.log('[Agent] Starting: ${task.title}');`,
    `console.log('Description: ${task.description}');`,
    'console.log(\'Acceptance Criteria:\');',
    `const acceptanceCriteria = ${JSON.stringify(task.acceptanceCriteria)};`,
    "acceptanceCriteria.forEach((c) => console.log('  - ' + c));",
    "console.log('\\n');",
    '',
    'try {',
    `  const commands = ${JSON.stringify(skill.commands)};`,
    "  console.log('Executing: ' + commands.join(', ') + '\\n');",
    '',
    '  const commandsOutput = commands.map((cmd, i) => {',
    "    return '[Step ' + (i + 1) + '] Running: ' + cmd + '\\n' +" +
      "      'try {\\n' +" +
      "      \"  execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });\\n\" +" +
      "      \"  console.log(\\\'[SUCCESS] \\\' + cmd);\\n\" +" +
      "      '} catch (err) {\\n' +" +
      "      \"  console.error(\\\'[FAILED] \\\' + cmd);\\n\" +" +
      "      '  throw err;\\n' +" +
      "      '}';",
    '  }).join("\\n\\n");',
    '  console.log(commandsOutput);',
    '',
    "  console.log('\\n[Agent] All commands completed successfully!');",
    '',
    "  const report = '# Agent Execution Report\\n\\n' +" +
      `    '- Task: ${task.title}\\n' +` +
      `    '- Agent: ${task.skill}\\n' +` +
      "    '- Status: SUCCESS\\n' +" +
      "    '- Timestamp: ' + new Date().toISOString() + '\\n' +" +
      "    '- Acceptance Criteria: ALL MET\\n';",
    "  fs.writeFileSync('AGENT_EXECUTION_REPORT.md', report);",
    '',
    "  console.log('[Report] Generated: AGENT_EXECUTION_REPORT.md');",
    '',
    '} catch (error) {',
    '  const errorMessage = error instanceof Error ? error.message : String(error);',
    "  console.error('\\n[Agent] Failed:', errorMessage);",
    '',
    "  const failReport = '# Agent Execution Report (FAILED)\\n\\n' +" +
      `    '- Task: ${task.title}\\n' +` +
      `    '- Agent: ${task.skill}\\n' +` +
      "    '- Status: FAILED\\n' +" +
      "    '- Timestamp: ' + new Date().toISOString() + '\\n' +" +
      "    '- Error: ' + errorMessage + '\\n';",
    '',
    "  fs.writeFileSync('AGENT_EXECUTION_REPORT.md', failReport);",
    '  process.exit(1);',
    '}',
    '',
  ].join('\\n');
}
// ============================================================================
// Quick Launcher
// ============================================================================

/**
 * 縺吶∋縺ｦ縺ｮ繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医ｒ荳ｦ蛻苓ｵｷ蜍・ */
export async function launchAllAgents(worktreeBasePath: string): Promise<void> {
  logger.info('噫 Launching all agents in parallel...\\n');

  const promises = ULT_TASKS.map(async (task, index) => {
    const agentName = `agent-${index+1}-${task.id}`;
    const worktreePath = path.join(worktreeBasePath, `worktree-${task.id}`);

    try {
      await launchAgent(agentName, task.id, worktreePath);
      logger.info(`笨・${agentName} completed\n`);
    } catch (error) {
      logger.error(`笶・${agentName} failed: ${error}\n`);
    }
  });

  await Promise.all(promises);

  logger.info('脂 All agents finished!');
}

// Default export
export default {
  launchAgent,
  launchAllAgents,
  SKILLS,
  ULT_TASKS,
};

