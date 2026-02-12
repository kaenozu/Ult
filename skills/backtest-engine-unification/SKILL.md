# Backtest Engine Unification Skill

## Overview

This skill provides guidance for unifying duplicate backtest engines in the ULT Trading Platform. The pattern demonstrated here successfully merged `WinningBacktestEngine` into `RealisticBacktestEngine`, eliminating code duplication and maintenance overhead.

## When to Use This Skill

- When you find duplicate or overlapping functionality between two similar engines/services
- When refactoring to consolidate multiple implementations into one
- When deprecating an old engine in favor of a new one
- When code review identifies "logic divergence risks" from duplicate implementations

## The Problem Pattern

### Anti-Pattern: Duplicate Engines
```typescript
// Bad: Two engines with overlapping functionality
class WinningBacktestEngine {
  // Has: Advanced metrics calculation (Sharpe, Sortino, etc.)
  // Lacks: Realistic slippage simulation
}

class RealisticBacktestEngine {
  // Has: Market impact, partial fills, latency simulation
  // Lacks: Comprehensive metrics
}
```

**Problems:**
- Logic divergence: Bug fixes in one don't apply to the other
- Double maintenance burden
- Confusion about which to use
- Incomplete feature set in each

## The Solution Pattern

### Phase 1: Identify Unique Features

Analyze both engines to identify:
1. **Base features** (common to both) - keep in unified engine
2. **Unique features** from Engine A - migrate to unified engine
3. **Unique features** from Engine B - already in unified engine

```typescript
// WinningBacktestEngine unique features:
- calculateSkewness()
- calculateKurtosis()
- calculateUlcerIndex()
- runWalkForwardAnalysis()
- runMonteCarloSimulation()
- compareStrategies()
- Kelly criterion calculation
- SQN calculation
- Consecutive win/loss tracking

// RealisticBacktestEngine features (keep as base):
- Market impact modeling
- Time-of-day slippage
- Volatility-based slippage
- Tiered commission structure
- Order book simulation
- Transaction cost analysis
```

### Phase 2: Extend the Target Engine

Add missing features to the superior engine (usually the more modern/realistic one):

```typescript
// In RealisticBacktestEngine.ts

// 1. Add new types
export interface WalkForwardResult {
  inSample: RealisticBacktestResult;
  outOfSample: RealisticBacktestResult;
  robustnessScore: number;
  parameterStability: number;
}

export interface MonteCarloResult {
  originalResult: RealisticBacktestResult;
  simulations: RealisticBacktestResult[];
  probabilityOfProfit: number;
  confidenceIntervals: {
    returns: { lower: number; upper: number };
    drawdown: { lower: number; upper: number };
    sharpe: { lower: number; upper: number };
  };
}

// 2. Add new calculation methods
private calculateSkewness(returns: number[]): number {
  if (returns.length < 3) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
}

// 3. Add analysis methods
async runWalkForwardAnalysis(
  strategy: Strategy,
  symbol: string,
  trainSize: number = 252,
  testSize: number = 63
): Promise<WalkForwardResult[]> {
  // Implementation
}

runMonteCarloSimulation(
  originalResult: RealisticBacktestResult,
  numSimulations: number = 1000
): MonteCarloResult {
  // Implementation
}
```

### Phase 3: Update Dependent Code

Update all files that imported the old engine:

```typescript
// Before
import WinningBacktestEngine, { BacktestResult } from './backtest/WinningBacktestEngine';

// After
import { RealisticBacktestEngine, RealisticBacktestResult } from './backtest/RealisticBacktestEngine';

type BacktestResult = RealisticBacktestResult; // Type alias for compatibility
```

### Phase 4: Delete the Old Engine

**Important**: Don't just deprecate - actually delete the file!

```bash
rm /path/to/WinningBacktestEngine.ts
```

This forces compilation errors for any missed imports.

### Phase 5: Update Exports

Remove exports from index files:

```typescript
// app/lib/backtest/index.ts
// Before:
export * from './WinningBacktestEngine';

// After:
// WinningBacktestEngine is deprecated - use RealisticBacktestEngine instead
// export * from './WinningBacktestEngine';
```

## Critical Implementation Details

### 1. Type Compatibility

Ensure type compatibility by adding optional properties:

```typescript
export interface RealisticTradeMetrics extends Trade {
  // Existing properties
  marketImpact: number;
  effectiveSlippage: number;
  
  // Add these for backward compatibility
  strategy?: string;
  holdingPeriods?: number;
  riskRewardRatio?: number;
}
```

### 2. Async Method Updates

When methods become async, update call sites:

```typescript
// Before
runBacktest(symbol: string, data: OHLCV[], strategy: StrategyType): BacktestResult {
  const engine = new WinningBacktestEngine();
  return engine.runBacktest(alignedResults, data, symbol);
}

// After
async runBacktest(symbol: string, data: OHLCV[], strategy: StrategyType): Promise<BacktestResult> {
  const engine = new RealisticBacktestEngine(config);
  engine.loadData(symbol, data);
  return await engine.runBacktest(strategyWrapper, symbol);
}
```

### 3. Metrics Calculation Consolidation

Ensure all metrics are calculated in the unified engine:

```typescript
// In calculateMetrics() method:
const avgHoldingPeriod = this.calculateAvgHoldingPeriod(trades);
const { maxConsecutiveWins, maxConsecutiveLosses } = this.calculateMaxConsecutive(trades);
const expectancy = this.calculateExpectancy(winRate, averageWin, averageLoss);
const skewness = this.calculateSkewness(returns);
const kurtosis = this.calculateKurtosis(returns);
const ulcerIndex = this.calculateUlcerIndex(equityCurve);

// Return comprehensive metrics
return {
  // ... standard metrics ...
  avgHoldingPeriod,
  maxConsecutiveWins,
  maxConsecutiveLosses,
  expectancy,
  skewness,
  kurtosis,
  ulcerIndex,
  // ... etc
};
```

## Testing Strategy

1. **Unit Tests**: Ensure existing tests pass
   ```bash
   npm test -- --testPathPattern="RealisticBacktestEngine"
   ```

2. **Type Checking**: Verify no TypeScript errors
   ```bash
   npx tsc --noEmit
   ```

3. **Integration Tests**: Test dependent systems
   - WinningTradingSystem
   - WinningAnalytics
   - Any UI components using backtest results

## Migration Checklist

- [ ] Identify all files importing the old engine
- [ ] Migrate unique features to the unified engine
- [ ] Update type definitions for compatibility
- [ ] Update all import statements
- [ ] Handle async/sync method changes
- [ ] Delete old engine files (don't leave deprecated code)
- [ ] Update index.ts exports
- [ ] Run all tests
- [ ] Run type checking
- [ ] Create PR with migration guide

## Common Pitfalls

### ❌ Don't: Leave deprecated code
```typescript
// BAD - This allows continued use
constructor() {
  console.warn('Deprecated, use RealisticBacktestEngine');
}
```

### ✅ Do: Hard delete
```bash
# GOOD - Forces migration
rm WinningBacktestEngine.ts
```

### ❌ Don't: Break API compatibility unnecessarily
```typescript
// BAD - Different return type
runBacktest(): Promise<RealisticBacktestResult>
// vs
runBacktest(): BacktestResult
```

### ✅ Do: Use type aliases
```typescript
// GOOD - Maintains compatibility
type BacktestResult = RealisticBacktestResult;
```

### ❌ Don't: Forget to handle optional properties
```typescript
// BAD - Type error
trades.map(t => t.strategy) // Property 'strategy' does not exist
```

### ✅ Do: Add optional properties with safe access
```typescript
// GOOD - Type safe
trades.map(t => t.strategy || 'default')
```

## Success Metrics

After unification:
- ✅ Single source of truth for backtesting logic
- ✅ All features from both engines available
- ✅ No duplicate code
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Clear migration path documented

## Example PR

See: https://github.com/kaenozu/Ult/pull/765

This PR demonstrates:
- Complete removal of duplicate engine
- Feature consolidation
- Type compatibility maintenance
- Test preservation
- Clear documentation

## When NOT to Use This Pattern

- When engines serve fundamentally different purposes
- When migration cost exceeds maintenance savings
- When backward compatibility is critical and cannot be maintained
- When engines are actively being developed in different directions

## Related Skills

- `/skill refactor-deprecated-code`
- `/skill migrate-types`
- `/skill consolidate-services`
