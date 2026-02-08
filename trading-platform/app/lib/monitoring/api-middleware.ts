/**
 * API Monitoring Middleware
 * 
 * Wraps API calls to automatically track performance metrics.
 */

import { trackApiCall } from '@/app/lib/monitoring';

export interface ApiCallOptions {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

/**
 * Monitored fetch wrapper
 * Automatically tracks API call duration and success rate
 */
export async function monitoredFetch<T = unknown>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const startTime = performance.now();
  const method = options.method || 'GET';
  let status = 0;
  let success = false;

  try {
    const response = await fetch(endpoint, options);
    status = response.status;
    success = response.ok;

    const duration = performance.now() - startTime;
    
    // Track the API call
    trackApiCall(endpoint, method, duration, status, success);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Track failed API call
    trackApiCall(endpoint, method, duration, status || 500, false);
    
    throw error;
  }
}

/**
 * Monitored API route handler wrapper
 * Use this to wrap API route handlers for automatic performance tracking
 */
export function withApiMonitoring<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: unknown[]) => {
    const startTime = performance.now();
    let status = 500;
    let success = false;

    try {
      const response = await handler(...(args as Parameters<T>));
      status = response.status;
      success = response.ok;

      const duration = performance.now() - startTime;
      trackApiCall(routeName, 'API_ROUTE', duration, status, success);

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackApiCall(routeName, 'API_ROUTE', duration, status, false);
      throw error;
    }
  }) as T;
}
