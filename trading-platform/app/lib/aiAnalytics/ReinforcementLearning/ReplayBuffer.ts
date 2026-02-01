/**
 * ReplayBuffer.ts
 * 
 * Experience replay buffer for storing and sampling experiences
 */

import { Experience, ExperienceBatch } from './types';

/**
 * Circular buffer for storing experiences
 */
export class ReplayBuffer {
  private buffer: Experience[];
  private capacity: number;
  private position: number;
  private size: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = [];
    this.position = 0;
    this.size = 0;
  }

  /**
   * Add experience to buffer
   */
  add(experience: Experience): void {
    if (this.buffer.length < this.capacity) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.position] = experience;
    }

    this.position = (this.position + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }

  /**
   * Sample batch of experiences
   */
  sample(batchSize: number): ExperienceBatch {
    if (this.size < batchSize) {
      throw new Error(`Not enough experiences in buffer. Need ${batchSize}, have ${this.size}`);
    }

    // Random sampling without replacement
    const indices = this.randomSample(this.size, batchSize);
    
    const states = indices.map(i => this.buffer[i].state);
    const actions = indices.map(i => this.buffer[i].action);
    const rewards = indices.map(i => this.buffer[i].reward);
    const nextStates = indices.map(i => this.buffer[i].nextState);
    const dones = indices.map(i => this.buffer[i].done);
    const logProbs = indices.map(i => this.buffer[i].logProb);

    // Compute advantages and returns (to be filled by agent)
    const advantages = new Array(batchSize).fill(0);
    const returns = new Array(batchSize).fill(0);

    return {
      states,
      actions,
      rewards,
      nextStates,
      dones,
      logProbs,
      advantages,
      returns,
    };
  }

  /**
   * Get all experiences (for on-policy algorithms like PPO)
   */
  getAll(): ExperienceBatch {
    if (this.size === 0) {
      throw new Error('Buffer is empty');
    }

    const experiences = this.buffer.slice(0, this.size);
    
    const states = experiences.map(e => e.state);
    const actions = experiences.map(e => e.action);
    const rewards = experiences.map(e => e.reward);
    const nextStates = experiences.map(e => e.nextState);
    const dones = experiences.map(e => e.done);
    const logProbs = experiences.map(e => e.logProb);

    const advantages = new Array(this.size).fill(0);
    const returns = new Array(this.size).fill(0);

    return {
      states,
      actions,
      rewards,
      nextStates,
      dones,
      logProbs,
      advantages,
      returns,
    };
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = [];
    this.position = 0;
    this.size = 0;
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get capacity
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Check if buffer has enough samples
   */
  canSample(batchSize: number): boolean {
    return this.size >= batchSize;
  }

  /**
   * Random sampling helper
   */
  private randomSample(max: number, count: number): number[] {
    const indices: number[] = [];
    const used = new Set<number>();

    while (indices.length < count) {
      const index = Math.floor(Math.random() * max);
      if (!used.has(index)) {
        indices.push(index);
        used.add(index);
      }
    }

    return indices;
  }

  /**
   * Get statistics about buffer
   */
  getStats(): {
    size: number;
    capacity: number;
    utilization: number;
    averageReward: number;
  } {
    const experiences = this.buffer.slice(0, this.size);
    const averageReward = experiences.length > 0
      ? experiences.reduce((sum, e) => sum + e.reward, 0) / experiences.length
      : 0;

    return {
      size: this.size,
      capacity: this.capacity,
      utilization: this.size / this.capacity,
      averageReward,
    };
  }
}
