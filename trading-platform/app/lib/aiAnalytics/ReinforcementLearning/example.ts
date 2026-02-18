/**
 * example.ts
 * 
 * Example usage of the Reinforcement Learning Trading Agent
 */

const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => { if (isDev) devLog(...args); };
const devWarn = (...args: unknown[]) => { if (isDev) devWarn(...args); };
const devError = (...args: unknown[]) => { if (isDev) devError(...args); };

import { OHLCV } from '../../../types/shared';
import {
  TradingAgent,
  TradingEnvironment,
  MultiAgentEnvironment,
  DEFAULT_RL_CONFIG,
  DEFAULT_ENVIRONMENT_CONFIG,
} from './index';
import { ActionType } from './types';

/**
 * Example 1: Basic training loop with single agent
 */
import { logger } from '@/app/core/logger';
export async function basicTrainingExample(marketData: OHLCV[]): Promise<void> {
  // Initialize agent and environment
  const agent = new TradingAgent({
    ...DEFAULT_RL_CONFIG,
    epsilon: 0.5, // Start with 50% exploration
  });

  const environment = new TradingEnvironment(marketData, {
    ...DEFAULT_ENVIRONMENT_CONFIG,
    initialCapital: 100000,
    maxSteps: 500,
  });

  // Training loop
  const numEpisodes = 10;

  for (let episode = 0; episode < numEpisodes; episode++) {
    let state = environment.reset();
    let episodeReward = 0;
    let stepCount = 0;

    while (true) {
      // Select action
      const action = agent.selectAction(state, true); // true = explore

      // Execute action in environment
      const result = environment.step(action);

      // Get policy output for logging
      const policyOutput = agent['policyNetwork'].forward(state);
      const logProb = policyOutput.logProbs[action.type];

      // Store experience
      agent.storeExperience({
        state,
        action,
        reward: result.reward,
        nextState: result.state,
        done: result.done,
        logProb,
      });

      episodeReward += result.reward;
      stepCount++;
      state = result.state;

      if (result.done) {
        break;
      }
    }

    // Learn from collected experiences (if enough data)
    if (episode > 0) {
      try {
        const metrics = await agent.learn();
        logger.info(JSON.stringify({
          reward: episodeReward.toFixed(4),
          steps: stepCount,
          epsilon: agent.getEpsilon().toFixed(3),
          policyLoss: metrics.policyLoss.toFixed(4),
          valueLoss: metrics.valueLoss.toFixed(4),
        }));
      } catch (error) {
        logger.error('Learning failed:', error instanceof Error ? error : new Error(String(error)));
      }
    }

    agent.incrementEpisode();
  }

  // Save trained model
  const model = agent.saveModel();
  
  return Promise.resolve();
}

/**
 * Example 2: Evaluate trained agent (no exploration)
 */
export function evaluateAgentExample(
  agent: TradingAgent,
  marketData: OHLCV[]
): {
  totalReturn: number;
  sharpeRatio: number;
  trades: number;
} {
  const environment = new TradingEnvironment(marketData, DEFAULT_ENVIRONMENT_CONFIG);
  
  let state = environment.reset();
  let trades = 0;

  while (true) {
    // Select action without exploration
    const action = agent.selectAction(state, false);

    if (action.type !== ActionType.HOLD) {
      trades++;
    }

    const result = environment.step(action);

    if (result.done) {
      return {
        totalReturn: result.info.totalReturn,
        sharpeRatio: result.info.sharpeRatio,
        trades,
      };
    }

    state = result.state;
  }
}

/**
 * Example 3: Multi-agent competitive training
 */
export async function multiAgentExample(marketData: OHLCV[]): Promise<void> {
  // Create multiple agents with different strategies
  const aggressiveAgent = new TradingAgent({
    ...DEFAULT_RL_CONFIG,
    epsilon: 0.8, // High exploration
  });

  const conservativeAgent = new TradingAgent({
    ...DEFAULT_RL_CONFIG,
    epsilon: 0.2, // Low exploration
  });

  // Create multi-agent environment
  const environment = new MultiAgentEnvironment(
    marketData,
    [
      { id: 'aggressive', type: 'aggressive', initialCapital: 100000 },
      { id: 'conservative', type: 'conservative', initialCapital: 100000 },
    ],
    DEFAULT_ENVIRONMENT_CONFIG
  );

  // Training episode
  const states = environment.reset();
  
  while (true) {
    // Each agent selects action
    const aggressiveAction = aggressiveAgent.selectAction(
      states.get('aggressive')!,
      true
    );
    const conservativeAction = conservativeAgent.selectAction(
      states.get('conservative')!,
      true
    );

    // Execute actions simultaneously
    const result = environment.step([
      { agentId: 'aggressive', action: aggressiveAction },
      { agentId: 'conservative', action: conservativeAction },
    ]);

    // Check if any agent is done
    if (result.dones.get('aggressive') || result.dones.get('conservative')) {
      break;
    }

    // Update states
    states.set('aggressive', result.states.get('aggressive')!);
    states.set('conservative', result.states.get('conservative')!);
  }

  // Get final leaderboard
  const leaderboard = environment.getLeaderboard();
}

/**
 * Example 4: Backtesting with saved model
 */
export function backtestExample(
  modelData: ReturnType<TradingAgent['saveModel']>,
  testData: OHLCV[]
): {
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  trades: Array<{
    date: string;
    action: string;
    price: number;
    portfolioValue: number;
  }>;
} {
  // Load saved model
  const agent = new TradingAgent();
  agent.loadModel(modelData);

  const environment = new TradingEnvironment(testData, DEFAULT_ENVIRONMENT_CONFIG);
  
  let state = environment.reset();
  const trades: Array<{
    date: string;
    action: string;
    price: number;
    portfolioValue: number;
  }> = [];

  let maxValue = environment['initialCapital'];
  let minValue = environment['initialCapital'];
  let wins = 0;
  let losses = 0;

  while (true) {
    const action = agent.selectAction(state, false);

    if (action.type !== ActionType.HOLD) {
      const currentPrice = testData[environment['currentIndex']].close;
      const actionNames = ['HOLD', 'BUY_SMALL', 'BUY_MEDIUM', 'BUY_LARGE', 'SELL_SMALL', 'SELL_MEDIUM', 'SELL_LARGE'];
      trades.push({
        date: testData[environment['currentIndex']].date,
        action: actionNames[action.type],
        price: currentPrice,
        portfolioValue: state.portfolio.portfolioValue,
      });
    }

    const result = environment.step(action);

    // Track performance
    maxValue = Math.max(maxValue, result.state.portfolio.portfolioValue);
    minValue = Math.min(minValue, result.state.portfolio.portfolioValue);

    if (result.reward > 0) wins++;
    else if (result.reward < 0) losses++;

    if (result.done) {
      const maxDrawdown = (maxValue - minValue) / maxValue;
      const winRate = wins / (wins + losses || 1);

      return {
        performance: {
          totalReturn: result.info.totalReturn,
          sharpeRatio: result.info.sharpeRatio,
          maxDrawdown,
          winRate,
        },
        trades,
      };
    }

    state = result.state;
  }
}

/**
 * Example 5: Hyperparameter tuning
 */
export async function hyperparameterTuningExample(
  marketData: OHLCV[]
): Promise<{
  bestConfig: typeof DEFAULT_RL_CONFIG;
  bestPerformance: number;
}> {
  const configs = [
    { learningRate: 0.0001, epsilon: 0.5, gamma: 0.99 },
    { learningRate: 0.0003, epsilon: 0.3, gamma: 0.95 },
    { learningRate: 0.0005, epsilon: 0.7, gamma: 0.99 },
  ];

  let bestConfig = DEFAULT_RL_CONFIG;
  let bestPerformance = -Infinity;

  for (const config of configs) {
    const agent = new TradingAgent({
      ...DEFAULT_RL_CONFIG,
      ...config,
    });

    const environment = new TradingEnvironment(marketData, DEFAULT_ENVIRONMENT_CONFIG);

    // Quick training (5 episodes)
    for (let episode = 0; episode < 5; episode++) {
      let state = environment.reset();
      
      while (true) {
        const action = agent.selectAction(state, true);
        const result = environment.step(action);

        if (result.done) {
          if (result.info.totalReturn > bestPerformance) {
            bestPerformance = result.info.totalReturn;
            bestConfig = { ...DEFAULT_RL_CONFIG, ...config };
          }
          break;
        }

        state = result.state;
      }
    }
  }


  return { bestConfig, bestPerformance };
}

/**
 * Example 6: Live trading simulation
 */
export function liveTradingSimulation(
  agent: TradingAgent,
  currentState: ReturnType<TradingEnvironment['reset']>
): {
  action: string;
  confidence: number;
  reasoning: string[];
} {
  // Get action without exploration
  const action = agent.selectAction(currentState, false);

  // Get policy output for confidence
  const policyOutput = agent['policyNetwork'].forward(currentState);
  const confidence = policyOutput.actionProbs[action.type];

  // Generate reasoning based on market state
  const reasoning: string[] = [];
  
  if (currentState.market.indicators.rsi > 70) {
    reasoning.push('RSI indicates overbought conditions');
  } else if (currentState.market.indicators.rsi < 30) {
    reasoning.push('RSI indicates oversold conditions');
  }

  if (currentState.market.indicators.macd > 0) {
    reasoning.push('MACD shows bullish momentum');
  } else {
    reasoning.push('MACD shows bearish momentum');
  }

  const currentPrice = currentState.market.prices[currentState.market.prices.length - 1];
  if (currentPrice > currentState.market.indicators.sma20) {
    reasoning.push('Price above SMA20 (bullish)');
  } else {
    reasoning.push('Price below SMA20 (bearish)');
  }

  const actionNames = ['HOLD', 'BUY_SMALL', 'BUY_MEDIUM', 'BUY_LARGE', 'SELL_SMALL', 'SELL_MEDIUM', 'SELL_LARGE'];
  
  return {
    action: actionNames[action.type],
    confidence: Math.round(confidence * 100),
    reasoning,
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Quick start example
 */
export async function quickStartExample(): Promise<void> {
  // Generate some sample market data
  const marketData: OHLCV[] = [];
  let price = 100;

  for (let i = 0; i < 1000; i++) {
    price += (Math.random() - 0.5) * 2;
    marketData.push({
      date: new Date(Date.now() - (1000 - i) * 86400000).toISOString(),
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  await basicTrainingExample(marketData);
  
}

// Uncomment to run:
// quickStartExample().catch(console.error);
