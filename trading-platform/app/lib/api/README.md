# Unified API Utilities

This directory contains centralized utilities for API development, reducing code duplication and improving consistency across the application.

## Components

### 1. CacheManager (`CacheManager.ts`)
Unified caching solution with TTL support and LRU eviction.

```typescript
import { CacheManager } from '@/app/lib/api';

const cache = new CacheManager<DataType>({ 
  ttl: 300000, // 5 minutes
  maxSize: 1000 
});

// Simple get/set
cache.set('key', data);
const cached = cache.get('key');

// Or use getOrFetch pattern
const data = await cache.getOrFetch('key', async () => {
  return await fetchData();
});
```

### 2. ApiValidator (`ApiValidator.ts`)
Centralized validation utilities for common API patterns.

```typescript
import { validateSymbol, validateDate, validateInterval } from '@/app/lib/api';

// Individual validators
const symbolError = validateSymbol(symbol, true);
if (symbolError) return symbolError;

// Or batch validation
const error = validateFields([
  { value: symbol, fieldName: 'symbol', required: true, pattern: /^[A-Z0-9]+$/ },
  { value: date, fieldName: 'date', required: false, pattern: /^\d{4}-\d{2}-\d{2}$/ },
]);
```

### 3. UnifiedApiClient (`UnifiedApiClient.ts`)
Factory functions for creating consistent API handlers with automatic auth, rate limiting, caching, and error handling.

```typescript
import { createGetHandler, createPostHandler } from '@/app/lib/api';

// GET handler with caching
export const GET = createGetHandler(
  async (request, params) => {
    // Your logic here
    return data;
  },
  {
    rateLimit: true,
    cache: {
      enabled: true,
      ttl: 60000,
      keyGenerator: (req) => generateCacheKey(req, 'prefix'),
    },
  }
);

// POST handler with auth
export const POST = createPostHandler<RequestBody, ResponseData>(
  async (request, body) => {
    // Your logic here
    return result;
  },
  {
    requireAuth: true,
    rateLimit: true,
  }
);
```

## Migration Guide

### Before: Traditional API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    // Validation
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    if (!symbol || !/^[A-Z0-9]+$/.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    // Business logic
    const data = await fetchData(symbol);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### After: Using Unified Utilities

```typescript
import { createApiHandler, getQueryParam, validateSymbol, successResponse } from '@/app/lib/api';

export const GET = createApiHandler(
  async (request) => {
    // Validation (auto error handling)
    const symbol = getQueryParam(request, 'symbol');
    const error = validateSymbol(symbol);
    if (error) return error;

    // Business logic
    const data = await fetchData(symbol!);
    
    return successResponse(data);
  },
  {
    rateLimit: true,
    cache: {
      enabled: process.env.NODE_ENV !== 'test',
      ttl: 60000,
      keyGenerator: (req) => generateCacheKey(req, 'data'),
    },
  }
);
```

## Benefits

1. **Reduced Duplication**: ~50 lines of boilerplate per route eliminated
2. **Consistency**: All routes use the same error handling, validation, and caching patterns
3. **Type Safety**: Full TypeScript support with proper typing
4. **Testability**: Cache can be disabled in tests, unified mocking points
5. **Maintainability**: Changes to auth/rate-limiting/caching affect all routes automatically

## Testing

All utilities have comprehensive test coverage:

- `CacheManager.test.ts` - 16 tests covering TTL, LRU, getOrFetch patterns
- `ApiValidator.test.ts` - 29 tests covering all validators
- API route tests automatically test the integrated behavior

## Best Practices

1. **Always validate inputs** using the provided validators
2. **Use cache for read-heavy endpoints** (GET requests)
3. **Disable cache in test environment** with `process.env.NODE_ENV !== 'test'`
4. **Use type parameters** in createPostHandler for request/response types
5. **Generate meaningful cache keys** that include all relevant query params

## Future Enhancements

- [ ] Add request/response logging middleware
- [ ] Add performance monitoring integration
- [ ] Create unified WebSocket handler
- [ ] Add GraphQL support
- [ ] Add OpenAPI schema generation from validators
