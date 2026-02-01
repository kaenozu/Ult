/**
 * types.ts
 * 
 * Type definitions for Reinforcement Learning components
 */

// ============================================================================
// State and Action Types
// ============================================================================

/**
 * Market state representation for RL agent
 */
export interface MarketState {
  prices: number[]; // Recent price history
  volumes: number[]; // Recent volume history
  indicators: {
    rsi: number;
    macd: number;
    sma20: number;
    sma50: number;
    bbUpper: number;
    bbLower: number;
    atr: number;
  };
  timestamp: number;
}

/**
 * Portfolio state representation
 */
export interface PortfolioState {
  cash: number;
  positions: number; // Number of shares held
  portfolioValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

/**
 * Combined state for RL agent
 */
export interface State {
  market: MarketState;
  portfolio: PortfolioState;
  normalized: number[]; // Normalized feature vector for neural network
}

/**
 * Trading actions available to agent
 */
export enum ActionType {
  HOLD = 0,
  BUY_SMALL = 1,
  BUY_MEDIUM = 2,
  BUY_LARGE = 3,
  SELL_SMALL = 4,
  SELL_MEDIUM = 5,
  SELL_LARGE = 6,
}

/**
 * Action with size
 */
export interface Action {
  type: ActionType;
  size: number; // Percentage of portfolio (0-1)
}

/**
 * Experience tuple for replay buffer
 */
export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
  logProb: number; // Log probability of action (for PPO)
}

/**
 * Batch of experiences for training
 */
export interface ExperienceBatch {
  states: State[];
  actions: Action[];
  rewards: number[];
  nextStates: State[];
  dones: boolean[];
  logProbs: number[];
  advantages: number[];
  returns: number[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Reinforcement learning configuration
 */
export interface RLConfig {
  stateSize: number;
  actionSize: number;
  learningRate: number;
  gamma: number; // Discount factor
  epsilon: number; // Exploration rate
  epsilonDecay: number;
  epsilonMin: number;
  batchSize: number;
  bufferSize: number;
  updateFrequency: number;
  clipEpsilon: number; // PPO clip parameter
  valueCoef: number; // Value loss coefficient
  entropyCoef: number; // Entropy coefficient
  maxGradNorm: number; // Gradient clipping
  ppoEpochs: number; // PPO update epochs
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  initialCapital: number;
  maxSteps: number;
  minCapital: number; // Minimum capital before episode ends
  transactionCostRate: number;
  slippageRate: number;
  riskFreeRate: number; // For Sharpe ratio calculation
  maxPositionSize: number; // Maximum percentage of portfolio
  symbol: string;
  dataPath?: string;
}

/**
 * Step result from environment
 */
export interface StepResult {
  state: State;
  reward: number;
  done: boolean;
  info: {
    portfolioValue: number;
    totalReturn: number;
    sharpeRatio: number;
    transactionCost: number;
    riskPenalty: number;
  };
}

// ============================================================================
// Neural Network Types
// ============================================================================

/**
 * Simple neural network layer
 */
export interface Layer {
  weights: number[][];
  bias: number[];
  activation: 'relu' | 'tanh' | 'softmax' | 'linear';
}

/**
 * Network architecture
 */
export interface NetworkArchitecture {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  learningRate: number;
}

/**
 * Policy network output
 */
export interface PolicyOutput {
  actionProbs: number[];
  logProbs: number[];
  entropy: number;
}

/**
 * Value network output
 */
export interface ValueOutput {
  value: number;
}

// ============================================================================
// Training and Performance Types
// ============================================================================

/**
 * PPO loss components
 */
export interface PPOLoss {
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  totalLoss: number;
}

/**
 * Training metrics
 */
export interface TrainingMetrics {
  episode: number;
  episodeReward: number;
  averageReward: number;
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  epsilon: number;
  steps: number;
  portfolioValue: number;
  totalReturn: number;
  sharpeRatio: number;
  winRate: number;
}

/**
 * Agent performance statistics
 */
export interface AgentPerformance {
  totalEpisodes: number;
  totalSteps: number;
  averageReward: number;
  bestReward: number;
  worstReward: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trainingTime: number;
}

// ============================================================================
// Multi-Agent Types
// ============================================================================

/**
 * Agent info for multi-agent environment
 */
export interface AgentInfo {
  id: string;
  type: 'aggressive' | 'conservative' | 'balanced';
  portfolio: PortfolioState;
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    winRate: number;
  };
}

/**
 * Multi-agent state
 */
export interface MultiAgentState {
  marketState: MarketState;
  agents: Map<string, AgentInfo>;
  globalMetrics: {
    totalVolume: number;
    marketImpact: number;
    liquidity: number;
  };
}

/**
 * Multi-agent action
 */
export interface MultiAgentAction {
  agentId: string;
  action: Action;
}

/**
 * Multi-agent step result
 */
export interface MultiAgentStepResult {
  states: Map<string, State>;
  rewards: Map<string, number>;
  dones: Map<string, boolean>;
  info: Map<string, Record<string, unknown>>;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_RL_CONFIG: RLConfig = {
  stateSize: 50,
  actionSize: 7,
  learningRate: 0.0003,
  gamma: 0.99,
  epsilon: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.01,
  batchSize: 64,
  bufferSize: 10000,
  updateFrequency: 4,
  clipEpsilon: 0.2,
  valueCoef: 0.5,
  entropyCoef: 0.01,
  maxGradNorm: 0.5,
  ppoEpochs: 4,
};

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  initialCapital: 100000,
  maxSteps: 1000,
  minCapital: 10000,
  transactionCostRate: 0.001,
  slippageRate: 0.0005,
  riskFreeRate: 0.02,
  maxPositionSize: 0.3,
  symbol: '^N225',
};
