import { webcrypto } from 'node:crypto';
import { AuditLogger } from '../AuditLogger';
import { SafeStorage } from '../XSSProtection';

// Polyfill crypto for JSDOM environment
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
});

// Mock SafeStorage
jest.mock('../XSSProtection', () => ({
  SafeStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  escapeHtml: jest.fn(),
}));

// Mock logger to Spy on errors
jest.mock('@/app/core/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { logger } from '@/app/core/logger';

describe('AuditLogger Encryption', () => {
  let auditLogger: AuditLogger;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear any cached keys or globals if necessary
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (auditLogger) {
      await auditLogger.destroy();
    }
  });

  it('should FAIL to save logs when encryption is enabled but NO key is provided', async () => {
    // Ensure no key is present
    delete process.env.AUDIT_ENCRYPTION_KEY;
    delete process.env.NEXT_PUBLIC_AUDIT_ENCRYPTION_KEY;

    auditLogger = new AuditLogger({
      enableEncryption: true,
      maxEntries: 10,
    });

    await auditLogger.log({
      type: 'AUTH_LOGIN',
      outcome: 'SUCCESS',
      action: 'User Login',
      resource: 'auth',
      riskLevel: 'LOW',
      details: {},
    });

    // Flush logs
    await auditLogger.destroy();

    // Check that SafeStorage.setItem was NOT called
    // because deriveKey should throw, causing encrypt to throw, causing flush to catch error and log it
    // Wait, currently it uses default key so it WOULD be called.
    // This test expects the FIXED behavior.
    expect(SafeStorage.setItem).not.toHaveBeenCalled();

    // It should have logged an error about missing key or failed flush
    expect(logger.error).toHaveBeenCalled();
    const calls = (logger.error as jest.Mock).mock.calls;
    const errorMessages = calls.map(c => c[0] + (c[1] ? ' ' + c[1] : '')).join(' ');
    expect(errorMessages).toMatch(/Encryption enabled but no .*KEY provided|Failed to flush audit logs/i);
  });

  it('should SAVE encrypted logs when key IS provided', async () => {
    process.env.NEXT_PUBLIC_AUDIT_ENCRYPTION_KEY = 'test-secret-key';

    auditLogger = new AuditLogger({
      enableEncryption: true,
      maxEntries: 10,
    });

    await auditLogger.log({
      type: 'AUTH_LOGIN',
      outcome: 'SUCCESS',
      action: 'User Login',
      resource: 'auth',
      riskLevel: 'LOW',
      details: {},
    });

    await auditLogger.destroy();

    expect(SafeStorage.setItem).toHaveBeenCalled();
    const args = (SafeStorage.setItem as jest.Mock).mock.calls[0];
    expect(args[0]).toBe('audit_logs');
    // Value should be encrypted string (base64)
    expect(typeof args[1]).toBe('string');
    // Should not be JSON (because it's encrypted base64)
    expect(() => JSON.parse(args[1])).toThrow();
  });
});
