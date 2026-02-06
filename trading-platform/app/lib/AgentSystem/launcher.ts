#!/usr/bin/env node

/**
 * ULT Trading Platform - Agent Launcher
 *
 * 繧ｨ繝ｳ繝医す繧ｹ繝・Β縺ｮ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・
 */

import { AgentManager, AgentInfo, TaskInfo } from './AgentManager';
import { ULT_TASKS, SKILLS } from './skills';
import { logger } from '../../core/logger';

export async function main() {
  const manager = new AgentManager(process.cwd());

  // Register all agents
  logger.info('Registering agents...');
  for (const task of ULT_TASKS) {
    await manager.registerAgent(
      `agent-${task.id}`,
      task.skill,
      task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium'
    );
  }

  // Show agent info
  const agents = manager.getAgents();
  console.table(agents.map(agent => ({
    name: agent.name,
    skill: agent.skill,
    status: agent.status,
  })));

  // Start agents if requested
  const args = process.argv.slice(2);
  if (args.includes('--start')) {
    logger.info('Starting agents...');
    await manager.startAll();
  } else if (args.includes('--stop')) {
    logger.info('Stopping agents...');
    await manager.stopAll();
  } else if (args.includes('--status')) {
    logger.info('Getting agent status...');
    const status = await manager.getStatus();
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(`
Usage: node launcher.js [options]

Options:
  --start     Start all registered agents
  --stop      Stop all running agents
  --status    Get status of all agents
`);
  }
}

main().catch(error => {
  logger.error('Launcher error:', error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});
