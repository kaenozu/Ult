#!/usr/bin/env node

/**
 * ULT Trading Platform - Agent Launcher
 *
 * エージェントシステムのエントリーポイント
 * すべてのエージェントを並列起動し、進捗を監視
 */

import { AgentManager } from './AgentManager';
import { ULT_TASKS, SKILLS } from './skills';

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        ULT Trading Platform - Parallel Agent System       ║
║                                                            ║
║  Launching parallel development agents...                 ║
╚════════════════════════════════════════════════════════════╝
`);

  const manager = new AgentManager(process.cwd());

  // Register all agents
  console.log('📋 Registering agents...\\n');
  for (const task of ULT_TASKS) {
    await manager.registerAgent(
      `agent-${task.id}`,
      task.skill,
      task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium'
    );
  }

  // Show agent info
  console.log('🤖 Registered Agents:');
    manager.getAgentStatus().forEach(agent => {
      const skill = SKILLS[agent.skill];
      console.log(`  • ${agent.name} (${skill.name}): ${skill.estimatedTime}`);
    });
  console.log('');

  // Assign tasks
  console.log('🎯 Assigning tasks...\\n');
  for (const task of ULT_TASKS) {
    try {
      const agentName = await manager.assignTask({
        ...task,
        status: 'pending',
        id: task.id,
      });
      console.log(`  ✅ ${task.title} → ${agentName}`);
    } catch (error: any) {
      console.error(`  ❌ Failed to assign ${task.title}: ${error.message}`);
    }
  }
  console.log('');

  // Monitor progress
  console.log('📊 Monitoring progress...\\n');
  let checkCount = 0;
  const maxChecks = 180; // 3 hours max (assuming 1 min intervals)

  const interval = setInterval(() => {
    checkCount++;
    const progress = manager.getProgress();
    const status = manager.getTaskStatus();

    console.clear();
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           ULT Agent System - Progress Monitor             ║
║                                                            ║
║  Elapsed: ${Math.floor(checkCount / 60)}h ${checkCount % 60}m
║  Progress: ${progress.completed}/${progress.total} (${progress.percentage.toFixed(1)}%)
╚════════════════════════════════════════════════════════════╝
`);

    console.log('📋 Task Status:');
    status.forEach(task => {
      const icon = task.status === 'completed' ? '✅' :
                  task.status === 'running' ? '🔄' :
                  task.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${icon} ${task.title}: ${task.status}`);
      if (task.startTime) {
        const duration = Math.floor((Date.now() - task.startTime.getTime()) / 1000 / 60);
        console.log(`     Started: ${Math.floor(duration)}m ago`);
      }
    });

    console.log('\n🤖 Agent Status:');
    manager.getAgentStatus().forEach(agent => {
      const icon = agent.status === 'completed' ? '✅' :
                  agent.status === 'working' ? '🔄' :
                  agent.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${icon} ${agent.name} (${agent.skill}): ${agent.status}`);
    });

    // Check if all completed
    if (progress.completed >= progress.total || checkCount >= maxChecks) {
      clearInterval(interval);
      console.log('\\n🎉 All agents finished or timeout reached!\\n');

      // Summary
      console.log('📊 Final Report:');
      console.log('─'.repeat(50));
      status.forEach(task => {
        const statusIcon = task.status === 'completed' ? '✅' :
                          task.status === 'failed' ? '❌' : '⚠️';
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

      console.log('\\n💾 Check individual AGENT_REPORT.md files for details.');
      console.log('📂 Worktrees located at: .agent-worktrees/');
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
