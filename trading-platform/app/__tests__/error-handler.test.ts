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

// Mock NextResponse
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({ body, init }))
    }
}));

describe('error-handler', () => {
    const originalEnv = process.env.NODE_ENV;
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
        process.env.NODE_ENV = originalEnv;
        mockConsoleError.mockRestore();
    });

    describe('logError', () => {
        it('logs Error objects with stack', () => {
            const error = new Error('Test Error');
            logError(error, 'TestContext');
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining('[TestContext] Error:'),
                expect.objectContaining({
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
            const response = handleApiError(error);

            expect(response.init?.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'Something went wrong', // Default internal error message
                code: ErrorType.INTERNAL
            }));
        });

        it('handles string errors', () => {
            const response = handleApiError('String Error');
            expect(response.init?.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                error: 'String Error',
                code: ErrorType.INTERNAL
            }));
        });

        it('handles unknown error types', () => {
            const response = handleApiError(null); // Invalid type
            expect(response.init?.status).toBe(500);
            expect(response.body).toEqual(expect.objectContaining({
                code: ErrorType.INTERNAL
            }));
        });

        // Custom Error Classes Logic
        it('extracts info from ValidationError class', () => {
            const error = new ValidationError('Invalid Input', 'fieldA');
            const response = handleApiError(error);

            expect(response.init?.status).toBe(400);
            expect(response.body).toEqual(expect.objectContaining({
                error: '入力内容を確認してください',
                code: 'VALIDATION_ERROR',
                details: '無効なパラメータが含まれています' // The fallback details from mapping
            }));
        });

        it('extracts info from basic APIError with manual code', () => {
            const error = new APIError('Missing', 'NOT_FOUND', 404);
            const response = handleApiError(error);
            expect(response.init?.status).toBe(404);
        });

        // Plain Object Fallback Logic
        it('extracts info from plain object with code (VALIDATION)', () => {
            const error = { code: 'VALIDATION_ERROR', message: 'Plain object error' };
            const response = handleApiError(error);

            expect(response.init?.status).toBe(400);
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('extracts info from plain object with code (RATE_LIMIT)', () => {
            const error = { code: 'RATE_LIMIT_ERROR', message: 'Slow down' };
            const response = handleApiError(error);
            expect(response.init?.status).toBe(429);
        });

        it('extracts info from plain object with code (NETWORK)', () => {
            const error = { code: 'NETWORK_ERROR', message: 'No net' };
            const response = handleApiError(error);
            expect(response.init?.status).toBe(502);
        });

        it('respects explicitly provided status code', () => {
            const error = new Error('Custom Status Error');
            const response = handleApiError(error, 'API', 418);
            expect(response.init?.status).toBe(418);
        });

        it('includes debug info in non-production', () => {
            process.env.NODE_ENV = 'development';
            const error = new Error('Debug Me');
            const response = handleApiError(error);

            expect(response.body).toHaveProperty('debug');
            expect(response.body.debug).toEqual(expect.objectContaining({
                message: 'Debug Me'
            }));
        });

        it('excludes debug info in production', () => {
            process.env.NODE_ENV = 'production';
            const error = new Error('Hide Me');
            const response = handleApiError(error);

            expect(response.body).not.toHaveProperty('debug');
        });

        it('includes details if available in mapping', () => {
            process.env.NODE_ENV = 'development';
            const error = { code: 'VALIDATION_ERROR' }; // Should trigger mapping with details
            const response = handleApiError(error);
            expect(response.body).toHaveProperty('details');
            expect(response.body.details).toBe('無効なパラメータが含まれています');
        });
    });

    describe('Helper functions', () => {
        it('validationError creates 400 response', () => {
            const res = validationError('Bad Input', 'fieldA');
            expect(res.init?.status).toBe(400);
            expect(res.body).toEqual({
                error: 'Bad Input',
                code: ErrorType.VALIDATION,
                details: 'Field: fieldA'
            });
        });

        it('notFoundError creates 404 response', () => {
            const res = notFoundError();
            expect(res.init?.status).toBe(404);
            expect(res.body.code).toBe(ErrorType.NOT_FOUND);

            const res2 = notFoundError('Custom Not Found');
            expect(res2.body.error).toBe('Custom Not Found');
        });

        it('rateLimitError creates 429 response', () => {
            const res = rateLimitError();
            expect(res.init?.status).toBe(429);
            expect(res.body.code).toBe(ErrorType.RATE_LIMIT);
        });

        it('internalError creates 500 response', () => {
            const res = internalError('Fatal');
            expect(res.init?.status).toBe(500);
            expect(res.body.error).toBe('Fatal');
        });
    });
});
