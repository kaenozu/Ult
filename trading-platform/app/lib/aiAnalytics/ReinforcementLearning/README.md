# Reinforcement Learning Trading Agent

A complete implementation of a Proximal Policy Optimization (PPO) based reinforcement learning agent for algorithmic trading.

## Overview

This module provides a fully functional RL trading system that can:
- Learn trading strategies from historical market data
- Adapt to changing market conditions
- Optimize for risk-adjusted returns (Sharpe ratio)
- Support multi-agent competitive scenarios
- Run entirely in the browser with no external ML dependencies

## Architecture

### Core Components

1. **TradingAgent** (`TradingAgent.ts`)
   - PPO-based reinforcement learning agent
   - ε-greedy exploration strategy
   - Experience replay for training
   - Model save/load functionality

2. **TradingEnvironment** (`TradingEnvironment.ts`)
   - Trading simulator with realistic market mechanics
   - Transaction costs and slippage modeling
   - Sharpe ratio-based reward function
   - Technical indicator calculations (RSI, MACD, Bollinger Bands, ATR)

3. **MultiAgentEnvironment** (`MultiAgentEnvironment.ts`)
   - Multi-agent competitive trading
   - Market impact modeling
   - Agent ranking and leaderboards

4. **PolicyNetwork** (`PolicyNetwork.ts`)
   - Neural network for action selection
   - Softmax output layer for action probabilities
   - Xavier weight initialization

5. **ValueNetwork** (`ValueNetwork.ts`)
   - Neural network for state value estimation
   - Single output for value prediction

6. **ReplayBuffer** (`ReplayBuffer.ts`)
   - Circular buffer for experience storage
   - Batch sampling for training

## Usage

### Basic Training Example

```typescript
import { TradingAgent, TradingEnvironment } from './ReinforcementLearning';

// Create agent
const agent = new TradingAgent({
  stateSize: 50,
  actionSize: 7,
  learningRate: 0.0003,
  epsilon: 0.5,
});

// Create environment with your market data
const environment = new TradingEnvironment(marketData, {
  initialCapital: 100000,
  maxSteps: 1000,
});

// Training loop
for (let episode = 0; episode < 100; episode++) {
  let state = environment.reset();
  
  while (true) {
    const action = agent.selectAction(state, true);
    const result = environment.step(action);
    
    agent.storeExperience({
      state,
      action,
      reward: result.reward,
      nextState: result.state,
      done: result.done,
      logProb: /* from policy network */,
    });
    
    if (result.done) break;
    state = result.state;
  }
  
  await agent.learn();
  agent.incrementEpisode();
}
```

### Evaluation

```typescript
// Evaluate trained agent
const agent = new TradingAgent();
agent.loadModel(savedModel);

let state = environment.reset();
while (true) {
  const action = agent.selectAction(state, false); // no exploration
  const result = environment.step(action);
  
  if (result.done) {
    console.log('Return:', result.info.totalReturn);
    console.log('Sharpe:', result.info.sharpeRatio);
    break;
  }
  
  state = result.state;
}
```

### Multi-Agent Training

```typescript
const multiEnv = new MultiAgentEnvironment(
  marketData,
  [
    { id: 'agent1', type: 'aggressive', initialCapital: 100000 },
    { id: 'agent2', type: 'conservative', initialCapital: 100000 },
  ]
);

const states = multiEnv.reset();

const result = multiEnv.step([
  { agentId: 'agent1', action: action1 },
  { agentId: 'agent2', action: action2 },
]);

const leaderboard = multiEnv.getLeaderboard();
```

## Action Space

The agent can take 7 discrete actions:

- `HOLD` - Do nothing
- `BUY_SMALL` - Buy 10% of available capital
- `BUY_MEDIUM` - Buy 25% of available capital
- `BUY_LARGE` - Buy 50% of available capital
- `SELL_SMALL` - Sell 10% of positions
- `SELL_MEDIUM` - Sell 25% of positions
- `SELL_LARGE` - Sell 50% of positions

## State Representation

The state includes:
- **Market Features**: Price history, volume, technical indicators
- **Portfolio Features**: Cash, positions, P&L
- **Normalized Vector**: 50-dimensional feature vector for neural network

Technical indicators computed:
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- SMA (Simple Moving Averages)
- Bollinger Bands
- ATR (Average True Range)

## Reward Function

The reward combines multiple factors:

1. **Portfolio Return**: Change in portfolio value
2. **Sharpe Ratio**: Risk-adjusted return (0.1x weight)
3. **Risk Penalty**: Volatility penalty (0.5x weight)
4. **Transaction Costs**: Trading fees and slippage

```
reward = portfolioReturn + sharpeRatio * 0.1 - volatility * 0.5 - transactionCost
```

## Configuration

### RL Config

```typescript
interface RLConfig {
  stateSize: number;           // Input dimensions (default: 50)
  actionSize: number;          // Number of actions (default: 7)
  learningRate: number;        // Learning rate (default: 0.0003)
  gamma: number;               // Discount factor (default: 0.99)
  epsilon: number;             // Exploration rate (default: 1.0)
  epsilonDecay: number;        // Decay rate (default: 0.995)
  epsilonMin: number;          // Minimum epsilon (default: 0.01)
  batchSize: number;           // Training batch size (default: 64)
  bufferSize: number;          // Replay buffer size (default: 10000)
  clipEpsilon: number;         // PPO clip parameter (default: 0.2)
  valueCoef: number;           // Value loss coefficient (default: 0.5)
  entropyCoef: number;         // Entropy coefficient (default: 0.01)
  ppoEpochs: number;           // PPO update epochs (default: 4)
}
```

### Environment Config

```typescript
interface EnvironmentConfig {
  initialCapital: number;      // Starting capital (default: 100000)
  maxSteps: number;            // Max steps per episode (default: 1000)
  minCapital: number;          // Min capital before termination (default: 10000)
  transactionCostRate: number; // Transaction cost (default: 0.001)
  slippageRate: number;        // Slippage (default: 0.0005)
  riskFreeRate: number;        // Risk-free rate for Sharpe (default: 0.02)
  maxPositionSize: number;     // Max position size (default: 0.3)
  symbol: string;              // Trading symbol (default: '^N225')
}
```

## Algorithm: Proximal Policy Optimization (PPO)

PPO is an on-policy reinforcement learning algorithm that:

1. **Collects Experiences**: Agent interacts with environment
2. **Computes Advantages**: Uses Generalized Advantage Estimation (GAE)
3. **Updates Policy**: Clips ratio to prevent large policy changes
4. **Updates Value**: Trains value network to predict returns

Key advantages:
- Sample efficient
- Stable training
- Simple to implement
- Works well for continuous control

## Performance Metrics

The agent tracks:
- Total return
- Sharpe ratio
- Maximum drawdown
- Win rate
- Profit factor
- Average reward
- Policy/value losses
- Entropy (exploration)

## Testing

Comprehensive test suite in `__tests__/ReinforcementLearning.test.ts`:

```bash
npm test -- ReinforcementLearning.test.ts
```

Tests cover:
- Neural network forward passes
- Buffer operations
- Agent action selection
- Environment simulation
- Multi-agent interactions

## Examples

See `example.ts` for detailed usage examples:
1. Basic training loop
2. Agent evaluation
3. Multi-agent training
4. Backtesting
5. Hyperparameter tuning
6. Live trading simulation

## Limitations

1. **Simplified Neural Networks**: Basic feedforward networks without advanced architectures
2. **No Automatic Differentiation**: Gradient computation is simplified
3. **Browser-Based**: Designed for client-side execution
4. **Single Asset**: Currently supports one trading pair at a time

## Future Enhancements

- [ ] More advanced network architectures (LSTM, Transformer)
- [ ] Automatic gradient computation
- [ ] Multi-asset portfolio optimization
- [ ] Transfer learning between markets
- [ ] Integration with TensorFlow.js
- [ ] Real-time market data streaming
- [ ] Advanced risk management features

## References

- [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347)
- [Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438)
- [Deep Reinforcement Learning for Trading](https://arxiv.org/abs/1911.10107)

## License

Part of the ULT Trading Platform project.
