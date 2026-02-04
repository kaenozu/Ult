# Environment Variable Configuration

## Overview

> **補足**: WebSocket 環境変数は 2026年2月に撤去され、現行の設定検証では扱われていません。このドキュメントは HTTP/REST ベースの設定を中心に記載しています。

This document explains how environment variables are managed and validated in the ULT Trading Platform.

## Environment Validation System

The platform uses a centralized environment validation system located at `app/lib/config/env-validator.ts`. This system:

- ✅ Validates required variables in production
- ✅ Provides type-safe access to environment variables
- ✅ Offers helpful error messages when configuration is incorrect
- ✅ Caches configuration for performance
- ✅ Supports different configurations for dev/test/production

## Required Environment Variables

### Production Environment

In production (`NODE_ENV=production`), the following variables are **required**:

- `JWT_SECRET` - Authentication secret (must not be the default value)
- `DATABASE_URL` - Database connection string

### All Environments

These variables have sensible defaults but can be overridden:

- `JWT_EXPIRATION` - JWT token expiration (default: `24h`)
- `LOG_LEVEL` - Logging level (default: `debug` in dev, `info` in production)
- `ENABLE_LOGGING` - Enable/disable logging (default: `true`)
- `ENABLE_ANALYTICS` - Enable/disable analytics (default: `false` in dev, `true` in production)
- `RATE_LIMIT_MAX` - Maximum requests for rate limiting (default: `100`)

## Usage Examples

### Basic Usage

```typescript
import { getConfig } from '@/app/lib/config/env-validator';

// Get validated configuration
const config = getConfig();

// Access configuration values with type safety
console.log(config.jwt.secret);        // string
console.log(config.database.url);      // string
console.log(config.logging.level);     // 'debug' | 'info' | 'warn' | 'error'
console.log(config.analytics.enabled); // boolean
console.log(config.rateLimit.max);     // number

// Check environment
if (config.isProduction) {
  // Production-specific logic
}

if (config.isDevelopment) {
  // Development-specific logic
}
```

### Using in API Routes

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config/env-validator';

export async function GET(request: NextRequest) {
  const config = getConfig();
  
  // Use validated configuration
  if (config.analytics.enabled) {
    // Track analytics
  }
  
  return NextResponse.json({ status: 'ok' });
}
```

### Using in Services

```typescript
// app/lib/services/MyService.ts
import { getConfig } from '@/app/lib/config/env-validator';

export class MyService {
  private config = getConfig();
  
  async performAction() {
    // Use config.database.url for database operations
    const dbUrl = this.config.database.url;
    
    // Use config.logging for conditional logging
    if (this.config.logging.enabled && this.config.logging.level === 'debug') {
      console.log('Debug info');
    }
  }
}
```

## Error Handling

The validator throws `EnvironmentValidationError` when:

1. Required variables are missing in production
2. JWT_SECRET uses the default value in production
3. A numeric variable contains invalid data

Example error output:

```
❌ Environment Validation Failed:
   Missing required environment variable: JWT_SECRET

Please check your .env.local file and ensure all required variables are set.
See .env.example for reference.
```

## Testing

### In Tests

When writing tests that use environment variables, use `resetConfig()` to ensure fresh configuration:

```typescript
import { getConfig, resetConfig } from '@/app/lib/config/env-validator';

describe('My Feature', () => {
  beforeEach(() => {
    // Reset cached config before each test
    resetConfig();
    
    // Set test environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });
  
  it('should use config correctly', () => {
    const config = getConfig();
    expect(config.jwt.secret).toBe('test-secret');
  });
});
```

## Migration Guide

If you're migrating from direct `process.env` access:

### Before

```typescript
const jwtSecret = process.env.JWT_SECRET || 'default-secret';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
```

### After

```typescript
import { getConfig } from '@/app/lib/config/env-validator';

const config = getConfig();
const jwtSecret = config.jwt.secret;  // Already validated and has proper fallback
const wsUrl = config.websocket.url;   // Already validated and has proper fallback
```

## Best Practices

1. **Always use `getConfig()`** instead of direct `process.env` access for the supported variables
2. **Call `getConfig()` once** and reuse the configuration object
3. **Use `resetConfig()`** in tests when you change environment variables
4. **Add new environment variables** to the validator if they need validation
5. **Document new variables** in `.env.example` with clear descriptions

## Security Considerations

- Never commit `.env.local` - it's in `.gitignore` for a reason
- Use strong, randomly generated values for `JWT_SECRET` in production
- Use `openssl rand -base64 32` to generate secure secrets
- Prefix client-side variables with `NEXT_PUBLIC_` only when necessary
- Server-side secrets should NEVER use the `NEXT_PUBLIC_` prefix

## Troubleshooting

### "Missing required environment variable: JWT_SECRET"

**Solution**: Add `JWT_SECRET` to your `.env.local` file with a secure random value:

```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### "JWT_SECRET must be changed from default value in production"

**Solution**: You're using the default JWT_SECRET in production. Generate a new one:

```bash
openssl rand -base64 32
```

Then set it in your production environment variables.

### "Invalid number for RATE_LIMIT_MAX: abc"

**Solution**: Ensure numeric environment variables contain valid numbers:

```env
RATE_LIMIT_MAX=100  # ✅ Correct
RATE_LIMIT_MAX=abc  # ❌ Invalid
```

## Additional Resources

- [Environment Variables in Next.js](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Security Best Practices](../../SECURITY.md)
- [Deployment Guide](../README.md)
