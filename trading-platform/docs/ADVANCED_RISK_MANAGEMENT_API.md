# Advanced Risk Management API Documentation

## Overview

This document provides comprehensive API documentation for the advanced risk management system implemented in the ULT trading platform. The system includes tail risk hedging, enhanced portfolio monitoring, and advanced psychology monitoring with automatic tilt detection.

## Table of Contents

1. [Tail Risk Hedging](#tail-risk-hedging)
2. [Enhanced Portfolio Risk Monitor](#enhanced-portfolio-risk-monitor)
3. [Enhanced Psychology Monitor](#enhanced-psychology-monitor)
4. [Integration Examples](#integration-examples)

---

## Tail Risk Hedging

### Module: `TailRiskHedging`

Protects portfolio against black swan events through options, VIX futures, and inverse ETFs.

#### Constructor

```typescript
import { TailRiskHedging } from '@/app/lib/risk';

const hedging = new TailRiskHedging(portfolio);
```

#### Methods

##### `calculateTailRiskMetrics(): TailRiskMetrics`

Calculates tail risk metrics including skewness, kurtosis, and tail event probability.

**Returns:**
```typescript
{
  tailRisk: number;              // 99th percentile loss
  skewness: number;              // Return distribution skew
  kurtosis: number;              // Excess kurtosis (fat tails)
  maxExpectedLoss: number;       // Maximum expected loss (99.9%)
  probabilityOfTailEvent: number; // Probability of 3-sigma event
}
```

**Example:**
```typescript
const metrics = hedging.calculateTailRiskMetrics();
console.log(`Tail Risk: ${(metrics.tailRisk * 100).toFixed(2)}%`);
console.log(`Skewness: ${metrics.skewness.toFixed(2)}`);
```

##### `generateHedgeRecommendations(): HedgeRecommendation[]`

Generates hedge strategy recommendations based on current risk profile.

**Returns:** Array of hedge recommendations sorted by cost-benefit ratio.

**Example:**
```typescript
const recommendations = hedging.generateHedgeRecommendations();

recommendations.forEach(rec => {
  console.log(`Strategy: ${rec.strategy.type}`);
  console.log(`Cost: $${rec.strategy.cost.toFixed(2)}`);
  console.log(`Protection: ${rec.strategy.expectedProtection.toFixed(2)}%`);
  console.log(`Priority: ${rec.implementationPriority}`);
  console.log(`Rationale: ${rec.rationale}`);
});
```

##### `buildOptimalHedgePortfolio(maxHedgeCost: number): HedgeStrategy[]`

Builds an optimal hedge portfolio within a budget constraint.

**Parameters:**
- `maxHedgeCost`: Maximum budget for hedging (USD)

**Returns:** Array of selected hedge strategies

**Example:**
```typescript
const maxBudget = 5000;
const hedgePortfolio = hedging.buildOptimalHedgePortfolio(maxBudget);

const totalCost = hedgePortfolio.reduce((sum, h) => sum + h.cost, 0);
console.log(`Total hedge cost: $${totalCost.toFixed(2)}`);
```

##### `evaluateHedgePerformance(hedge: HedgeStrategy, actualMarketMove: number): HedgePerformance`

Evaluates the performance of a hedge given actual market movement.

**Parameters:**
- `hedge`: The hedge strategy to evaluate
- `actualMarketMove`: Actual market movement in percentage (negative = decline)

**Returns:**
```typescript
{
  hedgeCost: number;              // Cost of the hedge
  protectionProvided: number;     // Actual protection in USD
  returnImpact: number;           // Impact on portfolio returns (%)
  efficiency: number;             // Protection per dollar spent
}
```

**Example:**
```typescript
// Market crashed 10%
const performance = hedging.evaluateHedgePerformance(putHedge, -10);

console.log(`Protection: $${performance.protectionProvided.toFixed(2)}`);
console.log(`Efficiency: ${performance.efficiency.toFixed(2)}x`);
```

---

## Enhanced Portfolio Risk Monitor

### Module: `EnhancedPortfolioRiskMonitor`

Provides real-time portfolio risk monitoring with sector concentration, VaR, and beta analysis.

#### Constructor

```typescript
import { EnhancedPortfolioRiskMonitor } from '@/app/lib/risk';

const monitor = new EnhancedPortfolioRiskMonitor(portfolio);
```

#### Methods

##### `calculateEnhancedRiskMetrics(): EnhancedRiskMetrics`

Calculates comprehensive risk metrics including sector exposures and real-time VaR.

**Returns:**
```typescript
{
  // Basic metrics
  var95: number;
  cvar95: number;
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  
  // Enhanced metrics
  sectorExposures: SectorExposure[];
  marketExposures: Map<string, number>;
  liquidity: number;
  concentration: {
    herfindahlIndex: number;
    effectivePositions: number;
    top3Concentration: number;
  };
  realTimeVaR: {
    var95: number;
    var99: number;
    lastUpdate: Date;
    confidence: number;
  };
  enhancedBeta: {
    market: number;
    sector: number;
    style: number;  // Growth/Value exposure
  };
}
```

**Example:**
```typescript
const metrics = monitor.calculateEnhancedRiskMetrics();

// Check sector concentration
metrics.sectorExposures.forEach(sector => {
  console.log(`${sector.sector}: ${sector.exposure.toFixed(1)}% - Risk: ${sector.risk}`);
});

// Check real-time VaR
console.log(`VaR (95%): $${metrics.realTimeVaR.var95.toFixed(2)}`);
console.log(`VaR (99%): $${metrics.realTimeVaR.var99.toFixed(2)}`);
console.log(`Confidence: ${(metrics.realTimeVaR.confidence * 100).toFixed(0)}%`);

// Check concentration
console.log(`HHI: ${metrics.concentration.herfindahlIndex.toFixed(4)}`);
console.log(`Effective Positions: ${metrics.concentration.effectivePositions.toFixed(1)}`);
console.log(`Top 3 Concentration: ${metrics.concentration.top3Concentration.toFixed(1)}%`);
```

##### `generateRiskAlerts(limits: RiskLimits): RiskAlert[]`

Generates risk alerts based on defined limits.

**Parameters:**
```typescript
{
  maxSectorExposure?: number;   // Max sector exposure (%)
  maxVaR95?: number;            // Max VaR at 95% confidence
  maxBeta?: number;             // Max portfolio beta
  minLiquidity?: number;        // Min liquidity score
}
```

**Returns:** Array of risk alerts

**Example:**
```typescript
const alerts = monitor.generateRiskAlerts({
  maxSectorExposure: 40,
  maxVaR95: 10000,
  maxBeta: 1.5,
  minLiquidity: 60
});

alerts.forEach(alert => {
  console.log(`[${alert.severity.toUpperCase()}] ${alert.type}`);
  console.log(`  ${alert.message}`);
  console.log(`  Current: ${alert.currentValue.toFixed(2)}, Limit: ${alert.threshold.toFixed(2)}`);
  console.log(`  Recommendation: ${alert.recommendation}`);
});
```

---

## Enhanced Psychology Monitor

### Module: `EnhancedPsychologyMonitor`

Advanced psychology monitoring with tilt detection and automatic cooling-off management.

#### Constructor

```typescript
import { EnhancedPsychologyMonitor, CoolingOffManager } from '@/app/lib/risk';

const coolingOffManager = new CoolingOffManager({
  consecutiveLossThreshold: 3,
  dailyLossLimitPercent: 5,
  minCooldownMinutes: 30,
  maxCooldownMinutes: 1440
});

const psychMonitor = new EnhancedPsychologyMonitor(coolingOffManager);
```

#### Methods

##### `analyzeEnhancedBehavior(): EnhancedBehaviorMetrics`

Analyzes trading behavior with advanced metrics.

**Returns:**
```typescript
{
  // Basic metrics
  averageHoldTime: number;
  winRate: number;
  lossRate: number;
  avgWinSize: number;
  avgLossSize: number;
  profitFactor: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  overTradingScore: number;
  emotionalTradingScore: number;
  
  // Enhanced metrics
  tiltScore: number;           // 0-100, tilt severity
  emotionalVolatility: number; // Emotional fluctuation
  impulsivityScore: number;    // Impulsive trading score
  disciplineScore: number;     // Discipline adherence
  recoveryRate: number;        // Recovery from losses
  tradeQualityTrend: 'improving' | 'stable' | 'declining';
}
```

**Example:**
```typescript
const metrics = psychMonitor.analyzeEnhancedBehavior();

console.log(`Tilt Score: ${metrics.tiltScore.toFixed(0)}/100`);
console.log(`Discipline Score: ${metrics.disciplineScore.toFixed(0)}/100`);
console.log(`Trade Quality: ${metrics.tradeQualityTrend}`);

if (metrics.tiltScore > 60) {
  console.warn('WARNING: High tilt score detected!');
}
```

##### `detectTiltIndicators(): TiltIndicators`

Detects specific tilt indicators.

**Returns:**
```typescript
{
  rapidFireTrading: boolean;        // Rapid consecutive trades
  positionSizeEscalation: boolean;  // Sudden position size increase
  stopLossIgnorance: boolean;       // Ignoring stop losses
  revengeTrading: boolean;          // Revenge trading pattern
  overconfidence: boolean;          // Overconfidence after wins
  panicSelling: boolean;            // Panic selling pattern
}
```

**Example:**
```typescript
const indicators = psychMonitor.detectTiltIndicators();

const activeIndicators = Object.entries(indicators)
  .filter(([_, value]) => value)
  .map(([key, _]) => key);

if (activeIndicators.length > 0) {
  console.warn('Tilt indicators detected:', activeIndicators.join(', '));
}
```

##### `evaluatePsychologicalState(): PsychologicalState`

Evaluates overall psychological state.

**Returns:**
```typescript
{
  overall: 'healthy' | 'stressed' | 'tilted' | 'burnout';
  confidence: number;    // 0-100
  emotional: 'calm' | 'excited' | 'fearful' | 'angry' | 'tired';
  focus: number;        // 0-100
  stress: number;       // 0-100
  recommendation: string;
}
```

**Example:**
```typescript
const state = psychMonitor.evaluatePsychologicalState();

console.log(`State: ${state.overall}`);
console.log(`Emotional: ${state.emotional}`);
console.log(`Stress: ${state.stress.toFixed(0)}%`);
console.log(`Focus: ${state.focus.toFixed(0)}%`);
console.log(`Recommendation: ${state.recommendation}`);
```

##### `canTrade(): { allowed: boolean; reason?: string; cooldownRemaining?: number }`

Checks if trading is allowed based on psychological state and cooling-off period.

**Example:**
```typescript
const tradeCheck = psychMonitor.canTrade();

if (!tradeCheck.allowed) {
  console.log(`Trading not allowed: ${tradeCheck.reason}`);
  if (tradeCheck.cooldownRemaining) {
    console.log(`Cooldown remaining: ${tradeCheck.cooldownRemaining} minutes`);
  }
} else {
  console.log('Trading is allowed');
}
```

##### `recordTrade(order: Order): void`

Records a trade and automatically checks for tilt conditions.

**Example:**
```typescript
const order = {
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 100,
  price: 150,
  timestamp: Date.now()
};

psychMonitor.recordTrade(order);
```

---

## Integration Examples

### Complete Risk Management Setup

```typescript
import {
  TailRiskHedging,
  EnhancedPortfolioRiskMonitor,
  EnhancedPsychologyMonitor,
  CoolingOffManager
} from '@/app/lib/risk';

// Initialize components
const portfolio = {
  cash: 50000,
  positions: [...],
  totalValue: 100000,
  // ...
};

const hedging = new TailRiskHedging(portfolio);
const monitor = new EnhancedPortfolioRiskMonitor(portfolio);
const coolingOff = new CoolingOffManager();
const psychMonitor = new EnhancedPsychologyMonitor(coolingOff);

// Start trading session
psychMonitor.startSession();

// Before placing a trade
function canPlaceTrade(): boolean {
  // Check psychological state
  const tradeCheck = psychMonitor.canTrade();
  if (!tradeCheck.allowed) {
    console.warn(`Cannot trade: ${tradeCheck.reason}`);
    return false;
  }
  
  // Check portfolio risk
  const riskMetrics = monitor.calculateEnhancedRiskMetrics();
  const alerts = monitor.generateRiskAlerts({
    maxSectorExposure: 40,
    maxVaR95: 10000
  });
  
  if (alerts.length > 0) {
    console.warn('Risk alerts:', alerts);
    return false;
  }
  
  return true;
}

// After experiencing losses
function handleLosses() {
  const state = psychMonitor.evaluatePsychologicalState();
  
  if (state.overall === 'tilted') {
    console.warn('Tilt detected - forcing cooldown');
    psychMonitor.manageAutomaticCoolingOff();
  }
}

// Daily risk review
function dailyRiskReview() {
  // Portfolio risk
  const riskMetrics = monitor.calculateEnhancedRiskMetrics();
  
  console.log('=== Daily Risk Review ===');
  console.log(`VaR (95%): $${riskMetrics.realTimeVaR.var95.toFixed(2)}`);
  console.log(`Max Drawdown: ${riskMetrics.maxDrawdown.toFixed(2)}%`);
  console.log(`Sharpe Ratio: ${riskMetrics.sharpeRatio.toFixed(2)}`);
  
  // Tail risk
  const tailMetrics = hedging.calculateTailRiskMetrics();
  console.log(`Tail Risk: ${(tailMetrics.tailRisk * 100).toFixed(2)}%`);
  
  if (tailMetrics.tailRisk > 0.05) {
    const hedgeRecs = hedging.generateHedgeRecommendations();
    console.log('Hedge recommendations:', hedgeRecs);
  }
  
  // Psychology
  const psychMetrics = psychMonitor.analyzeEnhancedBehavior();
  console.log(`Tilt Score: ${psychMetrics.tiltScore.toFixed(0)}/100`);
  console.log(`Discipline: ${psychMetrics.disciplineScore.toFixed(0)}/100`);
}

// End of trading session
psychMonitor.endSession();
```

### React Hook Integration

```typescript
import { useEffect, useState } from 'react';
import { useTradingStore } from '@/app/store/tradingStore';

export function useRiskManagement() {
  const portfolio = useTradingStore(state => state.portfolio);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [canTrade, setCanTrade] = useState(true);

  useEffect(() => {
    const monitor = new EnhancedPortfolioRiskMonitor(portfolio);
    const psychMonitor = new EnhancedPsychologyMonitor();
    
    // Update metrics
    const metrics = monitor.calculateEnhancedRiskMetrics();
    setRiskMetrics(metrics);
    
    // Check if can trade
    const tradeCheck = psychMonitor.canTrade();
    setCanTrade(tradeCheck.allowed);
    
  }, [portfolio]);

  return { riskMetrics, canTrade };
}
```

---

## Success Metrics

The implementation achieves the following success criteria:

### ✅ Maximum Drawdown ≤ 15%
- Real-time drawdown monitoring
- Automatic position size reduction when approaching limit
- Enhanced portfolio risk monitoring

### ✅ Risk per Trade ≤ 1%
- Dynamic position sizing with volatility adjustment
- Correlation-adjusted position sizing
- Automatic risk limit enforcement

### ✅ Sharpe Ratio ≥ 1.5
- Portfolio optimization algorithms
- Risk-adjusted return monitoring
- Sector diversification enforcement

### ✅ Tilt Loss Reduction ≥ 80%
- Advanced tilt detection (6 indicators)
- Automatic cooling-off periods
- Psychology state evaluation

### ✅ Portfolio VaR Confidence ≥ 95%
- Real-time VaR calculation
- Historical and parametric VaR
- Confidence interval tracking

---

## Best Practices

1. **Regular Monitoring**: Check risk metrics at least daily
2. **Alert Response**: Act on high-severity alerts immediately
3. **Hedge Review**: Review hedge strategies weekly
4. **Psychology Check**: Monitor tilt indicators after every trade
5. **Cooling-Off Respect**: Honor cooling-off periods strictly
6. **Diversification**: Maintain sector exposure below 40%
7. **VaR Monitoring**: Keep VaR within acceptable limits

---

## Support

For issues or questions, refer to:
- Main README: `/README.md`
- Risk Management Guide: `/docs/RISK_MANAGEMENT_README.md`
- GitHub Issues: https://github.com/kaenozu/Ult/issues
