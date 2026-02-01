# Performance Monitoring and Error Tracking

This document describes the comprehensive monitoring and error tracking implementation for the ULT Trading Platform.

## Overview

The monitoring system provides:
- **Core Web Vitals tracking** (LCP, FID, CLS, FCP, TTFB)
- **Error tracking** with Sentry
- **Custom metrics** for API, WebSocket, and rendering performance
- **Real User Monitoring (RUM)**
- **Performance budgets** and alerts

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Sentry DSN (get from https://sentry.io/)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Environment (development, staging, production)
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development

# Traces sample rate (0.0-1.0, use 0.1 in production)
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0

# Enable Web Vitals tracking
NEXT_PUBLIC_ENABLE_WEB_VITALS=true
```

### 2. Sentry Project Setup

1. Create account at https://sentry.io/
2. Create a new Next.js project
3. Copy the DSN and add to `.env.local`
4. (Optional) Set `SENTRY_ORG` and `SENTRY_PROJECT` for source map uploads

## Features

### 1. Core Web Vitals Monitoring

Automatically tracks:
- **LCP (Largest Contentful Paint)**: Target < 2.5s
- **INP (Interaction to Next Paint)**: Target < 200ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1
- **FCP (First Contentful Paint)**: Target < 1.8s
- **TTFB (Time to First Byte)**: Target < 800ms

```typescript
// Automatic tracking - no code needed
// Metrics are logged to console and sent to Sentry
```

### 2. API Call Monitoring

Track API call performance and success rates:

```typescript
import { monitoredFetch } from '@/app/lib/monitoring/api-middleware';

// Automatically tracks duration and success rate
const data = await monitoredFetch('/api/market-data', {
  method: 'GET',
});

// Or use the convenience function
import { trackApiCall } from '@/app/lib/monitoring';

trackApiCall('/api/endpoint', 'POST', duration, status, success);
```

### 3. WebSocket Monitoring

Track WebSocket connection health:

```typescript
import { createMonitoredWebSocket } from '@/app/lib/monitoring/websocket';

// Creates a WebSocket with automatic monitoring
const ws = createMonitoredWebSocket('ws://localhost:3001');

// Or manually track events
import { trackWebSocket } from '@/app/lib/monitoring';

trackWebSocket('connect', true, duration);
trackWebSocket('error', false, undefined, 'Connection failed');
```

### 4. Component Render Tracking

Track component render performance:

```typescript
import { useRenderTracking } from '@/app/lib/monitoring/hooks';

function MyComponent() {
  // Automatically tracks render time
  useRenderTracking('MyComponent', [dep1, dep2]);
  
  return <div>Content</div>;
}

// Or manually track
import { trackRender } from '@/app/lib/monitoring';

trackRender('ComponentName', duration, renderCount);
```

### 5. Error Tracking

Capture and track errors:

```typescript
import { captureError, monitoring } from '@/app/lib/monitoring';

try {
  // Your code
} catch (error) {
  captureError(error, { context: 'additional info' });
}

// Set user context for better debugging
monitoring.setUserContext({
  id: 'user-123',
  email: 'user@example.com',
  username: 'john_doe',
});

// Add breadcrumbs for debugging
monitoring.addBreadcrumb('User clicked button', {
  buttonId: 'submit-trade',
});
```

## Performance Budgets

Configured budgets will trigger warnings:

| Metric | Budget | Warning Threshold |
|--------|--------|-------------------|
| LCP | 2500ms | 2000ms |
| INP | 200ms | 150ms |
| CLS | 0.1 | 0.05 |
| FCP | 1800ms | 1500ms |
| TTFB | 800ms | 600ms |
| API Response | 1000ms | 750ms |
| Component Render | 100ms | 75ms |

## Viewing Metrics

### In Development

Metrics are logged to the browser console:
```
[Web Vitals] LCP: 2000.00ms (rating: good)
[API] Slow response: GET /api/market-data took 1200.00ms
[Render] Slow render: StockChart took 150.00ms
```

### Performance Summary

Get a complete performance summary:

```typescript
import { monitoring } from '@/app/lib/monitoring';

const summary = monitoring.getPerformanceSummary();
console.log(summary);
// {
//   webVitals: { LCP: { value: 2000, rating: 'good', ... }, ... },
//   apiSuccessRate: 95.5,
//   webSocketSuccessRate: 98.2,
//   averageApiResponseTime: 450,
//   slowestApiCalls: [...],
//   slowestRenders: [...],
// }
```

### In Sentry Dashboard

1. Navigate to your Sentry project
2. View **Performance** tab for:
   - Transaction traces
   - Web Vitals trends
   - Slow API endpoints
3. View **Issues** tab for:
   - Error rates
   - Error grouping
   - Stack traces with source maps

## Integration Points

### Automatic Integration

Monitoring is automatically initialized in:
- `app/layout.tsx` - Root layout with MonitoringProvider
- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration

### Manual Integration

For custom monitoring needs:

```typescript
// Import the monitoring service
import { monitoring } from '@/app/lib/monitoring';

// Record custom metrics
monitoring.recordMetric('custom.metric', value);

// Get specific metrics
const avg = monitoring.getAverageMetric('api.response');

// Get Web Vitals
const webVitals = monitoring.getWebVitals();
```

## Best Practices

1. **Don't over-monitor**: Focus on critical paths and user-facing operations
2. **Set appropriate sample rates**: Use lower rates in production (0.1-0.2)
3. **Filter noise**: The monitoring service filters expected network errors
4. **Monitor trends**: Track metrics over time, not just individual events
5. **Set up alerts**: Configure Sentry alerts for critical performance degradation

## Troubleshooting

### Metrics not appearing

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set in `.env.local`
2. Verify Sentry project is configured correctly
3. Check browser console for initialization messages
4. Ensure you're not blocking Sentry domain in ad-blockers

### High error rates

1. Review Sentry Issues tab for error details
2. Check if errors are expected (network timeouts, etc.)
3. Adjust `beforeSend` filter in `app/lib/monitoring/index.ts`

### Performance warnings

1. Review console warnings for specific operations
2. Check if operations exceed performance budgets
3. Optimize slow operations or adjust budgets
4. Use React DevTools Profiler for component optimization

## Testing

Run monitoring tests:

```bash
npm test app/lib/monitoring/__tests__
```

## Further Reading

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Budgets Guide](https://web.dev/performance-budgets-101/)
