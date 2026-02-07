# AI Behavioral Bias Warning System

## Overview

The AI Behavioral Bias Warning System is a comprehensive trading discipline enforcement feature that helps prevent emotional and revenge trading by analyzing trading patterns and blocking or warning about potentially harmful trades.

## Features

### 1. Consecutive Loss Detection
- **Monitoring**: Tracks consecutive winning and losing trades
- **Warning Threshold**: Shows warning after 3 consecutive losses
- **Block Threshold**: Blocks all trades after 5 consecutive losses
- **Purpose**: Prevents traders from making impulsive decisions during losing streaks

### 2. Revenge Trading Prevention
- **Detection**: Monitors position size increases during drawdown periods
- **Block Threshold**: Blocks trades that increase position size by >50% during 2+ consecutive losses
- **Warning Threshold**: Shows confirmation dialog for 20-50% increases during drawdown
- **Purpose**: Prevents traders from "doubling down" to recover losses

### 3. Over-Trading Detection
- **Monitoring**: Tracks number of trades per day
- **Warning Threshold**: Shows confirmation after reaching daily trade limit (default: 20 trades)
- **Purpose**: Prevents excessive trading that often leads to overtrading and losses

### 4. Risk Management
- **Position Size Validation**: Compares order size against recommended position based on risk tolerance
- **Warning**: Shows confirmation when position exceeds 2x recommended size
- **Risk Tolerance Adjustment**: Automatically adjusts based on recent performance

### 5. Emotional State Monitoring
- **Risk Tolerance Tracking**: Monitors changes in risk tolerance
- **Warning**: Alerts when risk tolerance becomes extreme (too high or too low)
- **Purpose**: Identifies emotional trading patterns

## Architecture

### Components

#### 1. `BehavioralBiasGuard` (Core Logic)
- **Location**: `app/lib/trading/behavioralBiasGuard.ts`
- **Responsibility**: Validates orders against behavioral bias rules
- **Key Methods**:
  - `validateOrder()`: Main validation function
  - `analyzePositionSize()`: Checks for revenge trading
  - `calculateRecommendedPositionSize()`: Risk-based position sizing

#### 2. `PsychologyMonitor` (State Tracking)
- **Location**: `app/lib/trading/psychology.ts`
- **Responsibility**: Tracks psychology state and generates warnings
- **Key Features**:
  - Consecutive wins/losses tracking
  - Risk tolerance adjustment
  - Warning generation

#### 3. `BehavioralWarningModal` (UI)
- **Location**: `app/components/BehavioralWarningModal.tsx`
- **Responsibility**: Displays warnings and blocks to users
- **Features**:
  - Severity-based styling (high/medium/low)
  - Blocking vs confirmation modes
  - Detailed recommendations

#### 4. `useGuardedOrderExecution` (Integration Hook)
- **Location**: `app/hooks/useGuardedOrderExecution.ts`
- **Responsibility**: Integrates behavioral checks with order execution
- **Usage**: Replace direct order execution with guarded execution

#### 5. `BehavioralWarningProvider` (Provider Component)
- **Location**: `app/components/BehavioralWarningProvider.tsx`
- **Responsibility**: Provides modal at application root
- **Integration**: Wrapped in `layout.tsx`

### Stores

#### 1. `behavioralWarningStore`
- **Location**: `app/store/behavioralWarningStore.ts`
- **State**:
  - `isModalOpen`: Modal visibility
  - `currentWarnings`: Active warnings
  - `isBlocked`: Whether trade is blocked
  - `pendingOrder`: Order waiting for confirmation

#### 2. `journalStoreExtended`
- **Location**: `app/store/journalStoreExtended.ts`
- **Integration**: Links journal entries with psychology monitoring

## Usage

### Basic Order Execution with Guards

```typescript
import { useGuardedOrderExecution } from '@/app/hooks/useGuardedOrderExecution';

function TradingComponent() {
  const { executeGuardedOrder } = useGuardedOrderExecution();

  const handleTrade = async () => {
    const order: OrderRequest = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'usa',
      side: 'LONG',
      quantity: 100,
      price: 155.50,
      orderType: 'MARKET',
    };

    try {
      const result = await executeGuardedOrder(order);
      if (result.success) {
        console.log('Order executed:', result.orderId);
      }
    } catch (error) {
      console.error('Order cancelled or blocked:', error);
    }
  };

  return <button onClick={handleTrade}>Execute Trade</button>;
}
```

### Configuration

```typescript
import { getBehavioralBiasGuard } from '@/app/lib/trading/behavioralBiasGuard';

// Customize thresholds
const guard = getBehavioralBiasGuard({
  consecutiveLossesThreshold: 3, // Block after 3 losses instead of 5
  revengeTradingSizeIncreaseThreshold: 30, // Block at 30% increase
  blockRevengeTrading: true,
  maxTradesPerDay: 15,
});
```

### Manual Validation

```typescript
import { getBehavioralBiasGuard } from '@/app/lib/trading/behavioralBiasGuard';
import { useTradingStore } from '@/app/store/tradingStore';
import { useExtendedJournalStore } from '@/app/store/journalStoreExtended';

function validateBeforeTrading() {
  const guard = getBehavioralBiasGuard();
  const portfolio = useTradingStore.getState().portfolio;
  const journal = useExtendedJournalStore.getState().journal;

  const order = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'usa' as const,
    side: 'LONG' as const,
    quantity: 100,
    price: 155.50,
    orderType: 'MARKET' as const,
  };

  const validation = guard.validateOrder(
    order,
    portfolio.positions,
    journal,
    portfolio.cash
  );

  if (!validation.allowed) {
    console.log('Trade blocked:', validation.blockReason);
    return false;
  }

  if (validation.requiresConfirmation) {
    console.log('Warnings:', validation.warnings);
    // Show confirmation dialog
  }

  return true;
}
```

## Warning Types

### High Severity (Red)
- **Consecutive Losses (5+)**: Blocks all trades
- **Revenge Trading (>50% increase)**: Blocks size increases during drawdown
- **Extreme Risk Tolerance**: Blocks when emotional state is extreme

### Medium Severity (Yellow)
- **Consecutive Losses (3-4)**: Shows warning, allows trade
- **Revenge Trading (20-50% increase)**: Requires confirmation
- **Over-Trading**: Requires confirmation
- **Excessive Position Size**: Requires confirmation

### Low Severity (Blue)
- **Informational warnings**: No blocking or confirmation required

## Testing

### Run Tests

```bash
# Run behavioral bias guard tests
npm test -- app/lib/trading/__tests__/behavioralBiasGuard.test.ts

# Run psychology monitor tests
npm test -- app/lib/trading/__tests__/psychology.test.ts
```

### Test Coverage

- ✅ Consecutive loss blocking
- ✅ Revenge trading detection
- ✅ Over-trading warnings
- ✅ Position size validation
- ✅ Configuration management
- ✅ Psychology state tracking

## Integration Points

### 1. Application Layout
- `BehavioralWarningProvider` wrapped in `layout.tsx`
- Modal available throughout application

### 2. Order Execution
- Use `useGuardedOrderExecution` hook instead of direct execution
- Automatic validation and psychology tracking

### 3. AI Advisor Page
- Displays active warnings in sidebar
- Shows psychology state metrics
- `PsychologyWarningPanel` component for warnings

### 4. Trading Store
- Original `executeOrderAtomicV2` preserved
- New guarded execution via hook
- Psychology state recorded after successful trades

## Future Enhancements

1. **Machine Learning Integration**
   - Learn individual trader patterns
   - Personalized thresholds
   - Predictive behavioral warnings

2. **Historical Analysis**
   - Track long-term behavioral patterns
   - Performance correlation with psychology
   - Behavioral improvement metrics

3. **Social Proof**
   - Compare behavior with successful traders
   - Benchmark against best practices
   - Community-based insights

4. **Advanced Risk Management**
   - Portfolio-level risk assessment
   - Correlation-based position limits
   - Dynamic risk adjustment

## Configuration Reference

### BehavioralBiasGuardConfig

```typescript
interface BehavioralBiasGuardConfig {
  blockOnConsecutiveLosses: boolean;         // Default: true
  consecutiveLossesThreshold: number;        // Default: 5
  blockRevengeTrading: boolean;              // Default: true
  revengeTradingSizeIncreaseThreshold: number; // Default: 50 (%)
  warnOnOverTrading: boolean;                // Default: true
  maxTradesPerDay: number;                   // Default: 20
}
```

### PsychologyState

```typescript
interface PsychologyState {
  consecutiveLosses: number;
  consecutiveWins: number;
  totalLosses: number;
  totalWins: number;
  currentStreak: 'winning' | 'losing' | 'neutral';
  riskTolerance: number;              // 0.3 - 1.5
  lastTradeDate: Date | null;
  tradesToday: number;
  totalTrades: number;
}
```

## Troubleshooting

### Modal Not Showing
- Check `BehavioralWarningProvider` is in layout
- Verify `behavioralWarningStore` is properly imported
- Check browser console for errors

### Warnings Not Triggered
- Ensure `useGuardedOrderExecution` is used
- Verify psychology monitor is tracking trades
- Check journal entries are being recorded

### Tests Failing
- Clear jest cache: `npm test -- --clearCache`
- Check psychology monitor singleton state
- Verify test data matches expected format

## Support

For questions or issues:
1. Check test files for usage examples
2. Review component source code
3. Create GitHub issue with details
