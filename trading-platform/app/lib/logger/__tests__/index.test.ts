import { StructuredLogger, createLogger, logger } from '../index';

describe('StructuredLogger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('log levels', () => {
    it('should log debug message', () => {
      const log = createLogger('test', { minLevel: 'debug' });
      log.debug('debug message');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log info message', () => {
      const log = createLogger('test');
      log.info('info message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warn message', () => {
      const log = createLogger('test');
      log.warn('warn message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error with Error object', () => {
      const log = createLogger('test');
      const error = new Error('test error');
      log.error('error occurred', error);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('log level filtering', () => {
    it('should not log below minLevel', () => {
      const log = createLogger('test', { minLevel: 'warn' });
      log.debug('debug message');
      log.info('info message');
      expect(console.debug).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log at or above minLevel', () => {
      const log = createLogger('test', { minLevel: 'warn' });
      log.warn('warn message');
      log.error('error message');
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in log', () => {
      const log = createLogger('test');
      log.info('test message', { userId: '123', action: 'login' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'test message',
        expect.objectContaining({
          userId: '123',
          action: 'login',
        })
      );
    });

    it('should redact sensitive fields', () => {
      const log = createLogger('test');
      log.info('test', { password: 'secret123', apiKey: 'key123' });
      const call = consoleSpy.mock.calls[0];
      expect(call[2].password).toBe('[REDACTED]');
      expect(call[2].apiKey).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const log = createLogger('test');
      log.info('test', { user: { password: 'secret', name: 'John' } });
      const call = consoleSpy.mock.calls[0];
      expect(call[2].user.password).toBe('[REDACTED]');
      expect(call[2].user.name).toBe('John');
    });
  });

  describe('performance measurement', () => {
    it('should measure operation duration', () => {
      const log = createLogger('test');
      const endTimer = log.startTimer('testOperation');
      
      // Simulate work
      jest.advanceTimersByTime(100);
      
      endTimer();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Operation completed: testOperation',
        expect.objectContaining({
          operation: 'testOperation',
          duration: expect.any(Number),
        })
      );
    });

    it('should measure async operations', async () => {
      const log = createLogger('test');
      const result = await log.measure('asyncOp', async () => {
        return 'success';
      });
      
      expect(result).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Operation succeeded: asyncOp',
        expect.objectContaining({
          operation: 'asyncOp',
          success: true,
          duration: expect.any(Number),
        })
      );
    });

    it('should log error on failed async operation', async () => {
      const log = createLogger('test');
      const error = new Error('test error');
      
      await expect(
        log.measure('failingOp', async () => {
          throw error;
        })
      ).rejects.toThrow('test error');
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('context management', () => {
    it('should set context', () => {
      const log = createLogger('initial');
      log.setContext('newContext');
      log.info('test');
      
      const call = consoleSpy.mock.calls[0];
      expect(call[0]).toContain('newContext');
    });

    it('should set user context', () => {
      const log = createLogger('app');
      log.setUserId('user123');
      log.info('test');
      
      const call = consoleSpy.mock.calls[0];
      expect(call[0]).toContain('app:user123');
    });
  });

  describe('default logger', () => {
    it('should have default context', () => {
      logger.info('test');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[app]'),
        'test'
      );
    });
  });

  describe('error logging', () => {
    it('should include error details', () => {
      const log = createLogger('test');
      const error = new Error('test error');
      error.stack = 'Error: test error\n    at Test.method (file.ts:1:1)';
      
      log.error('operation failed', error);
      
      const calls = (console.error as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should not include stack trace when disabled', () => {
      const log = createLogger('test', { includeStackTrace: false });
      const error = new Error('test error');
      
      log.error('operation failed', error);
      
      const call = (console.error as jest.Mock).mock.calls[0];
      expect(call[2].error.stack).toBeUndefined();
    });
  });
});
