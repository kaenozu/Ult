# Real-time Risk Monitoring and Dynamic Risk Management System

**Implementation Date**: 2026-02-01  
**Issue**: TRADING-023  
**Status**: ✅ Complete

## Overview

This system provides comprehensive real-time risk monitoring, automatic risk control, and dynamic risk adjustment capabilities for the ULT trading platform. It enables traders to minimize losses, maintain stable performance, and adapt position sizing based on market conditions and performance.

## Features Implemented

### 1. Real-time Risk Calculation (Phase 1)
- **Portfolio-wide risk calculation**: Total risk, VaR, volatility
- **VaR calculation**: Historical and Parametric methods at 95% and 99% confidence
- **CVaR (Conditional VaR)**: Expected shortfall calculation
- **Concentration risk**: HHI-based risk measurement
- **Correlation risk**: Cross-position correlation analysis
- **Drawdown tracking**: Current and maximum drawdown monitoring
- **Individual position risk**: Per-position risk metrics

### 2. Risk Monitoring Dashboard (Phase 2)
- **Real-time metrics display**: Live updates every 5 seconds
- **Color-coded risk levels**: 
  - 🟢 Safe: ≤10%
  - 🟡 Caution: 10-20%
  - 🟠 Warning: 20-30%
  - 🔴 Danger: 30-50%
  - 🔴🔴 Critical: ≥50%
- **Alert system**: Multi-severity alerts with actionable recommendations
- **Position risk breakdown**: Individual position risk contribution
- **Historical risk tracking**: Risk trend visualization

### 3. Automatic Risk Control (Phase 3)
- **Automatic order blocking**: Blocks new orders when limits are breached
- **Emergency trading halt**: Stops all trading at critical risk levels
- **Position reduction proposals**: Suggests specific positions to reduce/close
- **Market crash detection**: Identifies rapid price drops (-5% in 15 min)
- **Consecutive loss tracking**: Monitors losing streaks
- **Event-based notifications**: Real-time alerts via EventEmitter

### 4. Dynamic Risk Adjustment (Phase 4)
- **Volatility-based sizing**: Adjusts position sizes based on market volatility
- **Market condition detection**: Auto-detects bull/bear/sideways/volatile/stable markets
- **Performance-based scaling**: Increases risk after wins, decreases after losses
- **Profit-based recalculation**: Adjusts risk appetite after profit taking
- **Multi-factor risk adjustment**: Combines volatility, market conditions, and performance

## Architecture

### Core Components

```
trading-platform/app/lib/risk/
├── RealTimeRiskCalculator.ts      # Real-time risk metrics calculation
├── AutomaticRiskController.ts     # Automatic risk control & alerts
├── DynamicRiskAdjuster.ts         # Dynamic position sizing
└── __tests__/                      # Comprehensive unit tests (72 tests)
```

### State Management

```
trading-platform/app/store/
└── riskMonitoringStore.ts         # Zustand store for risk state
```

### UI Components

```
trading-platform/app/components/
└── RiskMonitoringDashboard.tsx    # Real-time dashboard UI
```

## Usage Examples

### 1. Real-time Risk Monitoring

```typescript
import { RealTimeRiskCalculator } from '@/app/lib/risk';

const calculator = new RealTimeRiskCalculator({
  varMethod: 'parametric',
  maxDailyLossPercent: 5,
  maxDrawdownPercent: 20,
});

// Calculate portfolio risk
const riskMetrics = calculator.calculatePortfolioRisk(portfolio);

console.log(`Total Risk: ${riskMetrics.totalRiskPercent.toFixed(1)}%`);
console.log(`Risk Level: ${riskMetrics.riskLevel}`);
console.log(`VaR (95%): ${riskMetrics.var95}`);
console.log(`Drawdown: ${riskMetrics.currentDrawdown.toFixed(2)}%`);
```

### 2. Automatic Risk Control

```typescript
import { AutomaticRiskController } from '@/app/lib/risk';

const controller = new AutomaticRiskController({
  enableAutoControl: true,
  enableAutoOrderBlock: true,
  maxDailyLossPercent: 5,
  maxConsecutiveLosses: 3,
});

// Listen for risk events
controller.on('orders_blocked', (action) => {
  console.warn('Orders blocked:', action.reason);
  notifyUser(action);
});

// Evaluate risk and take action
const actions = controller.evaluateAndAct(riskMetrics, portfolio);

// Check if orders should be blocked
if (controller.shouldBlockNewOrders()) {
  console.log('New orders are currently blocked');
}
```

### 3. Dynamic Position Sizing

```typescript
import { DynamicRiskAdjuster } from '@/app/lib/risk';

const adjuster = new DynamicRiskAdjuster({
  baseRiskPercent: 2,
  enableVolatilityAdjustment: true,
  enableMarketConditionAdjustment: true,
});

// Auto-detect market conditions
const marketCondition = adjuster.detectMarketCondition(riskMetrics, portfolio);
console.log(`Market: ${marketCondition}`);

// Adjust position size
const adjustment = adjuster.adjustPositionSize(
  baseSize,
  entryPrice,
  portfolio,
  riskMetrics
);

console.log(`Recommended size: ${adjustment.recommendedPositionSize}`);
console.log(`Risk multiplier: ${adjustment.riskMultiplier.toFixed(2)}x`);
console.log(`Reasons:`, adjustment.reasons);
```

### 4. Using the Risk Monitoring Store

```typescript
import { useRiskMonitoringStore } from '@/app/store/riskMonitoringStore';

function RiskComponent() {
  const {
    currentRisk,
    alerts,
    updateRisk,
    shouldBlockNewOrders,
  } = useRiskMonitoringStore();

  useEffect(() => {
    // Update risk every 5 seconds
    const interval = setInterval(() => {
      updateRisk(portfolio);
    }, 5000);
    return () => clearInterval(interval);
  }, [portfolio]);

  if (shouldBlockNewOrders()) {
    return <Alert>Orders are blocked due to risk limits</Alert>;
  }

  return (
    <div>
      <h3>Risk Level: {currentRisk?.riskLevel}</h3>
      <p>Total Risk: {currentRisk?.totalRiskPercent.toFixed(1)}%</p>
      {alerts.map(alert => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

### 5. Complete Risk Dashboard

```typescript
import { RiskMonitoringDashboard } from '@/app/components/RiskMonitoringDashboard';

function TradingPage() {
  const portfolio = usePortfolio();

  return (
    <div>
      <h1>Trading Dashboard</h1>
      <RiskMonitoringDashboard 
        portfolio={portfolio} 
        updateInterval={5000}
      />
    </div>
  );
}
```

## Risk Management Policies

### Loss Limits
- **Daily max loss**: 5% of portfolio value
- **Weekly max loss**: 10% of portfolio value
- **Max drawdown**: 20% before emergency measures
- **Emergency drawdown**: 25% triggers trading halt
- **Single position max loss**: 2% of account balance

### Risk Thresholds
| Level | Risk % | Color | Action |
|-------|--------|-------|--------|
| Safe | 0-10% | 🟢 Green | Normal trading |
| Caution | 10-20% | 🟡 Yellow | Monitor closely |
| Warning | 20-30% | 🟠 Orange | Reduce exposure |
| Danger | 30-50% | 🔴 Red | Block new orders |
| Critical | 50%+ | 🔴🔴 Dark Red | Emergency halt |

### Consecutive Losses
- **Max consecutive losses**: 3
- **Action**: Block new orders for 24 hours
- **Reset condition**: One winning trade

### Market Crash Detection
- **Threshold**: -5% price drop in 15 minutes
- **Action**: Generate critical alert, recommend position review

## Configuration

### Risk Calculation Config

```typescript
{
  // VaR settings
  varMethod: 'parametric' | 'historical',
  varConfidenceLevel: 95 | 99,
  varTimeHorizon: 1, // days
  historicalPeriod: 252, // days
  
  // Risk thresholds
  safeThreshold: 10,
  cautionThreshold: 20,
  warningThreshold: 30,
  dangerThreshold: 50,
  
  // Loss limits
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownPercent: 20,
  maxSinglePositionLossPercent: 2,
  
  // Concentration limits
  maxPositionPercent: 20,
  maxSectorConcentration: 30,
  
  // Correlation settings
  maxCorrelation: 0.7,
  correlationWindow: 60,
}
```

### Risk Control Config

```typescript
{
  // Control toggles
  enableAutoControl: true,
  enableAutoPositionReduction: false, // Requires manual confirmation
  enableAutoOrderBlock: true,
  enableEmergencyHalt: false, // Use with caution
  
  // Thresholds
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownPercent: 20,
  maxConsecutiveLosses: 3,
  
  // Emergency response
  emergencyDrawdownPercent: 25,
  emergencyRiskPercent: 50,
  marketCrashThreshold: -5,
  
  // Position reduction
  positionReductionPercent: 50,
  minPositionSize: 1,
}
```

### Dynamic Adjustment Config

```typescript
{
  // Base settings
  baseRiskPercent: 2,
  minRiskPercent: 0.5,
  maxRiskPercent: 5,
  
  // Volatility adjustment
  enableVolatilityAdjustment: true,
  lowVolatilityThreshold: 10,
  highVolatilityThreshold: 30,
  volatilityMultiplierMin: 0.5,
  volatilityMultiplierMax: 2.0,
  
  // Market condition adjustment
  enableMarketConditionAdjustment: true,
  bullMarketMultiplier: 1.2,
  bearMarketMultiplier: 0.6,
  sidewaysMarketMultiplier: 1.0,
  volatileMarketMultiplier: 0.7,
  stableMarketMultiplier: 1.1,
  
  // Loss adjustment
  enableConsecutiveLossAdjustment: true,
  lossReductionPerLoss: 0.2, // 20% per loss
  maxConsecutiveLossReduction: 0.5, // 50% max
  
  // Profit adjustment
  enableProfitAdjustment: true,
  profitIncreaseThreshold: 10, // 10% profit
  profitIncreaseRate: 0.1, // 10% increase
  maxProfitIncrease: 0.5, // 50% max
}
```

## Testing

### Test Coverage

All components have comprehensive unit tests:

```bash
# Run all risk tests
npm test -- app/lib/risk/__tests__/

# Run specific test suites
npm test -- RealTimeRiskCalculator.test.ts
npm test -- AutomaticRiskController.test.ts
npm test -- DynamicRiskAdjuster.test.ts
```

### Test Results

- ✅ **RealTimeRiskCalculator**: 18/18 tests passing
- ✅ **AutomaticRiskController**: 26/26 tests passing
- ✅ **DynamicRiskAdjuster**: 28/28 tests passing
- ✅ **Total**: 72/72 tests passing (100%)

### Test Coverage Areas

1. **Risk Calculation**
   - Portfolio-wide risk metrics
   - VaR/CVaR calculation
   - Concentration & correlation risk
   - Drawdown tracking
   - Individual position risk

2. **Automatic Control**
   - Daily loss limit enforcement
   - Drawdown limit checks
   - Consecutive loss tracking
   - Emergency conditions
   - Position reduction proposals
   - Market crash detection

3. **Dynamic Adjustment**
   - Volatility-based adjustments
   - Market condition detection
   - Performance-based scaling
   - Profit recalculation
   - Multi-factor combinations

## Performance Considerations

1. **Calculation Frequency**: Default 5-second updates (configurable)
2. **History Storage**: Last 100 data points in memory
3. **Correlation Matrix**: O(n²) for n positions (acceptable for typical portfolios)
4. **Event Listeners**: Use EventEmitter for efficient notification

## Security Considerations

1. **Automatic Actions**: Position reduction requires manual confirmation by default
2. **Emergency Halt**: Disabled by default (use with extreme caution)
3. **Configuration Validation**: All limits are validated and bounded
4. **State Persistence**: Sensitive data excluded from localStorage

## Integration Points

### Existing Systems
- ✅ Integrates with existing `AdvancedRiskManager`
- ✅ Compatible with `DynamicPositionSizing` (TRADING-003)
- ✅ Works with `PortfolioOptimization` (TRADING-014)
- ✅ Uses existing `Portfolio` and `Position` types

### Future Enhancements
- [ ] Slack/Email notification integration
- [ ] Historical risk report generation
- [ ] Machine learning-based risk prediction
- [ ] Multi-timeframe risk analysis
- [ ] Sector-specific risk limits

## Troubleshooting

### Issue: Orders blocked unexpectedly
**Solution**: Check `shouldBlockNewOrders()` and review active alerts. Daily loss may have exceeded limit.

### Issue: Risk metrics show NaN
**Solution**: Ensure sufficient price history data. Calculator needs at least 2 data points for most calculations.

### Issue: Position reduction not triggering
**Solution**: Check `enableAutoPositionReduction` config. It's disabled by default for safety.

### Issue: Market condition detection inaccurate
**Solution**: Tune volatility thresholds and trend detection parameters in `DynamicRiskAdjusterConfig`.

## API Reference

See TypeScript definitions in:
- `RealTimeRiskCalculator.ts` - Core risk calculation
- `AutomaticRiskController.ts` - Automatic control actions
- `DynamicRiskAdjuster.ts` - Position sizing adjustments
- `riskMonitoringStore.ts` - State management

## Contributing

When extending this system:
1. Add unit tests for new features (maintain 100% coverage)
2. Update type definitions
3. Document new configuration options
4. Consider backward compatibility
5. Test edge cases thoroughly

## License

Internal use only - ULT Trading Platform

## Support

For issues or questions:
- Create a GitHub issue with label `risk-management`
- Contact the trading platform team
- Review existing tests for usage examples

---

**Last Updated**: 2026-02-01  
**Version**: 1.0.0  
**Maintainer**: Trading Platform Team
