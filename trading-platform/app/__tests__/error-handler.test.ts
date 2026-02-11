/**
 * @jest-environment node
 */
import {
    handleApiError,
    logError,
    validationError,
    notFoundError,
    rateLimitError,
    internalError,
    ErrorType
} from '../lib/error-handler';
import { APIError, ValidationError } from '../types';

// Mock NextResponse - simple mock with only used properties
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body: Record<string, unknown>, init?: { status?: number }) => ({
            body,
            status: init?.status || 200
        }))
    }
}));

describe('error-handler', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'test' };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('logError', () => {
        it('logs Error objects without throwing', () => {
            const error = new Error('Test Error');
            expect(() => logError(error, 'TestContext')).not.toThrow();
        });

        it('logs non-Error objects without throwing', () => {
            const error = { foo: 'bar' };
            expect(() => logError(error, 'TestContext')).not.toThrow();
        });
    });

    describe('handleApiError', () => {
        it('handles standard Error objects', () => {
            const error = new Error('Something went wrong');
            const response = handleApiError(error) as unknown as { status: number; body: Record<string, unknown> };

            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'Internal server error',
                code: ErrorType.INTERNAL
            }));
        });

        it('handles string errors', () => {
            const response = handleApiError('String Error') as unknown as { status: number; body: Record<string, unknown> };
            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'Internal server error',
                code: ErrorType.INTERNAL
            }));
        });

        it('handles unknown error types', () => {
            const response = handleApiError(null) as unknown as { status: number; body: Record<string, unknown> };
            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                code: ErrorType.INTERNAL
            }));
        });

        // Custom Error Classes Logic
        it('extracts info from ValidationError class', () => {
            const error = new ValidationError('Invalid Input', 'fieldA');
            const response = handleApiError(error) as unknown as { status: number; body: Record<string, unknown> };

            expect(response.status).toBe(400);
            expect(response.body).toEqual(expect.objectContaining({
                code: 'VALIDATION_ERROR'
            }));
        });

        it('extracts info from basic APIError with manual code', () => {
            const error = new APIError('Missing', 'NOT_FOUND', 404);
            const response = handleApiError(error);
            expect(response.status).toBe(404);
        });

        // Plain Object Fallback Logic
        it('extracts info from plain object with code (VALIDATION)', () => {
            const error = { code: 'VALIDATION_ERROR', message: 'Plain object error' };
            const response = handleApiError(error) as unknown as { status: number; body: { code: string } };

            expect(response.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('extracts info from plain object with code (RATE_LIMIT)', () => {
            const error = { code: 'RATE_LIMIT_ERROR', message: 'Slow down' };
            const response = handleApiError(error);
            expect(response.status).toBe(429);
        });

        it('extracts info from plain object with code (NETWORK)', () => {
            const error = { code: 'NETWORK_ERROR', message: 'No net' };
            const response = handleApiError(error);
            expect(response.status).toBe(502);
        });

        it('respects explicitly provided status code', () => {
            const error = new Error('Custom Status Error');
            const response = handleApiError(error, 'API', 418);
            expect(response.status).toBe(418);
        });

        it('includes debug info in non-production', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Debug Me');
            const response = handleApiError(error) as unknown as { body: { debug: { message: string } } };

            expect(response.body).toHaveProperty('debug');
            expect(response.body.debug).toEqual(expect.objectContaining({
                message: 'Debug Me'
            }));
        });

        it('excludes debug info in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Hide Me');
            const response = handleApiError(error) as unknown as { body: { debug?: unknown } };

            expect(response.body).not.toHaveProperty('debug');
        });

        it('includes details if available in mapping', () => {
            process.env.NODE_ENV = 'development';
            const error = { code: 'VALIDATION_ERROR' };
            const response = handleApiError(error) as unknown as { body: { details: string } };
            expect(response.body).toHaveProperty('details');
            expect(response.body.details).toBe('無効なパラメータが含まれています');
        });
    });

    describe('Helper functions', () => {
        it('validationError creates 400 response', () => {
            const res = validationError('Bad Input', 'fieldA') as unknown as { status: number; body: Record<string, unknown> };
            expect(res.status).toBe(400);
            expect(res.body).toEqual({
                error: 'Bad Input',
                code: ErrorType.VALIDATION,
                field: 'fieldA',
                details: 'Field: fieldA'
            });
        });

        it('notFoundError creates 404 response', () => {
            const res = notFoundError() as unknown as { status: number; body: { code: string } };
            expect(res.status).toBe(404);
            expect(res.body.code).toBe(ErrorType.NOT_FOUND);

            const res2 = notFoundError('Custom Not Found') as unknown as { body: { error: string } };
            expect(res2.body.error).toBe('Custom Not Found');
        });

        it('rateLimitError creates 429 response', () => {
            const res = rateLimitError() as unknown as { status: number; body: { code: string } };
            expect(res.status).toBe(429);
            expect(res.body.code).toBe(ErrorType.RATE_LIMIT);
        });

        it('internalError creates 500 response', () => {
            const res = internalError('Fatal') as unknown as { status: number; body: { error: string } };
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Fatal');
        });
    });
});
