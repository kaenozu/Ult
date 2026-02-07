#!/usr/bin/env node

/**
 * ULT Trading Platform - Agent Launcher
 *
 * 繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医す繧ｹ繝・Β縺ｮ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・ * 縺吶∋縺ｦ縺ｮ繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医ｒ荳ｦ蛻苓ｵｷ蜍輔＠縲・ｲ謐励ｒ逶｣隕・ */

import { AgentManager, AgentInfo, TaskInfo } from './AgentManager';
import { ULT_TASKS, SKILLS } from './skills';
import { logger } from '../../core/logger';

async function main() {
  logger.info(`
笊披武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶風
笊・       ULT Trading Platform - Parallel Agent System       笊・笊・                                                           笊・笊・ Launching parallel development agents...                 笊・笊壺武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶幅
`);

  const manager = new AgentManager(process.cwd());

  // Register all agents
  logger.info('搭 Registering agents...\\n');
  for (const task of ULT_TASKS) {
    await manager.registerAgent(
      `agent-${task.id}`,
      task.skill,
      task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium'
    );
  }

  // Show agent info
  logger.info('､・Registered Agents:');
    manager.getAgentStatus().forEach((agent: AgentInfo) => {
      const skill = SKILLS[agent.skill];
      logger.info(`  窶｢ ${agent.name} (${skill.name}): ${skill.estimatedTime}`);
    });
  logger.info('');

  // Assign tasks
  logger.info('識 Assigning tasks...\\n');
  for (const task of ULT_TASKS) {
    try {
      const agentName = await manager.assignTask({
        ...task,
        status: 'pending',
        id: task.id,
      });
      logger.info(`  笨・${task.title} 竊・${agentName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`  笶・Failed to assign ${task.title}:`, error instanceof Error ? error : new Error(errorMessage));
    }
  }
  logger.info('');

  // Monitor progress
  logger.info('投 Monitoring progress...\\n');
  let checkCount = 0;
  const maxChecks = 180; // 3 hours max (assuming 1 min intervals)

  const interval = setInterval(() => {
    checkCount++;
    const progress = manager.getProgress();
    const status = manager.getTaskStatus();

    // Note: console.clear() is fine for CLI experience
    console.clear();
    logger.info(`
笊披武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶風
笊・          ULT Agent System - Progress Monitor             笊・笊・                                                           笊・笊・ Elapsed: ${Math.floor(checkCount / 60)}h ${checkCount % 60}m
笊・ Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)
笊壺武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶幅
`);

    logger.info('搭 Task Status:');
    status.forEach((task: TaskInfo) => {
      const icon = task.status === 'completed' ? '[done]' :
                  task.status === 'running' ? '[run]' :
                  task.status === 'failed' ? '[fail]' : '[wait]';
      logger.info(`  ${icon} ${task.title}: ${task.status}`);
      if (task.startTime) {
        const duration = Math.floor((Date.now() - task.startTime.getTime()) / 1000 / 60);
        logger.info(`     Started: ${Math.floor(duration)}m ago`);
      }
    });

    logger.info('\n､・Agent Status:');
    manager.getAgentStatus().forEach((agent: AgentInfo) => {
      const icon = agent.status === 'completed' ? '[done]' :
                  agent.status === 'working' ? '[run]' :
                  agent.status === 'failed' ? '[fail]' : '[wait]';
      logger.info(`  ${icon} ${agent.name} (${agent.skill}): ${agent.status}`);
    });

    // Check if all completed
    if (progress.completed >= progress.total || checkCount >= maxChecks) {
      clearInterval(interval);
      logger.info('\\n脂 All agents finished or timeout reached!\\n');

      // Summary
      logger.info('投 Final Report:');
      logger.info('笏'.repeat(50));
      status.forEach((task: TaskInfo) => {
        const statusIcon = task.status === 'completed' ? '[done]' :
                          task.status === 'failed' ? '[fail]' : '[wait]';
        logger.info(`${statusIcon} ${task.title}`);
        if (task.endTime && task.startTime) {
          const duration = Math.floor((task.endTime.getTime() - task.startTime.getTime()) / 1000 / 60);
          logger.info(`   Duration: ${duration} minutes`);
        }
        if (task.error) {
          logger.info(`   Error: ${task.error.substring(0, 100)}...`);
        }
        logger.info('');
      });

      logger.info('\\n沈 Check individual AGENT_REPORT.md files for details.');
      logger.info('唐 Worktrees located at: .agent-worktrees/');
    }
  }, 1000); // Check every second

  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, 180 * 60 * 1000)); // 3 hours max

  clearInterval(interval);
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => logger.error('Launcher failed:', err instanceof Error ? err : new Error(String(err))));
}

export { main };

