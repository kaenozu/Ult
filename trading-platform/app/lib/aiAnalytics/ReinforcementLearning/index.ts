/**
 * index.ts
 * 
 * Main export file for Reinforcement Learning module
 */

// Core components
export { TradingAgent } from './TradingAgent';
export { TradingEnvironment } from './TradingEnvironment';
export { MultiAgentEnvironment } from './MultiAgentEnvironment';
export { PolicyNetwork } from './PolicyNetwork';
export { ValueNetwork } from './ValueNetwork';
export { ReplayBuffer } from './ReplayBuffer';

// Types
export type {
  State,
  Action,
  ActionType,
  Experience,
  ExperienceBatch,
  RLConfig,
  EnvironmentConfig,
  StepResult,
  MarketState,
  PortfolioState,
  PolicyOutput,
  ValueOutput,
  PPOLoss,
  TrainingMetrics,
  AgentPerformance,
  AgentInfo,
  MultiAgentState,
  MultiAgentAction,
  MultiAgentStepResult,
  Layer,
  NetworkArchitecture,
} from './types';

// Enums
export { ActionType as ActionTypeEnum } from './types';

// Default configurations
export { DEFAULT_RL_CONFIG, DEFAULT_ENVIRONMENT_CONFIG } from './types';
