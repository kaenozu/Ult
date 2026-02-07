/**
 * TradingAgent.ts
 * 
 * Reinforcement learning trading agent with PPO (Proximal Policy Optimization)
 */

import { PolicyNetwork } from './PolicyNetwork';
import { ValueNetwork } from './ValueNetwork';
import { ReplayBuffer } from './ReplayBuffer';
import {
  RLConfig,
  State,
  Action,
  ActionType,
  Experience,
  ExperienceBatch,
  PPOLoss,
  TrainingMetrics,
  DEFAULT_RL_CONFIG,
} from './types';

/**
 * Trading agent using PPO algorithm
 */
export class TradingAgent {
  private policyNetwork: PolicyNetwork;
  private valueNetwork: ValueNetwork;
  private replayBuffer: ReplayBuffer;
  private config: RLConfig;
  private epsilon: number;
  private trainingStep: number;
  private episodeCount: number;

  constructor(config: Partial<RLConfig> = {}) {
    this.config = { ...DEFAULT_RL_CONFIG, ...config };
    this.policyNetwork = new PolicyNetwork(
      this.config.stateSize,
      this.config.actionSize
    );
    this.valueNetwork = new ValueNetwork(this.config.stateSize);
    this.replayBuffer = new ReplayBuffer(this.config.bufferSize);
    this.epsilon = this.config.epsilon;
    this.trainingStep = 0;
    this.episodeCount = 0;
  }

  /**
   * Select action using ε-greedy policy
   */
  selectAction(state: State, explore: boolean = true): Action {
    // ε-greedy exploration
    if (explore && Math.random() < this.epsilon) {
      return this.getRandomAction();
    }

    // Get action probabilities from policy network
    const policyOutput = this.policyNetwork.forward(state);
    const actionType = this.sampleAction(policyOutput.actionProbs);
    const size = this.getActionSize(actionType);

    return {
      type: actionType,
      size,
    };
  }

  /**
   * Sample action from probability distribution
   */
  private sampleAction(probs: number[]): ActionType {
    const rand = Math.random();
    let cumSum = 0;

    for (let i = 0; i < probs.length; i++) {
      cumSum += probs[i];
      if (rand < cumSum) {
        return i as ActionType;
      }
    }

    return (probs.length - 1) as ActionType;
  }

  /**
   * Get random action
   */
  private getRandomAction(): Action {
    const actionType = Math.floor(Math.random() * this.config.actionSize) as ActionType;
    const size = this.getActionSize(actionType);

    return { type: actionType, size };
  }

  /**
   * Get action size based on action type
   */
  private getActionSize(actionType: ActionType): number {
    switch (actionType) {
      case ActionType.HOLD:
        return 0;
      case ActionType.BUY_SMALL:
      case ActionType.SELL_SMALL:
        return 0.1;
      case ActionType.BUY_MEDIUM:
      case ActionType.SELL_MEDIUM:
        return 0.25;
      case ActionType.BUY_LARGE:
      case ActionType.SELL_LARGE:
        return 0.5;
      default:
        return 0;
    }
  }

  /**
   * Store experience in replay buffer
   */
  storeExperience(experience: Experience): void {
    this.replayBuffer.add(experience);
  }

  /**
   * Learning step using PPO
   */
  async learn(): Promise<TrainingMetrics> {
    if (!this.replayBuffer.canSample(this.config.batchSize)) {
      throw new Error('Not enough experiences to learn');
    }

    // Get all experiences for on-policy learning
    const batch = this.replayBuffer.getAll();

    // Compute advantages and returns
    this.computeAdvantages(batch);

    // PPO update for multiple epochs
    let totalPolicyLoss = 0;
    let totalValueLoss = 0;
    let totalEntropy = 0;

    for (let epoch = 0; epoch < this.config.ppoEpochs; epoch++) {
      const loss = this.computePPOLoss(batch);
      
      totalPolicyLoss += loss.policyLoss;
      totalValueLoss += loss.valueLoss;
      totalEntropy += loss.entropy;

      // Update networks (simplified - in practice would use proper gradients)
      this.updateNetworks(loss);
    }

    // Decay epsilon
    this.epsilon = Math.max(
      this.config.epsilonMin,
      this.epsilon * this.config.epsilonDecay
    );

    this.trainingStep++;

    // Clear buffer for on-policy learning
    this.replayBuffer.clear();

    return {
      episode: this.episodeCount,
      episodeReward: batch.rewards.reduce((a, b) => a + b, 0),
      averageReward: batch.rewards.reduce((a, b) => a + b, 0) / batch.rewards.length,
      policyLoss: totalPolicyLoss / this.config.ppoEpochs,
      valueLoss: totalValueLoss / this.config.ppoEpochs,
      entropy: totalEntropy / this.config.ppoEpochs,
      epsilon: this.epsilon,
      steps: batch.states.length,
      portfolioValue: 0, // To be filled by environment
      totalReturn: 0, // To be filled by environment
      sharpeRatio: 0, // To be filled by environment
      winRate: 0, // To be filled by environment
    };
  }

  /**
   * Compute advantages using GAE (Generalized Advantage Estimation)
   */
  private computeAdvantages(batch: ExperienceBatch): void {
    const gamma = this.config.gamma;
    const lambda = 0.95; // GAE lambda

    let gae = 0;
    
    for (let i = batch.states.length - 1; i >= 0; i--) {
      const value = this.valueNetwork.forward(batch.states[i]).value;
      const nextValue = batch.dones[i]
        ? 0
        : this.valueNetwork.forward(batch.nextStates[i]).value;

      const delta = batch.rewards[i] + gamma * nextValue - value;
      gae = delta + gamma * lambda * (batch.dones[i] ? 0 : gae);
      
      batch.advantages[i] = gae;
      batch.returns[i] = gae + value;
    }

    // Normalize advantages
    const mean = batch.advantages.reduce((a, b) => a + b, 0) / batch.advantages.length;
    const variance = batch.advantages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / batch.advantages.length;
    const std = Math.sqrt(variance + 1e-8);

    for (let i = 0; i < batch.advantages.length; i++) {
      batch.advantages[i] = (batch.advantages[i] - mean) / std;
    }
  }

  /**
   * Compute PPO loss
   */
  private computePPOLoss(batch: ExperienceBatch): PPOLoss {
    let policyLoss = 0;
    let valueLoss = 0;
    let entropy = 0;

    for (let i = 0; i < batch.states.length; i++) {
      // Policy loss
      const policyOutput = this.policyNetwork.forward(batch.states[i]);
      const newLogProb = policyOutput.logProbs[batch.actions[i].type];
      const oldLogProb = batch.logProbs[i];
      
      const ratio = Math.exp(newLogProb - oldLogProb);
      const clippedRatio = Math.max(
        Math.min(ratio, 1 + this.config.clipEpsilon),
        1 - this.config.clipEpsilon
      );

      const advantage = batch.advantages[i];
      policyLoss -= Math.min(ratio * advantage, clippedRatio * advantage);

      // Value loss
      const value = this.valueNetwork.forward(batch.states[i]).value;
      const targetValue = batch.returns[i];
      valueLoss += Math.pow(value - targetValue, 2);

      // Entropy
      entropy += policyOutput.entropy;
    }

    policyLoss /= batch.states.length;
    valueLoss /= batch.states.length;
    entropy /= batch.states.length;

    const totalLoss = policyLoss + this.config.valueCoef * valueLoss - this.config.entropyCoef * entropy;

    return { policyLoss, valueLoss, entropy, totalLoss };
  }

  /**
   * Update networks (simplified version)
   */
  private updateNetworks(loss: PPOLoss): void {
    // In a real implementation, this would compute and apply gradients
    // For now, this is a placeholder that shows the structure
    // Actual gradient computation would require automatic differentiation
  }

  /**
   * Get epsilon value
   */
  getEpsilon(): number {
    return this.epsilon;
  }

  /**
   * Set epsilon value
   */
  setEpsilon(epsilon: number): void {
    this.epsilon = Math.max(this.config.epsilonMin, Math.min(1.0, epsilon));
  }

  /**
   * Increment episode count
   */
  incrementEpisode(): void {
    this.episodeCount++;
  }

  /**
   * Get episode count
   */
  getEpisodeCount(): number {
    return this.episodeCount;
  }

  /**
   * Get training step
   */
  getTrainingStep(): number {
    return this.trainingStep;
  }

  /**
   * Save model (returns network parameters)
   */
  saveModel(): {
    policy: { weights: number[][]; bias: number[] }[];
    value: { weights: number[][]; bias: number[] }[];
    config: RLConfig;
    metadata: {
      trainingStep: number;
      episodeCount: number;
      epsilon: number;
    };
  } {
    return {
      policy: this.policyNetwork.getParameters(),
      value: this.valueNetwork.getParameters(),
      config: this.config,
      metadata: {
        trainingStep: this.trainingStep,
        episodeCount: this.episodeCount,
        epsilon: this.epsilon,
      },
    };
  }

  /**
   * Load model (sets network parameters)
   */
  loadModel(model: {
    policy: { weights: number[][]; bias: number[] }[];
    value: { weights: number[][]; bias: number[] }[];
    metadata?: {
      trainingStep?: number;
      episodeCount?: number;
      epsilon?: number;
    };
  }): void {
    this.policyNetwork.setParameters(model.policy);
    this.valueNetwork.setParameters(model.value);
    
    if (model.metadata) {
      this.trainingStep = model.metadata.trainingStep ?? 0;
      this.episodeCount = model.metadata.episodeCount ?? 0;
      this.epsilon = model.metadata.epsilon ?? this.config.epsilon;
    }
  }
}
