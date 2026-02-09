# Constants Organization

This directory contains centralized configuration constants for the ULT trading platform.

## Structure

Constants are organized by category into separate modules:

### Core Modules

- **`prediction.ts`** - ML model configuration
  - `PREDICTION_CONFIG` - Consolidated prediction configuration (recommended)
  - `ML_MODEL_CONFIG` - Model availability and paths
  - `ENSEMBLE_WEIGHTS` - Ensemble model weights
  - `FORECAST_CONE` - Forecast visualization
  - `PREDICTION_ERROR_WEIGHTS` - Error calculation
  - Legacy aliases: `ML_SCORING`, `PRICE_CALCULATION`, `GHOST_FORECAST`, `PREDICTION` (deprecated)

- **`technical-indicators.ts`** - Technical analysis configuration
  - `TECHNICAL_INDICATORS` - Main technical indicator parameters (recommended)
  - Backward compatibility aliases: `RSI_CONFIG`, `SMA_CONFIG`, `MACD_CONFIG`, `BOLLINGER_BANDS`, `VOLATILITY` (deprecated)

- **`risk-management.ts`** - Position sizing and risk parameters
  - `RISK_MANAGEMENT` - Comprehensive risk parameters (recommended)
  - Previously: `RISK_PARAMS`, `POSITION_SIZING` (deprecated, merged into RISK_MANAGEMENT)

- **`trading.ts`** - Trading signal configuration
  - `SIGNAL_THRESHOLDS` - Signal confidence and correlation thresholds (recommended)
  - `MARKET_CORRELATION`, `AI_TRADING`, `ORDER`
  - Legacy: `CONFIDENCE_THRESHOLDS` in `common.ts` (deprecated, use SIGNAL_THRESHOLDS)

- **`backtest.ts`** - Backtesting configuration
  - `BACKTEST_CONFIG` - Backtest parameters (some deprecated, see notes)
  - `BACKTEST_METRICS` - Performance metrics

### UI and Visualization

- **`chart.ts`** - Chart visualization settings
  - `VOLUME_PROFILE`, `CHART_DIMENSIONS`, `CHART_COLORS`
  - `CANDLESTICK`, `CHART_GRID`, `CHART_CONFIG` (MIN_DATA_POINTS deprecated)

- **`ui.ts`** - User interface styling
  - `SIGNAL_COLORS`, `CONFIDENCE_COLORS`, `MARKET_COLORS`
  - `HEATMAP_COLORS`, `BUTTON_STYLES`, `TEXT_SIZES`, `GRID_PADDING`, `ANIMATION`
  - `CHART_THEME` - Chart UI theme colors

### Infrastructure

- **`api.ts`** - API and data layer configuration
  - `CACHE_CONFIG`, `RATE_LIMIT`, `API_ENDPOINTS`
  - `DATA_QUALITY` (MIN_DATA_LENGTH deprecated, use DATA_REQUIREMENTS)

- **`common.ts`** - Common values and utilities
  - `DATA_REQUIREMENTS` - Data requirements (recommended)
  - `OPTIMIZATION` - Optimization parameters
  - `MULTIPLIERS` - Common multipliers
  - Deprecated: `CONFIDENCE_THRESHOLDS`, `PERCENTAGE_VALUES`, `INDEX_VALUES`

- **`intervals.ts`** - Time interval constants
  - `INTRADAY_INTERVALS`, `DAILY_INTERVALS`, `ALL_INTERVALS`
  - `JAPANESE_MARKET_DELAY_MINUTES`
  - Functions: `isIntradayInterval()`, `normalizeInterval()`

### New Modules (REFACTOR-001)

- **`ml.ts`** - Machine Learning configuration
  - `ML_HYPERPARAMETERS` - Default training parameters (epochs, batch size, etc.)
  - `ML_VALIDATION_LIMITS` - Model validation constraints
  - `ML_DATA_QUALITY` - Data quality thresholds for ML
  - `ML_TRAINING_PRESETS` - Pre-configured training settings for LSTM, Transformer, GRU
  - `META_MODEL_CONFIG` - Meta-model training configuration

- **`backtest-config.ts`** - Backtest Engine configuration
  - `BACKTEST_DEFAULTS` - Default backtest parameters (capital, fees, position limits)
  - `REALISTIC_BACKTEST_DEFAULTS` - Realistic simulation settings (slippage, market impact)
  - `TIERED_COMMISSIONS` - Volume-based commission tiers
  - `WALK_FORWARD_DEFAULTS` - Walk-forward analysis settings
  - `MONTE_CARLO_DEFAULTS` - Monte Carlo simulation settings
  - `PORTFOLIO_DEFAULTS` - Multi-asset portfolio settings
  - `OVERFITTING_THRESHOLDS` - Overfitting detection thresholds
  - `RISK_CATEGORIES`, `GRADE_THRESHOLDS`, `CONFIDENCE_LEVELS` - Assessment thresholds

- **`market-data.ts`** - Market Data configuration
  - `DATA_QUALITY_CONFIG` - Data validation parameters
  - `DATA_SOURCE_CONFIG` - Data source rate limits and capabilities
  - `CACHE_DEFAULTS` - Cache settings for market data, indicators, API
  - `LATENCY_CONFIG` - Latency monitoring thresholds
  - `MICROSTRUCTURE_CONFIG` - Order book analysis settings
  - `FLASH_CRASH_CONFIG` - Flash crash detection parameters
  - `QUALITY_SCORE_THRESHOLDS` - Quality assessment thresholds
  - `VOLUME_THRESHOLDS` - Volume analysis thresholds

- **`portfolio.ts`** - Portfolio Optimization configuration
  - `PORTFOLIO_OPTIMIZATION_DEFAULTS` - Optimization parameters
  - `COVARIANCE_METHODS` - Available covariance calculation methods
  - `GAP_RISK_CONFIG` - Gap risk management settings
  - `RISK_PARITY_DEFAULTS` - Risk parity configuration
  - `BLACK_LITTERMAN_CONFIG` - Black-Litterman model parameters
  - `PORTFOLIO_CONSTRAINTS` - Weight constraints
  - `PERFORMANCE_THRESHOLDS` - Performance metric thresholds
  - `REBALANCING_CONFIG` - Rebalancing frequency settings

## Usage

### Recommended: Import from specific modules

```typescript
// Import specific constants from their category
import { TECHNICAL_INDICATORS, RSI_CONFIG } from '@/app/lib/constants/technical-indicators';
import { PREDICTION_CONFIG, ENSEMBLE_WEIGHTS } from '@/app/lib/constants/prediction';
import { RISK_MANAGEMENT } from '@/app/lib/constants/risk-management';
import { SIGNAL_THRESHOLDS } from '@/app/lib/constants/trading';
import { DATA_REQUIREMENTS } from '@/app/lib/constants/common';
```

### Backward Compatible: Import from index

```typescript
// Still works for backward compatibility (exports all from all modules)
import { RSI_CONFIG, MACD_CONFIG, ENSEMBLE_WEIGHTS } from '@/app/lib/constants';
```

### Legacy: Import from root constants.ts

```typescript
// Also works but deprecated
import { RSI_CONFIG } from '@/app/lib/constants';
```

## Best Practices

### 1. Use Recommended Constants

Prefer the main consolidated constants over legacy aliases:

✅ **Recommended:**
```typescript
import { TECHNICAL_INDICATORS } from '@/app/lib/constants/technical-indicators';
const rsiPeriod = TECHNICAL_INDICATORS.RSI_PERIOD;
```

❌ **Avoid (deprecated):**
```typescript
import { RSI_CONFIG } from '@/app/lib/constants/technical-indicators';
const rsiPeriod = RSI_CONFIG.DEFAULT_PERIOD;
```

### 2. Avoid Duplicate Definitions

Do not duplicate constants across files. If a value is needed in multiple places, define it once in the appropriate module and reference it.

### 3. Use `as const` for Type Safety

All constants use `as const` to provide literal types and enable better type inference.

### 4. Group Related Constants

Keep related constants together in the same object. Use descriptive property names.

### 5. Document Deprecated Constants

Deprecated constants include comments explaining what to use instead. Update your code to use the recommended alternatives.

## Refactoring Summary (2024)

This constant structure was refactored to eliminate duplication and inconsistencies:

### Issues Fixed

1. **Removed duplicate definitions**
   - `RISK_MANAGEMENT` and `RISK_PARAMS` merged
   - `TECHNICAL_INDICATORS` consolidated with `RSI_CONFIG`, `SMA_CONFIG`, etc.
   - `PREDICTION_CONFIG` consolidated with `ML_SCORING`
   - Removed `PERCENTAGE_VALUES` and `INDEX_VALUES` (simple number aliases)

2. **Resolved value inconsistencies**
   - RSI thresholds unified (OVERSOLD: 30, OVERBOUGHT: 70)
   - SMA periods clarified (SHORT: 10, MEDIUM: 50, LONG: 200)
   - Signal thresholds unified in `SIGNAL_THRESHOLDS`

3. **Improved organization**
   - Each category has its own file
   - Clear separation of concerns
   - Backward compatibility maintained via re-exports

### Migration Checklist

- [ ] Replace `CONFIDENCE_THRESHOLDS` with `SIGNAL_THRESHOLDS`
- [ ] Replace `PERCENTAGE_VALUES` and `INDEX_VALUES` with literal values
- [ ] Replace `RISK_PARAMS` and `POSITION_SIZING` with `RISK_MANAGEMENT`
- [ ] Replace `RSI_CONFIG`, `SMA_CONFIG`, etc. with `TECHNICAL_INDICATORS`
- [ ] Replace `ML_SCORING` with `PREDICTION_CONFIG`
- [ ] Update `DATA_QUALITY.MIN_DATA_LENGTH` to `DATA_REQUIREMENTS.MIN_DATA_POINTS`
- [ ] Update `CHART_CONFIG.MIN_DATA_POINTS` to `DATA_REQUIREMENTS.MIN_DATA_POINTS`

### REFACTOR-001 Migration (2026)

The following new modules were added to consolidate hardcoded values:

1. **ML Configuration** (`ml.ts`)
   - Replace hardcoded epochs (50, 100) with `ML_HYPERPARAMETERS.DEFAULT_EPOCHS`
   - Replace hardcoded batch sizes (32) with `ML_HYPERPARAMETERS.DEFAULT_BATCH_SIZE`
   - Replace hardcoded LSTM units (64, 32, 16) with `ML_HYPERPARAMETERS.*` values

2. **Backtest Configuration** (`backtest-config.ts`)
   - Replace hardcoded initial capital (100000, 1000000) with `BACKTEST_DEFAULTS.*`
   - Replace hardcoded commission rates (0.1) with `BACKTEST_DEFAULTS.DEFAULT_COMMISSION`
   - Replace hardcoded walk-forward sizes (252, 63) with `WALK_FORWARD_DEFAULTS.*`

3. **Market Data Configuration** (`market-data.ts`)
   - Replace hardcoded cache TTLs with `CACHE_DEFAULTS.*`
   - Replace hardcoded latency thresholds with `LATENCY_CONFIG.*`
   - Replace hardcoded data quality thresholds with `DATA_QUALITY_CONFIG.*`

4. **Portfolio Configuration** (`portfolio.ts`)
   - Replace hardcoded trading days (252) with `PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR`
   - Replace hardcoded risk-free rate (2.0) with `PORTFOLIO_OPTIMIZATION_DEFAULTS.RISK_FREE_RATE`

## Benefits

1. **Maintainability** - Easy to find and update related constants
2. **Type Safety** - All constants use `as const` for literal types
3. **Modularity** - Import only what you need
4. **Documentation** - Clear categorization makes intent obvious
5. **Backward Compatibility** - Existing code continues to work via re-exports
6. **Consistency** - Eliminated duplicate and conflicting definitions

## Environment Variables

Type-safe environment variable access is provided via `lib/config/env.ts`:

```typescript
import { config, env, validateRequiredEnvVars } from '@/app/lib/config/env';

// Access typed environment variables
if (config.isProduction) {
  validateRequiredEnvVars(['DATABASE_URL', 'NEXT_PUBLIC_APP_URL']);
}

// Access feature flags
if (config.features.mlPredictions) {
  // Enable ML prediction features
}
```

## Future Enhancements (Phase 2)

- ✅ Environment-specific configuration (`.env.development`, `.env.production`)
- ✅ Runtime configuration validation using Zod
- Dynamic configuration management service
- A/B testing support
- Feature flags integration
