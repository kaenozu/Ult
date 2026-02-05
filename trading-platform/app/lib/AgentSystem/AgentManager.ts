/**
 * ULT Trading Platform - Agent Manager
 * 
 * Manages parallel development agents
 */

export interface AgentTask {
  id: string;
  title: string;
  skill: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  branch: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface AgentInfo {
  name: string;
  skill: string;
  priority: 'high' | 'medium' | 'low';
  status: 'idle' | 'working' | 'completed' | 'failed';
  currentTask?: AgentTask;
}

export class AgentManager {
  private agents: Map<string, AgentInfo> = new Map();
  private tasks: Map<string, AgentTask> = new Map();

  /**
   * Register a new agent
   */
  registerAgent(name: string, skill: string, priority: 'high' | 'medium' | 'low'): void {
    this.agents.set(name, {
      name,
      skill,
      priority,
      status: 'idle',
    });
  }

  /**
   * Assign a task to an available agent
   */
  async assignTask(task: Omit<AgentTask, 'status'>): Promise<string | null> {
    const fullTask: AgentTask = { ...task, status: 'pending' };
    this.tasks.set(task.id, fullTask);
    
    // Find available agent with matching skill
    for (const [name, agent] of this.agents) {
      if (agent.skill === task.skill && agent.status === 'idle') {
        agent.status = 'working';
        agent.currentTask = fullTask;
        fullTask.status = 'running';
        fullTask.startTime = new Date();
        return name;
      }
    }
    return null;
  }

  /**
   * Get status of all agents
   */
  getAgentStatus(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get status of all tasks
   */
  getTaskStatus(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(): Promise<void> {
    // Stub implementation
    return Promise.resolve();
  }
}
