/**
 * Unit tests for dev-logger utility
 * Tests that devLog functions work correctly and don't cause recursion
 */

import { devLog, devWarn, devError, devInfo, devDebug } from '../dev-logger';

describe('dev-logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('devLog', () => {
    it('should call console.log with arguments in development', () => {
      process.env.NODE_ENV = 'development';
      
      devLog('test message', { data: 'value' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test message', { data: 'value' });
    });

    it('should not call console.log in production', () => {
      process.env.NODE_ENV = 'production';
      
      devLog('test message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      process.env.NODE_ENV = 'development';
      
      devLog('arg1', 'arg2', 'arg3', { nested: { value: 123 } });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('arg1', 'arg2', 'arg3', { nested: { value: 123 } });
    });

    it('should not cause stack overflow (no recursion)', () => {
      process.env.NODE_ENV = 'development';
      
      // This should not throw a stack overflow error
      expect(() => {
        for (let i = 0; i < 100; i++) {
          devLog(`iteration ${i}`);
        }
      }).not.toThrow();
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(100);
    });
  });

  describe('devWarn', () => {
    it('should call console.warn with arguments in development', () => {
      process.env.NODE_ENV = 'development';
      
      devWarn('warning message', { code: 'WARN001' });
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message', { code: 'WARN001' });
    });

    it('should not call console.warn in production', () => {
      process.env.NODE_ENV = 'production';
      
      devWarn('warning');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('devError', () => {
    it('should call console.error with arguments in development', () => {
      process.env.NODE_ENV = 'development';
      
      const error = new Error('test error');
      devError('error message', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message', error);
    });

    it('should not call console.error in production', () => {
      process.env.NODE_ENV = 'production';
      
      devError('error');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('devInfo', () => {
    it('should call console.info with arguments in development', () => {
      process.env.NODE_ENV = 'development';
      
      devInfo('info message');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
    });

    it('should not call console.info in production', () => {
      process.env.NODE_ENV = 'production';
      
      devInfo('info');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('devDebug', () => {
    it('should call console.debug with arguments in development', () => {
      process.env.NODE_ENV = 'development';
      
      devDebug('debug message', { trace: 'stack' });
      
      expect(consoleDebugSpy).toHaveBeenCalledWith('debug message', { trace: 'stack' });
    });

    it('should not call console.debug in production', () => {
      process.env.NODE_ENV = 'production';
      
      devDebug('debug');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined arguments', () => {
      process.env.NODE_ENV = 'development';
      
      devLog(undefined);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(undefined);
    });

    it('should handle null arguments', () => {
      process.env.NODE_ENV = 'development';
      
      devLog(null);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(null);
    });

    it('should handle empty arguments', () => {
      process.env.NODE_ENV = 'development';
      
      devLog();
      
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });

    it('should handle circular references without crashing', () => {
      process.env.NODE_ENV = 'development';
      
      const circular: any = { name: 'circular' };
      circular.self = circular;
      
      expect(() => {
        devLog('circular object:', circular);
      }).not.toThrow();
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
