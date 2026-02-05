#!/usr/bin/env node

/**
 * ULT Trading Platform - Agent Launcher
 *
 * エージェントシステムのエントリーポイント
 * すべてのエージェントを並列起動し、進捗を監視
 */

import { AgentManager, AgentInfo, AgentTask } from './AgentManager';
import { ULT_TASKS, SKILLS } from './skills';

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        ULT Trading Platform - Parallel Agent System       ║
║                                                            ║
║  Launching parallel development agents...                 ║
╚════════════════════════════════════════════════════════════╝
`);

  const manager = new AgentManager();

  // Register all agents
  console.log('📋 Registering agents...\n');
  for (const task of ULT_TASKS) {
    manager.registerAgent(
      `agent-${task.id}`,
      task.skill,
      task.priority === 'critical' || task.priority === 'high' ? 'high' : 'medium'
    );
  }

  // Show agent info
  console.log('🤖 Registered Agents:');
  manager.getAgentStatus().forEach((agent: AgentInfo) => {
    const skill = SKILLS[agent.skill];
    if (skill) {
      console.log(`  • ${agent.name} (${skill.name}): ${skill.estimatedTime}`);
    }
  });
  console.log('');

  // Assign tasks
  console.log('🎯 Assigning tasks...\n');
  for (const task of ULT_TASKS) {
    try {
      const agentName = await manager.assignTask({
        id: task.id,
        title: task.title,
        skill: task.skill,
        priority: task.priority,
        branch: task.branch || `task-${task.id}`,
      });
      if (agentName) {
        console.log(`  ✅ ${task.title} → ${agentName}`);
      } else {
        console.log(`  ⚠️ ${task.title}: No available agent`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Failed to assign ${task.title}: ${errorMessage}`);
    }
  }
  console.log('');

  // Monitor progress
  console.log('📊 Monitoring progress...\n');
  let checkCount = 0;
  const maxChecks = 180; // 3 hours max (assuming 1 min intervals)

  const printStatus = (): void => {
    const status = manager.getTaskStatus();
    const agents = manager.getAgentStatus();
    const completed = status.filter(t => t.status === 'completed').length;
    const total = status.length;

    console.log(`
╔════════════════════════════════════════════════════════════╗
║           ULT Agent System - Progress Monitor             ║
║                                                            ║
║  Elapsed: ${Math.floor(checkCount / 60)}h ${checkCount % 60}m
║  Progress: ${completed}/${total} (${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%)
╚════════════════════════════════════════════════════════════╝
`);

    console.log('📋 Task Status:');
    status.forEach((task: AgentTask) => {
      const icon = task.status === 'completed' ? '✅' :
                  task.status === 'running' ? '🔄' :
                  task.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${icon} ${task.title}: ${task.status}`);
      if (task.startTime) {
        const duration = Math.floor((Date.now() - task.startTime.getTime()) / 1000 / 60);
        console.log(`     Started: ${duration}m ago`);
      }
    });

    console.log('\n🤖 Agent Status:');
    agents.forEach((agent: AgentInfo) => {
      const icon = agent.status === 'completed' ? '✅' :
                  agent.status === 'working' ? '🔄' :
                  agent.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${icon} ${agent.name} (${agent.skill}): ${agent.status}`);
    });
  };

  const interval = setInterval(() => {
    checkCount++;
    const status = manager.getTaskStatus();
    const completed = status.filter(t => t.status === 'completed').length;
    const total = status.length;

    printStatus();

    // Check if all completed
    if (completed >= total || checkCount >= maxChecks) {
      clearInterval(interval);
      console.log('\n🎉 All agents finished or timeout reached!\n');

      // Summary
      console.log('📊 Final Report:');
      console.log('─'.repeat(50));
      status.forEach((task: AgentTask) => {
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

      console.log('\n💾 Check individual AGENT_REPORT.md files for details.');
      console.log('📂 Worktrees located at: .agent-worktrees/');
    }
  }, 60000); // Check every minute

  // Wait for completion
  await manager.waitForCompletion();

  clearInterval(interval);
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export { main };
