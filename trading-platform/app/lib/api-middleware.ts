/**
 * API Middleware Utilities
 * 
 * Common middleware functions for API routes to reduce duplication
 */

import { NextRequest, NextResponse } from 'next/server';
import { ipRateLimiter, getClientIp } from './ip-rate-limit';
import { rateLimitError, handleApiError } from './error-handler';

/**
 * Rate limiting middleware
 * Checks if the client IP has exceeded the rate limit
 * 
 * @returns null if allowed, NextResponse with error if rate limited
 * 
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const rateLimitResponse = checkRateLimit(request);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   
 *   // Continue with API logic
 * }
 * ```
 */
export function checkRateLimit(request: Request | NextRequest): NextResponse | null {
  const clientIp = getClientIp(request);
  if (!ipRateLimiter.check(clientIp)) {
    return rateLimitError();
  }
  return null;
}

/**
 * Wrapper for API route handlers with automatic rate limiting and error handling
 * 
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with middleware applied
 * 
 * @example
 * ```typescript
 * export const GET = withApiMiddleware(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withApiMiddleware(
  handler: (request: Request | NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: boolean;
    context?: string;
  } = {}
): (request: Request | NextRequest) => Promise<NextResponse> {
  const { rateLimit = true, context = 'API' } = options;

  return async (request: Request | NextRequest): Promise<NextResponse> => {
    try {
      // Apply rate limiting if enabled
      if (rateLimit) {
        const rateLimitResponse = checkRateLimit(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Execute handler
      return await handler(request);
    } catch (error) {
      // Automatic error handling
      return handleApiError(error, context);
    }
  };
}

/**
 * Type for API route handler
 */
export type ApiHandler = (request: Request | NextRequest) => Promise<NextResponse>;

/**
 * Create a middleware chain for API routes
 * 
 * @example
 * ```typescript
 * export const GET = createApiHandler()
 *   .use(checkRateLimit)
 *   .use(requireAuth)
 *   .handle(async (request) => {
 *     // API logic here
 *     return NextResponse.json({ success: true });
 *   });
 * ```
 */
export class ApiHandlerBuilder {
  private middlewares: Array<(request: Request | NextRequest) => NextResponse | null | Promise<NextResponse | null>> = [];

  /**
   * Add a middleware to the chain
   */
  use(
    middleware: (request: Request | NextRequest) => NextResponse | null | Promise<NextResponse | null>
  ): ApiHandlerBuilder {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Set the final handler and return the composed function
   */
  handle(
    handler: (request: Request | NextRequest) => Promise<NextResponse>
  ): ApiHandler {
    return async (request: Request | NextRequest): Promise<NextResponse> => {
      // Execute middlewares in order
      for (const middleware of this.middlewares) {
        const result = await middleware(request);
        if (result) {
          // Middleware returned a response, stop execution
          return result;
        }
      }

      // All middlewares passed, execute handler
      try {
        return await handler(request);
      } catch (error) {
        return handleApiError(error, 'API');
      }
    };
  }
}

/**
 * Create a new API handler builder
 */
export function createApiHandler(): ApiHandlerBuilder {
  return new ApiHandlerBuilder();
}

/**
 * CSRF Protection
 * Import and use: import { csrfTokenMiddleware, requireCSRF } from '@/app/lib/csrf/csrf-protection'
 * 
 * Usage in API routes:
 * 
 * export async function GET(req: NextRequest) {
 *   // Set CSRF token cookie
 *   const csrfSet = csrfTokenMiddleware(req);
 *   if (csrfSet) return csrfSet; // or combine with other responses
 *   
 *   // Your GET logic...
 * }
 * 
 * export async function POST(req: NextRequest) {
 *   // CSRF is automatically validated via middleware wrapper
 *   const body = await req.json();
 *   // Your POST logic...
 * }
 */
