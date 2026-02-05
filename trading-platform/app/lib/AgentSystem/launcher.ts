#!/usr/bin/env node

/**
 * ULT Trading Platform - Agent Launcher
 *
 * 繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医す繧ｹ繝・Β縺ｮ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・ * 縺吶∋縺ｦ縺ｮ繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝医ｒ荳ｦ蛻苓ｵｷ蜍輔＠縲・ｲ謐励ｒ逶｣隕・ */

import { AgentManager, AgentInfo, TaskInfo } from './AgentManager';
import { ULT_TASKS, SKILLS } from './skills';

async function main() {
  console.log(`
笊披武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶風
笊・       ULT Trading Platform - Parallel Agent System       笊・笊・                                                           笊・笊・ Launching parallel development agents...                 笊・笊壺武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶幅
`);

  const manager = new AgentManager(process.cwd());

  // Register all agents
  console.log('搭 Registering agents...\\n');
  for (const task of ULT_TASKS) {
    await manager.registerAgent(
      `agent-${task.id}`,
      task.skill,
      task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium'
    );
  }

  // Show agent info
  console.log('､・Registered Agents:');
    manager.getAgentStatus().forEach((agent: AgentInfo) => {
      const skill = SKILLS[agent.skill];
      console.log(`  窶｢ ${agent.name} (${skill.name}): ${skill.estimatedTime}`);
    });
  console.log('');

  // Assign tasks
  console.log('識 Assigning tasks...\\n');
  for (const task of ULT_TASKS) {
    try {
      const agentName = await manager.assignTask({
        ...task,
        status: 'pending',
        id: task.id,
      });
      console.log(`  笨・${task.title} 竊・${agentName}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  笶・Failed to assign ${task.title}: ${errorMessage}`);
    }
  }
  console.log('');

  // Monitor progress
  console.log('投 Monitoring progress...\\n');
  let checkCount = 0;
  const maxChecks = 180; // 3 hours max (assuming 1 min intervals)

  const interval = setInterval(() => {
    checkCount++;
    const progress = manager.getProgress();
    const status = manager.getTaskStatus();

    console.clear();
    console.log(`
笊披武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶風
笊・          ULT Agent System - Progress Monitor             笊・笊・                                                           笊・笊・ Elapsed: ${Math.floor(checkCount / 60)}h ${checkCount % 60}m
笊・ Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)
笊壺武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶幅
`);

    console.log('搭 Task Status:');
    status.forEach((task: TaskInfo) => {
      const icon = task.status === 'completed' ? '[done]' :
                  task.status === 'running' ? '[run]' :
                  task.status === 'failed' ? '[fail]' : '[wait]';
      console.log(`  ${icon} ${task.title}: ${task.status}`);
      if (task.startTime) {
        const duration = Math.floor((Date.now() - task.startTime.getTime()) / 1000 / 60);
        console.log(`     Started: ${Math.floor(duration)}m ago`);
      }
    });

    console.log('\n､・Agent Status:');
    manager.getAgentStatus().forEach((agent: AgentInfo) => {
      const icon = agent.status === 'completed' ? '[done]' :
                  agent.status === 'working' ? '[run]' :
                  agent.status === 'failed' ? '[fail]' : '[wait]';
      console.log(`  ${icon} ${agent.name} (${agent.skill}): ${agent.status}`);
    });

    // Check if all completed
    if (progress.completed >= progress.total || checkCount >= maxChecks) {
      clearInterval(interval);
      console.log('\\n脂 All agents finished or timeout reached!\\n');

      // Summary
      console.log('投 Final Report:');
      console.log('笏'.repeat(50));
      status.forEach((task: TaskInfo) => {
        const statusIcon = task.status === 'completed' ? '[done]' :
                          task.status === 'failed' ? '[fail]' : '[wait]';
        console.log(`${statusIcon} ${task.title}`);
        if (task.endTime && task.startTime) {
          const duration = Math.floor((task.endTime.getTime() - task.startTime.getTime()) / 1000 / 60);
          console.log(`   Duration: ${duration} minutes`);
        }
        if (task.error) {
          console.log(`   Error: ${task.error.substring(0, 100)}...`);
        }
        console.log('');
      });

      console.log('\\n沈 Check individual AGENT_REPORT.md files for details.');
      console.log('唐 Worktrees located at: .agent-worktrees/');
    }
  }, 1000); // Check every second

  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, 180 * 60 * 1000)); // 3 hours max

  clearInterval(interval);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };

