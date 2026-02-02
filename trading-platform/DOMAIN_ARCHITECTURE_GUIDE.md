# Domain-Driven Architecture Migration Guide

## Overview

The ULT Trading Platform has been reorganized from a technology-based structure to a domain-driven architecture for better maintainability, scalability, and code discoverability.

## New Structure

```
app/
├── domains/               # Domain layer (business logic)
│   ├── prediction/        # ML predictions and forecasting
│   │   ├── models/        # ML models and algorithms
│   │   ├── services/      # Prediction services
│   │   ├── hooks/         # Prediction-related React hooks
│   │   ├── types/         # Prediction-specific types
│   │   └── utils/         # Prediction utilities
│   ├── backtest/          # Backtesting functionality
│   │   ├── engine/        # Backtest engines and metrics
│   │   ├── strategies/    # Trading strategies
│   │   └── metrics/       # Performance metrics
│   ├── market-data/       # Market data management
│   │   ├── api/           # Data API clients
│   │   ├── websocket/     # Real-time data streams
│   │   ├── cache/         # Data caching
│   │   ├── quality/       # Data quality monitoring
│   │   └── integration/   # Multi-source aggregation
│   └── portfolio/         # Portfolio management
│       ├── PortfolioOptimizer.ts
│       ├── BlackLitterman.ts
│       └── types.ts
├── infrastructure/        # Infrastructure layer
│   ├── api/               # API infrastructure
│   │   ├── rate-limiter.ts
│   │   ├── CacheManager.ts
│   │   └── ApiValidator.ts
│   ├── websocket/         # WebSocket infrastructure
│   │   ├── ConnectionMetrics.ts
│   │   └── message-batcher.ts
│   ├── cache/             # Caching infrastructure
│   └── storage/           # Storage layer
├── ui/                    # UI layer
│   ├── components/        # React components
│   ├── hooks/             # UI-specific hooks
│   └── styles/            # Style definitions
└── shared/                # Shared resources
    ├── types/             # Common type definitions
    ├── constants/         # Global constants
    └── utils/             # Utility functions
```

## Path Aliases

The following TypeScript path aliases have been configured in `tsconfig.json`:

```typescript
{
  "@/*": ["./*"],                        // Root alias
  "@/domains/*": ["./app/domains/*"],     // Domain layer
  "@/infrastructure/*": ["./app/infrastructure/*"],  // Infrastructure
  "@/ui/*": ["./app/ui/*"],              // UI layer
  "@/shared/*": ["./app/shared/*"]       // Shared resources
}
```

## Migration Strategy

### Phase 1: Dual Path Support (Current)
Both old and new file structures exist simultaneously:
- Old paths in `app/lib/` remain functional
- New paths in `app/domains/`, `app/infrastructure/`, etc. are available
- No immediate breaking changes to existing code

### Phase 2: Update Imports (Recommended)
Gradually update imports to use the new structure:

```typescript
// OLD (still works)
import { MLModelService } from '@/app/lib/services/ml-model-service';
import { AdvancedBacktestEngine } from '@/app/lib/backtest/AdvancedBacktestEngine';

// NEW (recommended)
import { MLModelService } from '@/domains/prediction/services/ml-model-service';
import { AdvancedBacktestEngine } from '@/domains/backtest/engine/AdvancedBacktestEngine';

// BEST (using barrel exports)
import { MLModelService } from '@/domains/prediction';
import { AdvancedBacktestEngine } from '@/domains/backtest';
```

### Phase 3: Deprecate Old Paths (Future)
After all imports are updated:
- Remove files from old `app/lib/` structure
- Update documentation
- Run full test suite

## Using Barrel Exports

Each domain provides a barrel export (`index.ts`) for cleaner imports:

```typescript
// Instead of deep imports
import { MLModelService } from '@/domains/prediction/services/ml-model-service';
import { TensorFlowModelService } from '@/domains/prediction/services/tensorflow-model-service';

// Use barrel exports
import { 
  MLModelService, 
  TensorFlowModelService 
} from '@/domains/prediction';
```

## Domain Boundaries

### Prediction Domain (`@/domains/prediction`)
**Purpose**: Machine learning predictions and forecasting
- ML model training and inference
- Feature engineering
- Prediction quality monitoring
- Model drift detection

### Backtest Domain (`@/domains/backtest`)
**Purpose**: Strategy backtesting and performance evaluation
- Backtest engines (basic, advanced, realistic)
- Performance metrics and analysis
- Walk-forward analysis
- Monte Carlo simulation
- Overfitting detection

### Market Data Domain (`@/domains/market-data`)
**Purpose**: Market data acquisition and quality management
- Multi-exchange data feeds
- Real-time data streaming
- Data quality validation
- Data completion and gap filling
- Latency monitoring
- Cache management

### Portfolio Domain (`@/domains/portfolio`)
**Purpose**: Portfolio optimization and management
- Modern Portfolio Theory (MPT)
- Black-Litterman model
- Risk parity strategies
- Factor modeling
- Portfolio rebalancing

### Infrastructure Layer (`@/infrastructure`)
**Purpose**: Cross-cutting technical concerns
- API rate limiting and caching
- WebSocket connection management
- Data persistence
- System monitoring

### Shared Layer (`@/shared`)
**Purpose**: Common resources used across domains
- Type definitions
- Constants and enums
- Utility functions
- Helper methods

## Best Practices

### 1. Import from Domains, Not Infrastructure
```typescript
// ✅ Good - Import from domain
import { MLModelService } from '@/domains/prediction';

// ❌ Avoid - Don't bypass domain boundaries
import { CacheManager } from '@/infrastructure/api/CacheManager';
```

### 2. Use Barrel Exports
```typescript
// ✅ Good - Use barrel export
import { AdvancedBacktestEngine } from '@/domains/backtest';

// 🟡 Acceptable - Specific import when needed
import { AdvancedBacktestEngine } from '@/domains/backtest/engine/AdvancedBacktestEngine';
```

### 3. Keep Domain Logic Separate
- Don't import from other domains unless there's a clear dependency
- Use interfaces and types for cross-domain communication
- Infrastructure can be used by any domain

### 4. Organize by Feature, Not Technology
```typescript
// ✅ Good - Grouped by domain
domains/prediction/
  ├── services/
  ├── models/
  └── hooks/

// ❌ Bad - Grouped by technology
lib/
  ├── services/  (all services mixed)
  ├── models/    (all models mixed)
  └── hooks/     (all hooks mixed)
```

## Testing

Tests follow the same domain structure:
```
domains/prediction/
  ├── services/
  │   └── ml-model-service.ts
  └── models/
      └── ml/
          ├── MLService.ts
          └── __tests__/
              └── MLService.test.ts
```

## Benefits

1. **Better Code Discovery**: Find related code quickly by domain
2. **Clear Boundaries**: Understand domain responsibilities
3. **Easier Maintenance**: Related files are co-located
4. **Improved Onboarding**: New developers understand structure faster
5. **Scalability**: Easy to add new features within domains
6. **Reduced Coupling**: Explicit domain dependencies

## Questions?

If you have questions about:
- Where a file should go → Consider its primary business domain
- Cross-domain dependencies → Use shared types and interfaces
- Infrastructure needs → Place in `@/infrastructure`

## Related Documentation

- [TypeScript Configuration](../tsconfig.json)
- [Project Structure](.github/copilot-instructions.md)
- [Development Workflow](../README.md)

---

*Last updated: 2026-02-02*
*Status: Phase 1 - Dual Path Support*
