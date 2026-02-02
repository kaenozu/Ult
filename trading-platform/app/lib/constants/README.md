# Constants Organization

This directory contains centralized configuration constants for the ULT trading platform.

## Structure

Constants are organized by category into separate modules:

### Core Modules

- **`prediction.ts`** - ML model configuration
  - Ensemble model weights (RF, XGB, LSTM)
  - ML scoring thresholds and parameters
  - Forecast cone configuration
  - Price calculation parameters

- **`technical-indicators.ts`** - Technical analysis configuration
  - RSI (Relative Strength Index) settings
  - SMA (Simple Moving Average) periods
  - MACD settings
  - Bollinger Bands configuration
  - ATR and volatility parameters

- **`risk-management.ts`** - Position sizing and risk parameters
  - Stop loss and take profit percentages
  - Kelly fraction and position sizing
  - Risk thresholds

- **`trading.ts`** - Trading signal configuration
  - Signal confidence thresholds
  - Market correlation parameters
  - Order configuration

- **`backtest.ts`** - Backtesting configuration
  - Minimum data requirements
  - Performance metrics thresholds

### UI and Visualization

- **`chart.ts`** - Chart visualization settings
  - Volume profile display
  - Candlestick colors
  - Grid and overlay settings

- **`ui.ts`** - User interface styling
  - Signal colors (buy/sell/hold)
  - Confidence level colors
  - Button styles and text sizes

### Infrastructure

- **`api.ts`** - API and data layer configuration
  - Cache settings
  - Rate limiting
  - Data quality requirements

- **`common.ts`** - Common values and utilities
  - Data requirements
  - Confidence thresholds
  - Common percentage values and multipliers

- **`intervals.ts`** - Time interval constants
  - Market data intervals
  - Intraday vs daily intervals

## Usage

### Recommended: Import from specific modules

```typescript
// Import specific constants from their category
import { RSI_CONFIG, MACD_CONFIG } from '@/app/lib/constants/technical-indicators';
import { ENSEMBLE_WEIGHTS, ML_SCORING } from '@/app/lib/constants/prediction';
import { RISK_MANAGEMENT } from '@/app/lib/constants/risk-management';
```

### Backward Compatible: Import from index

```typescript
// Still works for backward compatibility
import { RSI_CONFIG, MACD_CONFIG, ENSEMBLE_WEIGHTS } from '@/app/lib/constants';
```

### Legacy: Import from root constants.ts

```typescript
// Also works but deprecated
import { RSI_CONFIG } from '@/app/lib/constants';
```

## Benefits

1. **Maintainability** - Easy to find and update related constants
2. **Type Safety** - All constants use `as const` for literal types
3. **Modularity** - Import only what you need
4. **Documentation** - Clear categorization makes intent obvious
5. **Backward Compatibility** - Existing code continues to work

## Migration Guide

When adding new constants:

1. Determine the appropriate category
2. Add the constant to the relevant module file
3. Export it from that file
4. It will automatically be available via `constants/index.ts`

Example:

```typescript
// In constants/technical-indicators.ts
export const NEW_INDICATOR = {
  PERIOD: 20,
  THRESHOLD: 0.5,
} as const;
```

The constant is now available:
- Directly: `import { NEW_INDICATOR } from '@/app/lib/constants/technical-indicators';`
- Via index: `import { NEW_INDICATOR } from '@/app/lib/constants';`
- Legacy: `import { NEW_INDICATOR } from '@/app/lib/constants';`

## Future Enhancements (Phase 2)

- Environment-specific configuration (`.env.development`, `.env.production`)
- Runtime configuration validation using Zod
- Dynamic configuration management service
- A/B testing support
