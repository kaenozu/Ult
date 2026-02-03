# Type-Safe Configuration Migration Guide

## Overview

The configuration system has been refactored to provide compile-time type safety and runtime validation using:

- **Branded Types**: Prevent unit confusion (e.g., mixing milliseconds with seconds)
- **Zod Validation**: Runtime validation of configuration values
- **Environment Variables**: Type-safe environment variable loading

## Quick Start

### Using Configuration

```typescript
import { 
  RISK_MANAGEMENT, 
  CACHE_CONFIG, 
  SIGNAL_THRESHOLDS 
} from '@/app/lib/constants';

// All configs are validated and type-safe
const stopLoss = RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT; // Type: number
const cacheTTL = CACHE_CONFIG.DEFAULT_DURATION_MS; // Type: Milliseconds
```

### Using Branded Types

```typescript
import { 
  milliseconds, 
  seconds, 
  percentage,
  type Milliseconds 
} from '@/app/types/branded';

// Create branded types
const timeout: Milliseconds = milliseconds(5000);

// Convert between units
const timeoutInSeconds = seconds.fromMs(timeout); // 5

// Type safety prevents mistakes
const wrongAssignment: Seconds = timeout; // ❌ TypeScript error!
```

## Key Changes

### 1. Configuration Files

#### New Files
- `app/types/branded.ts` - Branded types for units
- `app/config/schema.ts` - Zod validation schemas
- `app/config/env.ts` - Environment variable loading
- `app/config/index.ts` - Validated configuration exports

#### Modified Files
- `app/lib/constants.ts` - Now re-exports validated configs

### 2. Branded Types Available

#### Time Units
- `Milliseconds` - For time in milliseconds
- `Seconds` - For time in seconds  
- `Minutes` - For time in minutes
- `Hours` - For time in hours
- `Days` - For time in days

#### Percentage Units
- `Percentage` - For 0-100 scale percentages
- `DecimalPercentage` - For 0-1 scale decimals
- `Ratio` - For 0-1 scale ratios

#### Other Units
- `Currency` - For monetary values
- `Points` - For index points
- `Count` - For counting items
- `Index` - For array indices

### 3. Configuration Validation

All configuration objects are now validated at module load time:

```typescript
// This will throw if weights don't sum to 1.0
export const ENSEMBLE_WEIGHTS = {
  RF: 0.35,
  XGB: 0.35,
  LSTM: 0.30, // Must sum to 1.0
};
```

### 4. Environment Variables

Environment variables are now type-safe and validated:

```typescript
import { getEnv, isProduction } from '@/app/config/env';

const env = getEnv();
const wsUrl = env.NEXT_PUBLIC_WS_URL; // Type: string (validated as URL)
const cacheT TL = env.CACHE_TTL; // Type: number (validated as positive integer)

if (isProduction()) {
  // Production-only logic
}
```

## Migration Guide

### Migrating Existing Code

#### Before
```typescript
const CACHE_TTL = 5 * 60 * 1000; // What unit is this?
setTimeout(() => {}, CACHE_TTL);
```

#### After
```typescript
import { milliseconds, type Milliseconds } from '@/app/types/branded';

const CACHE_TTL: Milliseconds = milliseconds(5 * 60 * 1000);
setTimeout(() => {}, CACHE_TTL); // Type-safe!
```

### Adding New Configuration

1. Define the Zod schema in `app/config/schema.ts`:

```typescript
export const MyConfigSchema = z.object({
  TIMEOUT_MS: z.number().int().positive(),
  THRESHOLD: z.number().min(0).max(100),
});

export type MyConfig = z.infer<typeof MyConfigSchema>;
```

2. Add validated config in `app/config/index.ts`:

```typescript
export const MY_CONFIG: MyConfig = validateConfig(MyConfigSchema, {
  TIMEOUT_MS: 30000,
  THRESHOLD: 80,
});
```

3. Re-export from `app/lib/constants.ts`:

```typescript
export { MY_CONFIG } from '../config';
```

## Testing

### Running Tests

```bash
# Test branded types
npm test app/types/__tests__/branded.test.ts

# Test configuration schemas
npm test app/config/__tests__/schema.test.ts
```

### Writing Tests

```typescript
import { validateConfig, MyConfigSchema } from '@/app/config/schema';

it('should validate config', () => {
  const config = { TIMEOUT_MS: 30000, THRESHOLD: 80 };
  expect(() => validateConfig(MyConfigSchema, config)).not.toThrow();
});

it('should reject invalid config', () => {
  const config = { TIMEOUT_MS: -1, THRESHOLD: 80 };
  expect(() => validateConfig(MyConfigSchema, config)).toThrow();
});
```

## Benefits

### Compile-Time Safety
```typescript
// ❌ TypeScript will catch this
const ms: Milliseconds = milliseconds(1000);
const sec: Seconds = ms; // Error: Type mismatch

// ✅ Must use conversion
const sec: Seconds = seconds.fromMs(ms);
```

### Runtime Validation
```typescript
// ❌ This will throw at module load time
const WEIGHTS = {
  RF: 0.5,
  XGB: 0.5,
  LSTM: 0.5, // Sum = 1.5, throws error!
};
```

### Self-Documenting
```typescript
// Before: unclear unit
const TIMEOUT = 5000;

// After: clear unit
const TIMEOUT: Milliseconds = milliseconds(5000);
```

## Common Patterns

### Converting Between Units

```typescript
import { milliseconds, seconds, minutes } from '@/app/types/branded';

const ms = milliseconds(300000); // 5 minutes
const sec = seconds.fromMs(ms);  // 300 seconds
const min = minutes.fromMs(ms);  // 5 minutes
```

### Working with Percentages

```typescript
import { percentage, ratio } from '@/app/types/branded';

const pct = percentage.create(75);        // 75%
const r = percentage.toRatio(pct);        // 0.75
const backToPct = ratio.toPercentage(r);  // 75%
```

### Environment-Specific Configuration

```typescript
import { getEnv, isProduction, isDevelopment } from '@/app/config/env';

const config = getEnv();

if (isProduction()) {
  console.log('Using production settings');
  // Use config.ALPHA_VANTAGE_API_KEY (required in production)
}

if (isDevelopment()) {
  console.log('Using development settings');
  // More lenient settings
}
```

## Troubleshooting

### Configuration Validation Errors

If you see errors like `Invalid configuration: ...`, check:

1. All required fields are present
2. Values are within valid ranges
3. Related fields have correct relationships (e.g., MIN < MAX)

### Type Errors

If you see type errors with branded types:

```typescript
// ❌ Don't do this
const timeout = 5000;
myFunction(timeout); // Error if myFunction expects Milliseconds

// ✅ Do this
const timeout = milliseconds(5000);
myFunction(timeout);
```

### Environment Variable Errors

If environment validation fails:

1. Check `.env.local` file exists
2. Verify all required variables are set
3. Check values match expected types (e.g., URLs, numbers)

## Resources

- [Branded Types Pattern](https://basarat.gitbook.io/typescript/main-1/nominaltyping)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

## Support

For questions or issues:

1. Check this documentation
2. Review test files for examples
3. Open a GitHub issue
