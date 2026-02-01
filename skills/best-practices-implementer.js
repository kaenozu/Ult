// Best Practices Implementer - Automated Fix Examples
// This file contains reusable patterns for fixing common code issues

// ============================================================================
// Pattern 1: AbortController with Timeout
// ============================================================================

/**
 * Wraps fetch with AbortController and timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Fetch response with timeout protection
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Pattern 2: Memory Leak Prevention in React Hooks
// ============================================================================

/**
 * Creates an isMounted ref for cleanup
 * @returns Object with isMounted ref and cleanup function
 */
export function createMountedRef() {
  const isMountedRef = { current: true };

  const cleanup = () => {
    isMountedRef.current = false;
  };

  return { isMountedRef, cleanup };
}

// ============================================================================
// Pattern 3: Type-Safe API Response Handler
// ============================================================================

/**
 * Type guard for API error responses
 */
export function isApiError<T>(data: T | { error?: string }): data is { error: string } {
  return typeof data === 'object' && data !== null && 'error' in data;
}

/**
 * Handles API response with type safety
 * @param response - Fetch response
 * @param expectedType - Expected response type for type assertion
 * @returns Parsed and validated data
 * @throws APIError if response contains error
 */
export async function handleApiResponse<T>(
  response: Response,
  expectedType?: new () => T
): Promise<T> {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (isApiError(data)) {
    throw new Error(data.error);
  }

  return data as T;
}

// ============================================================================
// Pattern 4: Retry Logic with Exponential Backoff
// ============================================================================

/**
 * Retries a function with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// ============================================================================
// Pattern 5: Request Deduplication
// ============================================================================

/**
 * Creates a deduplicated request cache
 * @returns Object with cachedFetch and clearCache
 */
export function createRequestDeduplicator() {
  const pendingRequests = new Map<string, Promise<any>>();

  async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Return existing promise if request is in flight
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    // Create new request
    const promise = fetcher()
      .then(result => {
        pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        pendingRequests.delete(key);
        throw error;
      });

    pendingRequests.set(key, promise);
    return promise;
  }

  function clearCache() {
    pendingRequests.clear();
  }

  return { cachedFetch, clearCache };
}

// ============================================================================
// Pattern 6: Safe Async State Update
// ============================================================================

/**
 * Safely updates React state from async operations
 * @param setState - React setState function
 * @param isMounted - isMounted ref
 * @param value - New value or updater function
 */
export function safeStateUpdate<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  isMounted: { current: boolean },
  value: T | ((prev: T) => T)
): void {
  if (isMounted.current) {
    setState(value);
  }
}

// ============================================================================
// Pattern 7: Environment Variable Validation
// ============================================================================

/**
 * Validates required environment variables
 * @param envVars - Array of environment variable names
 * @throws Error if any required variable is missing
 */
export function validateEnvVars(envVars: string[]): void {
  const missing = envVars.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Gets an environment variable with validation
 * @param name - Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is not set or empty
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Required environment variable '${name}' is not set`);
  }

  // Security: Prevent usage of placeholder keys
  const insecurePatterns = ['your_api_key_here', 'example', 'placeholder', 'xxx'];
  if (insecurePatterns.some(pattern => value.toLowerCase().includes(pattern))) {
    throw new Error(
      `Insecure environment variable '${name}' detected. Please use a real value.`
    );
  }

  return value;
}

// ============================================================================
// Pattern 8: Rate Limiting
// ============================================================================

/**
 * Creates a rate limiter
 * @param maxRequests - Maximum requests per window
 * @param windowMs - Window duration in milliseconds
 * @returns Object with canMakeRequest and recordRequest
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number
) {
  const requests: number[] = [];

  function canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove requests outside the window
    const recentRequests = requests.filter(t => t > windowStart);
    requests.length = 0;
    requests.push(...recentRequests);

    return requests.length < maxRequests;
  }

  function recordRequest(): void {
    requests.push(Date.now());
  }

  async function executeWithLimit<T>(fn: () => Promise<T>): Promise<T> {
    while (!canMakeRequest()) {
      const oldestRequest = requests[0];
      const waitTime = oldestRequest + windowMs - Date.now() + 1;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
    }

    recordRequest();
    return fn();
  }

  return { executeWithLimit, canMakeRequest };
}

// ============================================================================
// Pattern 9: Error Boundary with Context
// ============================================================================

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
}

export interface ErrorContextValue {
  error: ErrorInfo | null;
  setError: (error: ErrorInfo | null) => void;
  clearError: () => void;
}

/**
 * Creates error context with proper typing
 */
export function createErrorContext() {
  const ErrorContext = React.createContext<ErrorContextValue | null>(null);

  function ErrorProvider({ children }: { children: React.ReactNode }) {
    const [error, setError] = React.useState<ErrorInfo | null>(null);

    const clearError = () => setError(null);

    return (
      <ErrorContext.Provider value={{ error, setError, clearError }}>
        {children}
      </ErrorContext.Provider>
    );
  }

  function useError(): ErrorContextValue {
    const context = React.useContext(ErrorContext);
    if (!context) {
      throw new Error('useError must be used within ErrorProvider');
    }
    return context;
  }

  return { ErrorProvider, useError };
}

// ============================================================================
// Pattern 10: Performance Monitoring
// ============================================================================

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

export function createPerformanceMonitor() {
  const metrics: PerformanceMetric[] = [];

  function measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
  function measure<T>(name: string, fn: () => T): T;
  function measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        metrics.push({ name, duration, timestamp: Date.now() });
      });
    }

    const duration = performance.now() - start;
    metrics.push({ name, duration, timestamp: Date.now() });
    return result;
  }

  function getMetrics(): PerformanceMetric[] {
    return [...metrics];
  }

  function getAverageDuration(name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  function clearMetrics(): void {
    metrics.length = 0;
  }

  return { measure, getMetrics, getAverageDuration, clearMetrics };
}
