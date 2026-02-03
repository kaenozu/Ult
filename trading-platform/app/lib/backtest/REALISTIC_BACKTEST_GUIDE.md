# Realistic Backtesting Guide

## Overview

This guide explains how to use the realistic backtesting features that simulate real-world trading conditions including:

- **Slippage**: Price impact from order execution
- **Commission**: Market-specific trading fees
- **Partial Fills**: Large orders filled across multiple bars
- **Latency**: Execution delays from API and network

## Quick Start

### Enable Realistic Mode

```typescript
import { AdvancedBacktestEngine, BacktestConfig } from '@/app/lib/backtest';

const config: BacktestConfig = {
  initialCapital: 1000000,
  realisticMode: true,  // Enable all realistic features
  market: 'japan',      // or 'usa'
  averageDailyVolume: 5000000,
  // ... other settings
};

const engine = new AdvancedBacktestEngine(config);
```

## Components

### 1. CommissionCalculator

Calculates market-specific trading commissions.

#### Japan Market

```typescript
import { CommissionCalculator } from '@/app/lib/backtest';

const calculator = new CommissionCalculator('japan');

// Apply broker preset
calculator.applyBrokerPreset('sbi');  // or 'rakuten'

// Calculate commission
const result = calculator.calculateCommission(
  1000,  // price
  100,   // quantity
  'BUY'
);

console.log(`Commission: ¥${result.commission}`);
console.log(`Effective Rate: ${result.effectiveRate}%`);
```

**Default Japan Settings:**
- Base commission: 0.22% (including 10% consumption tax)
- Minimum commission: 0 yen (broker-dependent)
- Tax: 10%

#### USA Market

```typescript
const calculator = new CommissionCalculator('usa');

// Apply broker preset
calculator.applyBrokerPreset('interactive_brokers');  // or 'charles_schwab'

// Calculate with FX fee
const result = calculator.calculateCommission(
  100,   // price
  100,   // quantity
  'SELL',
  true   // include FX fee
);

console.log(`Commission: $${result.commission}`);
console.log(`SEC Fee: $${result.breakdown.secFee}`);
console.log(`TAF Fee: $${result.breakdown.tafFee}`);
```

**Default USA Settings:**
- Per-share fee: $0.005
- SEC Fee: 0.00051% (sell only)
- TAF Fee: $0.000119/share (sell only)
- FX conversion: 0.15%

### 2. SlippageModel

Calculates realistic slippage based on multiple factors.

```typescript
import { SlippageModel } from '@/app/lib/backtest';

const model = new SlippageModel({
  baseSlippage: 0.05,           // 0.05%
  spread: 0.01,                 // 0.01%
  averageDailyVolume: 5000000,
  useTimeOfDaySlippage: true,   // Higher at open/close
  useVolatilitySlippage: true,  // Higher during volatility
  useOrderSizeImpact: true,     // Larger orders = more slippage
  marketImpactModel: 'square_root',
});

const result = model.calculateSlippage(
  1000,    // price
  'BUY',   // side
  1000,    // quantity
  ohlcvData
);

console.log(`Slippage: ${result.slippageRate}%`);
console.log(`Adjusted Price: ${result.adjustedPrice}`);
```

**Slippage Factors:**

1. **Base Slippage**: 0.05-0.1% depending on market
2. **Spread**: Bid-ask spread impact
3. **Time of Day**:
   - Market open (9:00-10:00): +50% slippage
   - Market close (15:00-15:30): +30% slippage
   - Lunch (11:30-12:30): +20% slippage
4. **Volatility**: +0.01-0.03% during high volatility
5. **Order Size**: Square root of (order size / daily volume)

### 3. PartialFillSimulator

Simulates partial order fills for large orders.

```typescript
import { PartialFillSimulator } from '@/app/lib/backtest';

const simulator = new PartialFillSimulator({
  liquidityThreshold: 0.1,        // 10% of volume
  fillRateModel: 'exponential',   // or 'linear', 'custom'
  minImmediateFillRate: 0.2,      // Min 20% filled immediately
  remainingOrderStrategy: 'next_bar',
  maxQueueDuration: 3,            // Max 3 bars in queue
});

const result = simulator.simulateFill(
  1000,       // price
  200000,     // quantity (20% of volume)
  'BUY',
  ohlcvBar,
  barIndex
);

console.log(`Fill Rate: ${result.fillRate * 100}%`);
console.log(`Filled: ${result.filledQuantity}`);
console.log(`Remaining: ${result.remainingQuantity}`);
console.log(`Market Impact: ${result.marketImpact}%`);
```

**Fill Rate Models:**

- **Linear**: Decreases linearly with order size
- **Exponential**: Decreases exponentially (more realistic)
- **Custom**: Provide your own function

### 4. LatencySimulator

Simulates execution delays.

```typescript
import { LatencySimulator, getLatencyPreset } from '@/app/lib/backtest';

// Use preset
const simulator = new LatencySimulator(getLatencyPreset('retail'));

// Or custom config
const simulator = new LatencySimulator({
  apiLatency: {
    min: 100,
    max: 500,
    distribution: 'normal',
  },
  marketDataLatency: {
    realtime: 0,
    delayed: 900000,  // 15 minutes
    isRealtime: false,
  },
  executionLatency: {
    min: 1000,
    max: 3000,
    distribution: 'normal',
  },
});

const result = simulator.calculateLatency();

console.log(`Total Latency: ${result.totalLatency}ms`);
console.log(`API: ${result.breakdown.api}ms`);
console.log(`Execution: ${result.breakdown.execution}ms`);
console.log(`Latency Slippage: ${result.latencySlippage}%`);
```

**Latency Presets:**

| Preset | API | Execution | Market Data | Use Case |
|--------|-----|-----------|-------------|----------|
| low | 1-10ms | 10-50ms | Realtime | Colocation |
| medium | 50-200ms | 500-2000ms | Realtime | Standard API |
| high | 200-1000ms | 2-5s | Realtime | Slow network |
| retail | 100-500ms | 1-3s | 15min delay | Retail trader |
| institutional | 10-100ms | 100-500ms | Realtime | Pro trader |

## Complete Example

```typescript
import {
  AdvancedBacktestEngine,
  Strategy,
  StrategyContext,
  StrategyAction,
  CommissionCalculator,
  SlippageModel,
} from '@/app/lib/backtest';

// 1. Configure realistic backtest
const config = {
  initialCapital: 1000000,
  realisticMode: true,
  market: 'japan' as const,
  averageDailyVolume: 5000000,
  slippageEnabled: true,
  commissionEnabled: true,
  partialFillEnabled: true,
  latencyEnabled: true,
  latencyMs: 500,
  // ... other settings
};

// 2. Create strategy
const strategy: Strategy = {
  name: 'SMA Crossover',
  description: 'Simple moving average crossover',
  
  onData: (data, index, context) => {
    // Your strategy logic
    return { action: 'HOLD' };
  },
};

// 3. Run backtest
const engine = new AdvancedBacktestEngine(config);
engine.loadData('SYMBOL', historicalData);
const result = await engine.runBacktest(strategy, 'SYMBOL');

// 4. Analyze results
console.log('Results:', result.metrics);
console.log('Total Fees:', result.trades.reduce((sum, t) => sum + t.fees, 0));
```

## Comparison: Ideal vs Realistic

```typescript
import { compareRealisticVsIdeal } from '@/app/lib/backtest/RealisticBacktestExample';

await compareRealisticVsIdeal(historicalData, strategy);

// Output:
// Metric                  | Ideal        | Realistic    | Difference
// ------------------------|--------------|--------------|------------
// Total Return           | 45.50%       | 38.20%       | -7.30%
// Sharpe Ratio           | 2.15         | 1.89         | -0.26
// Win Rate               | 62.50%       | 60.10%       | -2.40%
// Max Drawdown           | 15.20%       | 16.80%       | +1.60%
```

## Best Practices

### 1. Always Use Realistic Mode for Production Strategies

```typescript
// ❌ Don't use ideal conditions for real trading
const config = { realisticMode: false };

// ✅ Use realistic conditions
const config = { realisticMode: true };
```

### 2. Set Appropriate Average Daily Volume

```typescript
// Large-cap stock (highly liquid)
averageDailyVolume: 50000000,

// Mid-cap stock
averageDailyVolume: 5000000,

// Small-cap stock (low liquidity)
averageDailyVolume: 100000,
```

### 3. Choose Correct Broker Preset

```typescript
const calculator = new CommissionCalculator('japan');

// Match your actual broker
calculator.applyBrokerPreset('sbi');      // SBI Securities
calculator.applyBrokerPreset('rakuten');  // Rakuten Securities
```

### 4. Account for Latency Based on Your Setup

```typescript
// High-frequency trading (colocation)
getLatencyPreset('low');

// Retail API trading
getLatencyPreset('retail');

// Institutional with direct feed
getLatencyPreset('institutional');
```

## Performance Impact

Enabling realistic mode typically shows:

- **Return**: 10-20% lower (more realistic)
- **Sharpe Ratio**: 0.1-0.2 decrease
- **Win Rate**: 2-5% lower
- **Max Drawdown**: Similar or slightly worse

This is **expected and desired** - it prevents overfitting and sets realistic expectations.

## Advanced Usage

### Custom Slippage Function

```typescript
const simulator = new PartialFillSimulator({
  fillRateModel: 'custom',
  customFillRateFunction: (orderSizeRatio) => {
    // Your custom logic
    return Math.max(0.1, 1 - orderSizeRatio * 2);
  },
});
```

### Multi-Bar Fill Simulation

```typescript
import { simulateMultiBarFill } from '@/app/lib/backtest';

const result = simulateMultiBarFill(
  price,
  largeQuantity,
  'BUY',
  bars,
  startIndex,
  simulator
);

console.log(`Filled across ${result.barsUsed} bars`);
console.log(`Average fill price: ${result.averagePrice}`);
```

### Liquidity-Adjusted Configuration

```typescript
import { adjustConfigForLiquidity } from '@/app/lib/backtest';

// High liquidity (0.9)
const highLiqConfig = adjustConfigForLiquidity(0.9);

// Low liquidity (0.2)
const lowLiqConfig = adjustConfigForLiquidity(0.2);
```

## Troubleshooting

### Issue: Too many partial fills

**Solution**: Increase liquidity threshold or reduce order size

```typescript
partialFillSimulator.updateConfig({
  liquidityThreshold: 0.2,  // Increase from 0.1
});
```

### Issue: Unrealistic commissions

**Solution**: Verify broker preset and market

```typescript
calculator.applyBrokerPreset('sbi');  // Make sure correct broker
const config = calculator.getConfig();
console.log(config);  // Verify settings
```

### Issue: High slippage costs

**Solution**: Adjust base slippage or market impact model

```typescript
slippageModel.updateConfig({
  baseSlippage: 0.03,  // Reduce from 0.05
  marketImpactModel: 'linear',  // Less aggressive than square_root
});
```

## References

- [SlippageModel API](./SlippageModel.ts)
- [CommissionCalculator API](./CommissionCalculator.ts)
- [PartialFillSimulator API](./PartialFillSimulator.ts)
- [LatencySimulator API](./LatencySimulator.ts)
- [Example Usage](./RealisticBacktestExample.ts)
