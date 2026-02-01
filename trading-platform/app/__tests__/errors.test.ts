/**
 * errors.test.ts
 * 
 * エラーハンドリングのテスト
 */

import { AppError, ApiError, ValidationError, handleError, getUserErrorMessage, withErrorHandling } from '../lib/errors';

describe('Error Handling', () => {
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('APP_ERROR');
      expect(error.severity).toBe('medium');
      expect(error.name).toBe('AppError');
    });

    it('should create AppError with custom values', () => {
      const error = new AppError('Custom error', 'CUSTOM_CODE', 'high');
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.severity).toBe('high');
    });
  });

  describe('ApiError', () => {
    it('should create ApiError with status code', () => {
      const error = new ApiError('API error', '/api/test', 404);
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.name).toBe('ApiError');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('field', 'Invalid input');
      expect(error.message).toBe('Validation error for field: Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.severity).toBe('low');
      expect(error.field).toBe('field');
    });
  });

  describe('handleError', () => {
    it('should return AppError as-is', () => {
      const original = new AppError('Original');
      const result = handleError(original);
      expect(result).toBe(original);
    });

    it('should wrap Error in AppError', () => {
      const original = new Error('Test error');
      const result = handleError(original);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Test error');
    });

    it('should wrap unknown error in AppError', () => {
      const result = handleError('string error');
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('string error');
    });

    it('should include context in message', () => {
      const original = new Error('Test');
      const result = handleError(original, 'fetchData');
      expect(result.message).toBe('[fetchData] Test');
    });
  });

  describe('getUserErrorMessage', () => {
    it('should return validation message as-is', () => {
      const error = new ValidationError('symbol', 'Invalid symbol');
      expect(getUserErrorMessage(error)).toBe('Validation error for symbol: Invalid symbol');
    });

    it('should return Japanese message for API 404', () => {
      const error = new ApiError('Not found', '/api/test', 404);
      expect(getUserErrorMessage(error)).toBe('データが見つかりませんでした');
    });

    it('should return Japanese message for API 429', () => {
      const error = new ApiError('Too many requests', '/api/test', 429);
      expect(getUserErrorMessage(error)).toBe('リクエストが多すぎます。しばらく待ってからお試しください');
    });

    it('should return generic message for unknown error', () => {
      expect(getUserErrorMessage('unknown')).toBe('エラーが発生しました。もう一度お試しください');
    });
  });

  describe('withErrorHandling', () => {
    it('should return data on success', async () => {
      const fn = async () => 'success';
      const result = await withErrorHandling(fn);
      expect(result.data).toBe('success');
      expect(result.error).toBeNull();
    });

    it('should return error on failure', async () => {
      const fn = async () => { throw new Error('Failed'); };
      const result = await withErrorHandling(fn);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error?.message).toBe('Failed');
    });

    it('should include context in error', async () => {
      const fn = async () => { throw new Error('Failed'); };
      const result = await withErrorHandling(fn, 'testContext');
      expect(result.error?.message).toBe('[testContext] Failed');
    });
  });
});
