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
        json: jest.fn((body: Record<string, any>, init?: { status?: number }) => ({
            body,
            status: init?.status || 200
        }))
    }
}));

describe('error-handler', () => {
    const originalEnv = { ...process.env };
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'test' };
    });

    afterAll(() => {
        process.env = originalEnv;
        mockConsoleError.mockRestore();
    });

    describe('logError', () => {
        it('logs Error objects with stack', () => {
            const error = new Error('Test Error');
            logError(error, 'TestContext');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Error:'),
                expect.objectContaining({
                    name: 'Error',
                    message: 'Test Error',
                    stack: expect.any(String)
                })
            );
        });

        it('logs non-Error objects directly', () => {
            const error = { foo: 'bar' };
            logError(error, 'TestContext');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Unknown error:'),
                error
            );
        });
    });

    describe('handleApiError', () => {
        it('handles standard Error objects', () => {
            const error = new Error('Something went wrong');
            const response = handleApiError(error) as any;

            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'Something went wrong', // Default internal error message
                code: ErrorType.INTERNAL
            }));
        });

        it('handles string errors', () => {
            const response = handleApiError('String Error') as any;
            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'String Error',
                code: ErrorType.INTERNAL
            }));
        });

        it('handles unknown error types', () => {
            const response = handleApiError(null) as any; // Invalid type
            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                code: ErrorType.INTERNAL
            }));
        });

        // Custom Error Classes Logic
        it('extracts info from ValidationError class', () => {
            const error = new ValidationError('Invalid Input', 'fieldA');
            const response = handleApiError(error) as any;

            expect(response.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'Something went wrong', // Default internal error message
                code: ErrorType.INTERNAL
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
            const response = handleApiError(error) as any;

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
            (process.env as any).NODE_ENV = 'development';
            const error = new Error('Debug Me');
            const response = handleApiError(error) as any;

            expect(response.body).toHaveProperty('debug');
            expect(response.body.debug).toEqual(expect.objectContaining({
                message: 'Debug Me'
            }));
        });

        it('excludes debug info in production', () => {
            (process.env as any).NODE_ENV = 'production';
            const error = new Error('Hide Me');
            const response = handleApiError(error) as any;

            expect(response.body).not.toHaveProperty('debug');
        });

        it('includes details if available in mapping', () => {
            (process.env as any).NODE_ENV = 'development';
            const error = { code: 'VALIDATION_ERROR' }; // Should trigger mapping with details
            const response = handleApiError(error) as any;
            expect(response.body).toHaveProperty('details');
            expect(response.body.details).toBe('無効なパラメータが含まれています');
        });
    });

    describe('Helper functions', () => {
        it('validationError creates 400 response', () => {
            const res = validationError('Bad Input', 'fieldA') as any;
            expect(res.status).toBe(400);
            expect(res.body).toEqual({
                error: 'Bad Input',
                code: ErrorType.VALIDATION,
                details: 'Field: fieldA'
            });
        });

        it('notFoundError creates 404 response', () => {
            const res = notFoundError() as any;
            expect(res.status).toBe(404);
            expect(res.body.code).toBe(ErrorType.NOT_FOUND);

            const res2 = notFoundError('Custom Not Found') as any;
            expect(res2.body.error).toBe('Custom Not Found');
        });

        it('rateLimitError creates 429 response', () => {
            const res = rateLimitError() as any;
            expect(res.status).toBe(429);
            expect(res.body.code).toBe(ErrorType.RATE_LIMIT);
        });

        it('internalError creates 500 response', () => {
            const res = internalError('Fatal') as any;
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Fatal');
        });
    });
});
