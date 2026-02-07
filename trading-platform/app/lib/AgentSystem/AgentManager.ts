import type { TaskTemplate } from './skills';

type AgentPriority = 'high' | 'medium' | 'low';
type AgentStatus = 'idle' | 'working' | 'completed' | 'failed';
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentInfo {
  name: string;
  skill: string;
  priority: AgentPriority;
  status: AgentStatus;
  currentTaskId?: string;
}

export interface TaskInfo extends TaskTemplate {
  status: TaskStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export class AgentManager {
  private agents: AgentInfo[] = [];
  private tasks: TaskInfo[] = [];

  constructor(private workspaceRoot: string) {
    void this.workspaceRoot;
  }

  async registerAgent(name: string, skill: string, priority: AgentPriority): Promise<void> {
    this.agents.push({ name, skill, priority, status: 'idle' });
  }

  async assignTask(task: TaskInfo): Promise<string> {
    const agent = this.findAvailableAgent(task.skill) ?? this.findAvailableAgent();
    if (!agent) {
      throw new Error('No available agents');
    }

    agent.status = 'working';
    agent.currentTaskId = task.id;

    const existingIndex = this.tasks.findIndex(t => t.id === task.id);
    const taskRecord: TaskInfo = {
      ...task,
      status: 'running',
      startTime: new Date(),
    };

    if (existingIndex >= 0) {
      this.tasks[existingIndex] = taskRecord;
    } else {
      this.tasks.push(taskRecord);
    }

    setTimeout(() => this.completeTask(task.id), 0);

    return agent.name;
  }

  getAgentStatus(): AgentInfo[] {
    return [...this.agents];
  }

  getTaskStatus(): TaskInfo[] {
    return [...this.tasks];
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    return { completed, total, percentage };
  }

  private findAvailableAgent(skill?: string): AgentInfo | undefined {
    if (skill) {
      return this.agents.find(agent => agent.status === 'idle' && agent.skill === skill);
    }
    return this.agents.find(agent => agent.status === 'idle');
  }

  private completeTask(taskId: string, error?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = error ? 'failed' : 'completed';
    task.endTime = new Date();
    if (error) {
      task.error = error;
    }

    const agent = this.agents.find(a => a.currentTaskId === taskId);
    if (agent) {
      agent.status = error ? 'failed' : 'completed';
      agent.currentTaskId = undefined;
    }
  }
}
