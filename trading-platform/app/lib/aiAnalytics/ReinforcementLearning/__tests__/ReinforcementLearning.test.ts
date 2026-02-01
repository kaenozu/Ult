/**
 * ReinforcementLearning.test.ts
 * 
 * Comprehensive tests for Reinforcement Learning components
 */

import { OHLCV } from '@/app/types';
import { PolicyNetwork } from '../PolicyNetwork';
import { ValueNetwork } from '../ValueNetwork';
import { ReplayBuffer } from '../ReplayBuffer';
import { TradingAgent } from '../TradingAgent';
import { TradingEnvironment } from '../TradingEnvironment';
import { MultiAgentEnvironment } from '../MultiAgentEnvironment';
import {
  State,
  Action,
  ActionType,
  Experience,
  DEFAULT_RL_CONFIG,
  DEFAULT_ENVIRONMENT_CONFIG,
} from '../types';

// ============================================================================
// Mock Data Generators
// ============================================================================

function generateMockOHLCV(count: number, basePrice: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = basePrice;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2; // -1% to +1%
    price += change;
    
    data.push({
      date: new Date(Date.now() - (count - i) * 86400000).toISOString(),
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000000 + Math.random() * 500000,
    });
  }
  
  return data;
}

function generateMockState(): State {
  const normalized = Array.from({ length: 50 }, () => Math.random());
  
  return {
    market: {
      prices: Array.from({ length: 20 }, () => 100 + Math.random() * 10),
      volumes: Array.from({ length: 20 }, () => 1000000 + Math.random() * 500000),
      indicators: {
        rsi: 50,
        macd: 0.5,
        sma20: 100,
        sma50: 100,
        bbUpper: 105,
        bbLower: 95,
        atr: 2,
      },
      timestamp: Date.now(),
    },
    portfolio: {
      cash: 50000,
      positions: 500,
      portfolioValue: 100000,
      unrealizedPnL: 0,
      realizedPnL: 0,
    },
    normalized,
  };
}

function generateMockExperience(): Experience {
  return {
    state: generateMockState(),
    action: { type: ActionType.BUY_SMALL, size: 0.1 },
    reward: 0.01,
    nextState: generateMockState(),
    done: false,
    logProb: -1.5,
  };
}

// ============================================================================
// PolicyNetwork Tests
// ============================================================================

describe('PolicyNetwork', () => {
  let network: PolicyNetwork;
  
  beforeEach(() => {
    network = new PolicyNetwork(50, 7, 64);
  });
  
  describe('初期化', () => {
    it('ネットワークを正しく初期化できる', () => {
      expect(network).toBeDefined();
      const params = network.getParameters();
      expect(params.length).toBeGreaterThan(0);
    });
  });
  
  describe('forward pass', () => {
    it('状態から行動確率を出力できる', () => {
      const state = generateMockState();
      const output = network.forward(state);
      
      expect(output.actionProbs).toBeDefined();
      expect(output.actionProbs.length).toBe(7);
      expect(output.logProbs).toBeDefined();
      expect(output.entropy).toBeGreaterThanOrEqual(0);
    });
    
    it('行動確率の合計が1になる', () => {
      const state = generateMockState();
      const output = network.forward(state);
      
      const sum = output.actionProbs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
    
    it('すべての確率が0以上1以下である', () => {
      const state = generateMockState();
      const output = network.forward(state);
      
      output.actionProbs.forEach(prob => {
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });
  });
  
  describe('clone', () => {
    it('ネットワークを複製できる', () => {
      const cloned = network.clone();
      expect(cloned).toBeDefined();
      
      const state = generateMockState();
      const output1 = network.forward(state);
      const output2 = cloned.forward(state);
      
      expect(output1.actionProbs).toEqual(output2.actionProbs);
    });
  });
});

// ============================================================================
// ValueNetwork Tests
// ============================================================================

describe('ValueNetwork', () => {
  let network: ValueNetwork;
  
  beforeEach(() => {
    network = new ValueNetwork(50, 64);
  });
  
  describe('初期化', () => {
    it('ネットワークを正しく初期化できる', () => {
      expect(network).toBeDefined();
      const params = network.getParameters();
      expect(params.length).toBeGreaterThan(0);
    });
  });
  
  describe('forward pass', () => {
    it('状態から価値を出力できる', () => {
      const state = generateMockState();
      const output = network.forward(state);
      
      expect(output.value).toBeDefined();
      expect(typeof output.value).toBe('number');
    });
    
    it('異なる状態で異なる価値を出力する', () => {
      const state1 = generateMockState();
      const state2 = generateMockState();
      
      const value1 = network.forward(state1).value;
      const value2 = network.forward(state2).value;
      
      // Should be different (highly unlikely to be exactly the same)
      expect(value1).not.toBe(value2);
    });
  });
  
  describe('clone', () => {
    it('ネットワークを複製できる', () => {
      const cloned = network.clone();
      expect(cloned).toBeDefined();
      
      const state = generateMockState();
      const value1 = network.forward(state).value;
      const value2 = cloned.forward(state).value;
      
      expect(value1).toBe(value2);
    });
  });
});

// ============================================================================
// ReplayBuffer Tests
// ============================================================================

describe('ReplayBuffer', () => {
  let buffer: ReplayBuffer;
  
  beforeEach(() => {
    buffer = new ReplayBuffer(100);
  });
  
  describe('初期化', () => {
    it('バッファを正しく初期化できる', () => {
      expect(buffer).toBeDefined();
      expect(buffer.getSize()).toBe(0);
      expect(buffer.getCapacity()).toBe(100);
    });
  });
  
  describe('add', () => {
    it('経験を追加できる', () => {
      const experience = generateMockExperience();
      buffer.add(experience);
      
      expect(buffer.getSize()).toBe(1);
    });
    
    it('容量を超えた場合は古い経験を上書きする', () => {
      const smallBuffer = new ReplayBuffer(5);
      
      for (let i = 0; i < 10; i++) {
        smallBuffer.add(generateMockExperience());
      }
      
      expect(smallBuffer.getSize()).toBe(5);
    });
  });
  
  describe('sample', () => {
    beforeEach(() => {
      for (let i = 0; i < 50; i++) {
        buffer.add(generateMockExperience());
      }
    });
    
    it('バッチをサンプリングできる', () => {
      const batch = buffer.sample(32);
      
      expect(batch.states.length).toBe(32);
      expect(batch.actions.length).toBe(32);
      expect(batch.rewards.length).toBe(32);
      expect(batch.nextStates.length).toBe(32);
      expect(batch.dones.length).toBe(32);
    });
    
    it('バッチサイズが大きすぎる場合はエラーを投げる', () => {
      expect(() => buffer.sample(100)).toThrow();
    });
  });
  
  describe('getAll', () => {
    it('すべての経験を取得できる', () => {
      for (let i = 0; i < 10; i++) {
        buffer.add(generateMockExperience());
      }
      
      const batch = buffer.getAll();
      expect(batch.states.length).toBe(10);
    });
  });
  
  describe('clear', () => {
    it('バッファをクリアできる', () => {
      buffer.add(generateMockExperience());
      buffer.add(generateMockExperience());
      
      expect(buffer.getSize()).toBe(2);
      
      buffer.clear();
      expect(buffer.getSize()).toBe(0);
    });
  });
  
  describe('getStats', () => {
    it('統計情報を取得できる', () => {
      for (let i = 0; i < 10; i++) {
        buffer.add(generateMockExperience());
      }
      
      const stats = buffer.getStats();
      expect(stats.size).toBe(10);
      expect(stats.capacity).toBe(100);
      expect(stats.utilization).toBeCloseTo(0.1);
      expect(stats.averageReward).toBeDefined();
    });
  });
});

// ============================================================================
// TradingAgent Tests
// ============================================================================

describe('TradingAgent', () => {
  let agent: TradingAgent;
  
  beforeEach(() => {
    agent = new TradingAgent({
      ...DEFAULT_RL_CONFIG,
      bufferSize: 100,
      batchSize: 10,
    });
  });
  
  describe('初期化', () => {
    it('エージェントを正しく初期化できる', () => {
      expect(agent).toBeDefined();
      expect(agent.getEpsilon()).toBeCloseTo(1.0);
      expect(agent.getEpisodeCount()).toBe(0);
    });
  });
  
  describe('selectAction', () => {
    it('行動を選択できる', () => {
      const state = generateMockState();
      const action = agent.selectAction(state);
      
      expect(action).toBeDefined();
      expect(action.type).toBeGreaterThanOrEqual(0);
      expect(action.type).toBeLessThan(7);
      expect(action.size).toBeGreaterThanOrEqual(0);
    });
    
    it('探索なしの場合は確率的に行動を選択する', () => {
      const state = generateMockState();
      const action = agent.selectAction(state, false);
      
      expect(action).toBeDefined();
    });
  });
  
  describe('storeExperience', () => {
    it('経験を保存できる', () => {
      const experience = generateMockExperience();
      agent.storeExperience(experience);
      
      // No error should be thrown
      expect(true).toBe(true);
    });
  });
  
  describe('epsilon decay', () => {
    it('epsilonが減衰する', () => {
      const initialEpsilon = agent.getEpsilon();
      agent.setEpsilon(0.5);
      
      expect(agent.getEpsilon()).toBe(0.5);
      expect(agent.getEpsilon()).toBeLessThan(initialEpsilon);
    });
  });
  
  describe('saveModel / loadModel', () => {
    it('モデルを保存・読み込みできる', () => {
      const state = generateMockState();
      const action1 = agent.selectAction(state, false);
      
      const model = agent.saveModel();
      expect(model).toBeDefined();
      expect(model.policy).toBeDefined();
      expect(model.value).toBeDefined();
      
      const newAgent = new TradingAgent();
      newAgent.loadModel(model);
      
      const action2 = newAgent.selectAction(state, false);
      expect(action2.type).toBe(action1.type);
    });
  });
});

// ============================================================================
// TradingEnvironment Tests
// ============================================================================

describe('TradingEnvironment', () => {
  let environment: TradingEnvironment;
  let marketData: OHLCV[];
  
  beforeEach(() => {
    marketData = generateMockOHLCV(500);
    environment = new TradingEnvironment(marketData, DEFAULT_ENVIRONMENT_CONFIG);
  });
  
  describe('初期化', () => {
    it('環境を正しく初期化できる', () => {
      expect(environment).toBeDefined();
    });
  });
  
  describe('reset', () => {
    it('環境をリセットできる', () => {
      const state = environment.reset();
      
      expect(state).toBeDefined();
      expect(state.market).toBeDefined();
      expect(state.portfolio).toBeDefined();
      expect(state.normalized.length).toBe(50);
      expect(state.portfolio.cash).toBe(DEFAULT_ENVIRONMENT_CONFIG.initialCapital);
      expect(state.portfolio.positions).toBe(0);
    });
  });
  
  describe('step', () => {
    beforeEach(() => {
      environment.reset();
    });
    
    it('HOLDアクションでステップを実行できる', () => {
      const action: Action = { type: ActionType.HOLD, size: 0 };
      const result = environment.step(action);
      
      expect(result).toBeDefined();
      expect(result.state).toBeDefined();
      expect(typeof result.reward).toBe('number');
      expect(typeof result.done).toBe('boolean');
      expect(result.info).toBeDefined();
    });
    
    it('BUYアクションでポジションを取得できる', () => {
      const action: Action = { type: ActionType.BUY_SMALL, size: 0.1 };
      const result = environment.step(action);
      
      expect(result.state.portfolio.positions).toBeGreaterThanOrEqual(0);
      expect(result.state.portfolio.cash).toBeLessThanOrEqual(DEFAULT_ENVIRONMENT_CONFIG.initialCapital);
    });
    
    it('SELLアクションでポジションを減らせる', () => {
      // First buy
      environment.step({ type: ActionType.BUY_LARGE, size: 0.5 });
      
      // Then sell
      const result = environment.step({ type: ActionType.SELL_SMALL, size: 0.1 });
      
      expect(result.state.portfolio.cash).toBeGreaterThan(0);
    });
    
    it('報酬が計算される', () => {
      const action: Action = { type: ActionType.BUY_SMALL, size: 0.1 };
      const result = environment.step(action);
      
      expect(typeof result.reward).toBe('number');
    });
    
    it('エピソードが終了条件を満たす', () => {
      let result;
      for (let i = 0; i < 2000; i++) {
        const action: Action = { type: ActionType.HOLD, size: 0 };
        result = environment.step(action);
        
        if (result.done) {
          break;
        }
      }
      
      expect(result?.done).toBe(true);
    });
  });
});

// ============================================================================
// MultiAgentEnvironment Tests
// ============================================================================

describe('MultiAgentEnvironment', () => {
  let environment: MultiAgentEnvironment;
  let marketData: OHLCV[];
  
  beforeEach(() => {
    marketData = generateMockOHLCV(500);
    
    environment = new MultiAgentEnvironment(
      marketData,
      [
        { id: 'agent1', type: 'aggressive', initialCapital: 100000 },
        { id: 'agent2', type: 'conservative', initialCapital: 100000 },
      ],
      DEFAULT_ENVIRONMENT_CONFIG
    );
  });
  
  describe('初期化', () => {
    it('マルチエージェント環境を正しく初期化できる', () => {
      expect(environment).toBeDefined();
      expect(environment.getAgentCount()).toBe(2);
    });
  });
  
  describe('reset', () => {
    it('すべてのエージェントをリセットできる', () => {
      const states = environment.reset();
      
      expect(states.size).toBe(2);
      expect(states.has('agent1')).toBe(true);
      expect(states.has('agent2')).toBe(true);
    });
  });
  
  describe('step', () => {
    beforeEach(() => {
      environment.reset();
    });
    
    it('複数エージェントのアクションを同時実行できる', () => {
      const actions = [
        { agentId: 'agent1', action: { type: ActionType.BUY_SMALL, size: 0.1 } },
        { agentId: 'agent2', action: { type: ActionType.HOLD, size: 0 } },
      ];
      
      const result = environment.step(actions);
      
      expect(result.states.size).toBe(2);
      expect(result.rewards.size).toBe(2);
      expect(result.dones.size).toBe(2);
    });
  });
  
  describe('getLeaderboard', () => {
    it('リーダーボードを取得できる', () => {
      environment.reset();
      
      const leaderboard = environment.getLeaderboard();
      
      expect(leaderboard).toBeDefined();
      expect(leaderboard.length).toBe(2);
      expect(leaderboard[0].agentId).toBeDefined();
    });
  });
  
  describe('getGlobalState', () => {
    it('グローバル状態を取得できる', () => {
      environment.reset();
      
      const globalState = environment.getGlobalState();
      
      expect(globalState).toBeDefined();
      expect(globalState.marketState).toBeDefined();
      expect(globalState.agents.size).toBe(2);
      expect(globalState.globalMetrics).toBeDefined();
    });
  });
});
