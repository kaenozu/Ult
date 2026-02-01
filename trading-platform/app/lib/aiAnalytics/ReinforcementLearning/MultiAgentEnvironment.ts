/**
 * MultiAgentEnvironment.ts
 * 
 * Multi-agent trading environment for competitive/cooperative scenarios
 */

import { OHLCV } from '../../../types/shared';
import { TradingEnvironment } from './TradingEnvironment';
import {
  EnvironmentConfig,
  State,
  Action,
  AgentInfo,
  MultiAgentState,
  MultiAgentAction,
  MultiAgentStepResult,
} from './types';

/**
 * Multi-agent trading environment
 */
export class MultiAgentEnvironment {
  private agents: Map<string, {
    environment: TradingEnvironment;
    info: AgentInfo;
  }>;
  private marketData: OHLCV[];
  private config: EnvironmentConfig;
  private currentStep: number;
  private totalVolume: number;
  private marketImpact: number;

  constructor(
    marketData: OHLCV[],
    agentConfigs: Array<{
      id: string;
      type: 'aggressive' | 'conservative' | 'balanced';
      initialCapital: number;
    }>,
    config: Partial<EnvironmentConfig> = {}
  ) {
    this.marketData = marketData;
    this.config = config as EnvironmentConfig;
    this.agents = new Map();
    this.currentStep = 0;
    this.totalVolume = 0;
    this.marketImpact = 0;

    // Initialize agents
    for (const agentConfig of agentConfigs) {
      const agentEnvConfig = {
        ...config,
        initialCapital: agentConfig.initialCapital,
      };

      const environment = new TradingEnvironment(marketData, agentEnvConfig);
      const info: AgentInfo = {
        id: agentConfig.id,
        type: agentConfig.type,
        portfolio: {
          cash: agentConfig.initialCapital,
          positions: 0,
          portfolioValue: agentConfig.initialCapital,
          unrealizedPnL: 0,
          realizedPnL: 0,
        },
        performance: {
          totalReturn: 0,
          sharpeRatio: 0,
          winRate: 0,
        },
      };

      this.agents.set(agentConfig.id, { environment, info });
    }
  }

  /**
   * Reset all agent environments
   */
  reset(): Map<string, State> {
    const states = new Map<string, State>();
    this.currentStep = 0;
    this.totalVolume = 0;
    this.marketImpact = 0;

    for (const [agentId, agent] of this.agents) {
      const state = agent.environment.reset();
      states.set(agentId, state);
      
      // Reset agent info
      agent.info.portfolio.cash = this.config.initialCapital;
      agent.info.portfolio.positions = 0;
      agent.info.portfolio.portfolioValue = this.config.initialCapital;
      agent.info.portfolio.unrealizedPnL = 0;
      agent.info.portfolio.realizedPnL = 0;
      agent.info.performance.totalReturn = 0;
      agent.info.performance.sharpeRatio = 0;
      agent.info.performance.winRate = 0;
    }

    return states;
  }

  /**
   * Execute actions for all agents
   */
  step(actions: MultiAgentAction[]): MultiAgentStepResult {
    const states = new Map<string, State>();
    const rewards = new Map<string, number>();
    const dones = new Map<string, boolean>();
    const info = new Map<string, Record<string, unknown>>();

    // Compute market impact from all actions
    const totalTradeVolume = this.computeTotalTradeVolume(actions);
    this.marketImpact = this.computeMarketImpact(totalTradeVolume);

    // Execute actions for each agent
    for (const action of actions) {
      const agent = this.agents.get(action.agentId);
      if (!agent) {
        continue;
      }

      // Apply market impact to action
      const adjustedAction = this.applyMarketImpact(action.action);

      // Execute step in agent's environment
      const stepResult = agent.environment.step(adjustedAction);

      // Update agent info
      agent.info.portfolio = stepResult.state.portfolio;
      agent.info.performance.totalReturn = stepResult.info.totalReturn;
      agent.info.performance.sharpeRatio = stepResult.info.sharpeRatio;

      // Adjust reward based on competition
      const adjustedReward = this.computeCompetitiveReward(
        action.agentId,
        stepResult.reward
      );

      states.set(action.agentId, stepResult.state);
      rewards.set(action.agentId, adjustedReward);
      dones.set(action.agentId, stepResult.done);
      info.set(action.agentId, stepResult.info);
    }

    this.currentStep++;
    this.totalVolume += totalTradeVolume;

    return { states, rewards, dones, info };
  }

  /**
   * Compute total trade volume from all actions
   */
  private computeTotalTradeVolume(actions: MultiAgentAction[]): number {
    let totalVolume = 0;

    for (const action of actions) {
      const agent = this.agents.get(action.agentId);
      if (!agent) {
        continue;
      }

      // Estimate trade volume based on action size
      const portfolioValue = agent.info.portfolio.portfolioValue;
      const tradeValue = portfolioValue * action.action.size;
      totalVolume += tradeValue;
    }

    return totalVolume;
  }

  /**
   * Compute market impact from trading volume
   */
  private computeMarketImpact(tradeVolume: number): number {
    // Simple market impact model
    // Impact increases with square root of volume
    const baseVolume = this.marketData[this.currentStep]?.volume || 1000000;
    const volumeRatio = tradeVolume / baseVolume;
    return Math.sqrt(volumeRatio) * 0.001; // 0.1% impact per unit volume
  }

  /**
   * Apply market impact to action
   */
  private applyMarketImpact(action: Action): Action {
    // Market impact reduces effective action size
    const impactFactor = 1 - this.marketImpact;
    return {
      ...action,
      size: action.size * Math.max(0.5, impactFactor),
    };
  }

  /**
   * Compute competitive reward
   */
  private computeCompetitiveReward(agentId: string, baseReward: number): number {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return baseReward;
    }

    // Rank agents by performance
    const rankings = this.rankAgents();
    const rank = rankings.findIndex(id => id === agentId);
    const rankBonus = (rankings.length - rank) / rankings.length * 0.1;

    // Competitive reward = base reward + rank bonus - crowding penalty
    const crowdingPenalty = this.computeCrowdingPenalty(agentId);
    
    return baseReward + rankBonus - crowdingPenalty;
  }

  /**
   * Rank agents by total return
   */
  private rankAgents(): string[] {
    const agentArray = Array.from(this.agents.entries());
    agentArray.sort((a, b) => {
      return b[1].info.performance.totalReturn - a[1].info.performance.totalReturn;
    });
    return agentArray.map(([id]) => id);
  }

  /**
   * Compute crowding penalty
   */
  private computeCrowdingPenalty(agentId: string): number {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return 0;
    }

    // Penalty for holding similar positions to other agents
    let similarityScore = 0;
    const agentPositionRatio = agent.info.portfolio.positions / 
      (agent.info.portfolio.portfolioValue / this.getCurrentPrice());

    for (const [otherId, otherAgent] of this.agents) {
      if (otherId === agentId) {
        continue;
      }

      const otherPositionRatio = otherAgent.info.portfolio.positions /
        (otherAgent.info.portfolio.portfolioValue / this.getCurrentPrice());

      const similarity = 1 - Math.abs(agentPositionRatio - otherPositionRatio);
      similarityScore += similarity;
    }

    // Normalize by number of other agents
    const avgSimilarity = similarityScore / Math.max(1, this.agents.size - 1);
    return avgSimilarity * 0.05; // 5% max penalty
  }

  /**
   * Get current price from market data
   */
  private getCurrentPrice(): number {
    return this.marketData[this.currentStep]?.close || 0;
  }

  /**
   * Get global state
   */
  getGlobalState(): MultiAgentState {
    const agentInfoMap = new Map<string, AgentInfo>();
    
    for (const [id, agent] of this.agents) {
      agentInfoMap.set(id, agent.info);
    }

    return {
      marketState: {
        prices: this.marketData.slice(Math.max(0, this.currentStep - 20), this.currentStep + 1).map(d => d.close),
        volumes: this.marketData.slice(Math.max(0, this.currentStep - 20), this.currentStep + 1).map(d => d.volume),
        indicators: {
          rsi: 50, // Simplified
          macd: 0,
          sma20: 0,
          sma50: 0,
          bbUpper: 0,
          bbLower: 0,
          atr: 0,
        },
        timestamp: Date.now(),
      },
      agents: agentInfoMap,
      globalMetrics: {
        totalVolume: this.totalVolume,
        marketImpact: this.marketImpact,
        liquidity: this.marketData[this.currentStep]?.volume || 0,
      },
    };
  }

  /**
   * Get agent info
   */
  getAgentInfo(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId)?.info;
  }

  /**
   * Get all agent IDs
   */
  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get number of agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(): Array<{
    agentId: string;
    type: string;
    totalReturn: number;
    sharpeRatio: number;
    portfolioValue: number;
  }> {
    const rankings = this.rankAgents();
    
    return rankings.map(agentId => {
      const agent = this.agents.get(agentId);
      if (!agent) {
        return {
          agentId,
          type: 'unknown',
          totalReturn: 0,
          sharpeRatio: 0,
          portfolioValue: 0,
        };
      }

      return {
        agentId,
        type: agent.info.type,
        totalReturn: agent.info.performance.totalReturn,
        sharpeRatio: agent.info.performance.sharpeRatio,
        portfolioValue: agent.info.portfolio.portfolioValue,
      };
    });
  }
}
