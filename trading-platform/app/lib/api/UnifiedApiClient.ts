/**
 * UnifiedApiClient - Centralized API request handler
 * 
 * This module provides a unified approach to API requests across the application,
 * consolidating error handling, rate limiting, caching, and logging patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '../error-handler';
import { checkRateLimit } from '../api-middleware';
import { requireAuth } from '../auth';
import { CacheManager } from './CacheManager';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  rateLimit?: boolean;
  cache?: {
    enabled: boolean;
    ttl?: number;
    keyGenerator?: (request: NextRequest) => string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  warning?: string;
  success?: boolean;
}

/**
 * Unified API handler wrapper
 * Automatically handles auth, rate limiting, caching, and error handling
 */
export function createApiHandler<T = unknown>(
  handler: (request: NextRequest) => Promise<NextResponse<ApiResponse<T>>>,
  options: ApiHandlerOptions = {}
) {
  const { requireAuth: needsAuth = false, rateLimit = true, cache } = options;

  // Create cache manager if caching is enabled
  const cacheManager = cache?.enabled 
    ? new CacheManager<NextResponse<ApiResponse<T>>>({ ttl: cache.ttl })
    : null;

  return async (request: NextRequest): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      // Authentication check
      if (needsAuth) {
        const authError = requireAuth(request);
        if (authError) return authError as NextResponse<ApiResponse<T>>;
      }

      // Rate limiting
      if (rateLimit) {
        const rateLimitResponse = checkRateLimit(request);
        if (rateLimitResponse) return rateLimitResponse as NextResponse<ApiResponse<T>>;
      }

      // Check cache if enabled
      if (cacheManager && cache?.keyGenerator) {
        const cacheKey = cache.keyGenerator(request);
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;
      }

      // Execute handler
      const response = await handler(request);

      // Store in cache if enabled and successful
      if (cacheManager && cache?.keyGenerator && response.status === 200) {
        const cacheKey = cache.keyGenerator(request);
        cacheManager.set(cacheKey, response);
      }

      return response;
    } catch (error) {
      return handleApiError(error, 'api-handler') as NextResponse<ApiResponse<T>>;
    }
  };
}

/**
 * Extract and validate query parameters
 */
export function getQueryParams(request: NextRequest, params: string[]): Record<string, string | null> {
  const { searchParams } = new URL(request.url);
  const result: Record<string, string | null> = {};
  
  for (const param of params) {
    result[param] = searchParams.get(param);
  }
  
  return result;
}

/**
 * Extract and validate single query parameter
 */
export function getQueryParam(request: NextRequest, param: string): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get(param);
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<T> {
  try {
    return await request.json() as T;
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, options?: { warning?: string; status?: number }): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(options?.warning && { warning: options.warning }),
    },
    { status: options?.status ?? 200 }
  );
}

/**
 * Generate cache key from request URL and query params
 */
export function generateCacheKey(request: NextRequest, prefix = ''): string {
  const url = new URL(request.url);
  const sortedParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return prefix ? `${prefix}:${sortedParams}` : sortedParams;
}

/**
 * Unified GET handler factory
 */
export function createGetHandler<T>(
  handler: (request: NextRequest, params: Record<string, string | null>) => Promise<T>,
  options: ApiHandlerOptions & { requiredParams?: string[] } = {}
) {
  return createApiHandler<T>(async (request: NextRequest) => {
    const { requiredParams = [] } = options;
    const params = getQueryParams(request, requiredParams);
    
    const result = await handler(request, params);
    return successResponse(result);
  }, options);
}

/**
 * Unified POST handler factory
 */
export function createPostHandler<TBody, TResponse>(
  handler: (request: NextRequest, body: TBody) => Promise<TResponse>,
  options: ApiHandlerOptions = {}
) {
  return createApiHandler<TResponse>(async (request: NextRequest) => {
    const body = await parseJsonBody<TBody>(request);
    const result = await handler(request, body);
    return successResponse(result);
  }, options);
}
