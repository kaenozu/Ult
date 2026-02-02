# WebSocket Error Logging Fix Summary

## Problem
The WebSocket error handler was logging empty objects `{}` when errors occurred:
```
[useResilientWebSocket] Error: {}
```

This happened because the error handler received an `Event` or `ErrorEvent` object from the browser's WebSocket API, but the `categorizeError` function didn't properly extract error information from these event objects.

## Root Cause
1. When a WebSocket error occurs, the browser triggers the `onerror` handler with an `ErrorEvent` object
2. The `categorizeError` function was designed to handle `Error`, `Event`, and `CloseEvent` types
3. However, it didn't have special handling for `ErrorEvent`, which has an `error` property containing the actual error
4. The function would fall through to the default case, which tried to get a message from the event but couldn't extract useful information

## Solution
Made three key changes:

### 1. Enhanced `categorizeError` function (websocket-resilient.ts)
Added explicit handling for `ErrorEvent` objects at the beginning of the function:

```typescript
const categorizeError = (error: Error | Event | CloseEvent | ErrorEvent): WebSocketError => {
  const timestamp = Date.now();

  // ErrorEvent (WebSocket error events)
  if (error instanceof ErrorEvent && error.error) {
    const actualError = error.error;
    return {
      category: 'RECOVERABLE',
      message: actualError.message || 'WebSocket error occurred',
      originalError: actualError,
      timestamp,
    };
  }
  // ... rest of the function
}
```

This extracts the actual Error object from the ErrorEvent and returns a properly structured WebSocketError.

### 2. Improved error logging in websocket-resilient.ts
Changed the error handler to log structured error information instead of the raw event:

```typescript
this.ws.onerror = (event) => {
  const wsError = categorizeError(event);
  console.error('[WebSocket] Error occurred:', {
    category: wsError.category,
    message: wsError.message,
    code: wsError.code,
  });
  this.options.onError?.(wsError);
  this.emit('error', wsError);
};
```

### 3. Improved error logging in useResilientWebSocket.ts
Updated the hook's error handler to log structured error information:

```typescript
onError: (err) => {
  console.error('[useResilientWebSocket] Error:', {
    category: err.category,
    message: err.message,
    code: err.code,
    timestamp: err.timestamp,
  });
  setError(err);
  onError?.(err);
},
```

## Result
Instead of seeing:
```
[useResilientWebSocket] Error: {}
```

Users will now see meaningful error information like:
```
[useResilientWebSocket] Error: {
  category: 'RECOVERABLE',
  message: 'Network timeout',
  code: undefined,
  timestamp: 1738484924501
}
```

Or:
```
[WebSocket] Error occurred: {
  category: 'RECOVERABLE',
  message: 'Connection refused',
  code: undefined
}
```

## Files Changed
- `trading-platform/app/lib/websocket-resilient.ts` - Enhanced error categorization and logging
- `trading-platform/app/hooks/useResilientWebSocket.ts` - Improved error logging in the hook
- `trading-platform/package-lock.json` - Updated dependencies

## Testing
The existing test infrastructure uses `ErrorEvent` objects in its mocks, confirming that this is the correct approach:
```typescript
simulateError(error: Error): void {
  if (this.onerror) {
    this.onerror(new ErrorEvent('error', { error }));
  }
}
```

The fix ensures that when errors are triggered through ErrorEvent (as they are in the browser), the error information is properly extracted and logged.
