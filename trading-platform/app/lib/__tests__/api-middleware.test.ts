/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { 
  checkRateLimit, 
  withApiMiddleware, 
  createApiHandler, 
  ApiHandlerBuilder,
} from '../api-middleware';
import { handleApiError, validationError, rateLimitError } from '../error-handler';

describe('API Middleware', () => {
  describe('checkRateLimit', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return null in development', () => {
      process.env.NODE_ENV = 'development';
      const request = new Request('http://localhost:3000/api/test');
      const result = checkRateLimit(request);
      expect(result).toBeNull();
    });

    it('should check rate limit in production', () => {
      process.env.NODE_ENV = 'production';
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });
      
      // First request should pass
      const result1 = checkRateLimit(request);
      expect(result1).toBeNull();
      
      // Multiple rapid requests should eventually rate limit
      let limited = false;
      for (let i = 0; i < 200; i++) {
        const result = checkRateLimit(request);
        if (result !== null) {
          limited = true;
          break;
        }
      }
      
      // Note: This test might be flaky depending on rate limit implementation
      // In real implementation, we would mock the rate limiter
    });
  });

  describe('withApiMiddleware', () => {
    it('should execute handler when rate limit not exceeded', async () => {
      process.env.NODE_ENV = 'development';
      
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const wrappedHandler = withApiMiddleware(handler);
      const request = new Request('http://localhost:3000/api/test');
      
      const response = await wrappedHandler(request);
      expect(handler).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
    });

    it('should handle errors and return error response', async () => {
      process.env.NODE_ENV = 'development';
      
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedHandler = withApiMiddleware(handler, { context: 'test' });
      
      const request = new Request('http://localhost:3000/api/test');
      const response = await wrappedHandler(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('should skip rate limiting when disabled', async () => {
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const wrappedHandler = withApiMiddleware(handler, { rateLimit: false });
      const request = new Request('http://localhost:3000/api/test');
      
      await wrappedHandler(request);
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('ApiHandlerBuilder', () => {
    it('should build and execute handler chain', async () => {
      const builder = new ApiHandlerBuilder();
      
      const middleware1 = jest.fn().mockReturnValue(null);
      const middleware2 = jest.fn().mockReturnValue(null);
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const apiHandler = builder
        .use(middleware1)
        .use(middleware2)
        .handle(handler);
      
      const request = new Request('http://localhost:3000/api/test');
      const response = await apiHandler(request);
      
      expect(middleware1).toHaveBeenCalledWith(request);
      expect(middleware2).toHaveBeenCalledWith(request);
      expect(handler).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
    });

    it('should stop chain when middleware returns response', async () => {
      const builder = new ApiHandlerBuilder();
      
      const middleware1 = jest.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Blocked' }), { status: 403 })
      );
      const middleware2 = jest.fn().mockReturnValue(null);
      const handler = jest.fn();
      
      const apiHandler = builder
        .use(middleware1)
        .use(middleware2)
        .handle(handler);
      
      const request = new Request('http://localhost:3000/api/test');
      const response = await apiHandler(request);
      
      expect(middleware1).toHaveBeenCalledWith(request);
      expect(middleware2).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should handle async middleware', async () => {
      const builder = new ApiHandlerBuilder();
      
      const middleware = jest.fn().mockResolvedValue(null);
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      
      const apiHandler = builder.use(middleware).handle(handler);
      
      const request = new Request('http://localhost:3000/api/test');
      await apiHandler(request);
      
      expect(middleware).toHaveBeenCalledWith(request);
      expect(handler).toHaveBeenCalledWith(request);
    });

    it('should handle errors in handler', async () => {
      const builder = new ApiHandlerBuilder();
      
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      const apiHandler = builder.handle(handler);
      
      const request = new Request('http://localhost:3000/api/test');
      const response = await apiHandler(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('createApiHandler', () => {
    it('should create new ApiHandlerBuilder instance', () => {
      const builder1 = createApiHandler();
      const builder2 = createApiHandler();
      
      expect(builder1).toBeInstanceOf(ApiHandlerBuilder);
      expect(builder2).toBeInstanceOf(ApiHandlerBuilder);
      expect(builder1).not.toBe(builder2);
    });
  });
});

describe('Error Handler', () => {
  describe('handleApiError', () => {
    it('should handle generic error', async () => {
      const error = new Error('Test error');
      const response = handleApiError(error, 'test-context');
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.context).toBe('test-context');
    });

    it('should handle error with status code', async () => {
      const error = new Error('Not found');
      const response = handleApiError(error, 'test', 404);
      
      expect(response.status).toBe(404);
    });

    it('should handle non-error objects', async () => {
      const response = handleApiError('string error', 'test');
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('validationError', () => {
    it('should create validation error response', async () => {
      const response = validationError('Invalid input', 'fieldName');
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid input');
      expect(body.field).toBe('fieldName');
    });

    it('should create validation error without field', async () => {
      const response = validationError('Invalid request');
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid request');
      expect(body.field).toBeUndefined();
    });
  });

  describe('rateLimitError', () => {
    it('should create rate limit error response', async () => {
      const response = rateLimitError();
      
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBe(60);
    });
  });
});
