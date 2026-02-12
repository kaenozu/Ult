import { 
  AppError, 
  ApiError, 
  NetworkError, 
  ValidationError, 
  NotFoundError,
  isAppError,
  isApiError,
  isValidationError,
  ErrorCodes
} from '../index';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError instance with default values', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(error.severity).toBe('medium');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
      expect(isAppError(error)).toBe(true);
    });

    it('should create an AppError instance with custom values', () => {
      const error = new AppError('Custom error', ErrorCodes.API_ERROR, 'high', {
        statusCode: 400,
        context: { foo: 'bar' }
      });
      expect(error.message).toBe('Custom error');
      expect(error.code).toBe(ErrorCodes.API_ERROR);
      expect(error.severity).toBe('high');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ foo: 'bar' });
    });
  });

  describe('ApiError', () => {
    it('should create an ApiError instance', () => {
      const error = new ApiError('API failed', { statusCode: 404, endpoint: '/api/test' });
      expect(error.message).toBe('API failed');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND_ERROR);
      expect(error.statusCode).toBe(404);
      expect(error.context?.endpoint).toBe('/api/test');
      expect(error.name).toBe('ApiError');
      expect(isApiError(error)).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError instance', () => {
      const error = new NetworkError('Connection lost', { endpoint: '/api/data' });
      expect(error.message).toBe('Connection lost');
      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.severity).toBe('high');
      expect(error.statusCode).toBe(503);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError instance', () => {
      const error = new ValidationError('email', 'Invalid format');
      expect(error.message).toBe('Validation error for email: Invalid format');
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(error.field).toBe('email');
      expect(isValidationError(error)).toBe(true);
    });
  });
});
