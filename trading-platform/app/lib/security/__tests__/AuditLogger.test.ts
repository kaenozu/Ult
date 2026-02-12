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
  // Ensure other exports don't break imports if AuditLogger uses them
  escapeHtml: jest.fn(),
}));

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Instantiate new logger for each test to avoid state leakage
    auditLogger = new AuditLogger({
      enableEncryption: false,
      maxEntries: 10,
    });
  });

  afterEach(async () => {
    if (auditLogger) {
      await auditLogger.destroy();
    }
  });

  it('should log an event and persist it on destroy', async () => {
    // Current implementation of log is synchronous, future is async.
    // Use await to support both.
    await auditLogger.log({
      type: 'AUTH_LOGIN',
      outcome: 'SUCCESS',
      action: 'User Login',
      resource: 'auth',
      riskLevel: 'LOW',
      userId: 'test-user',
      details: { method: 'password' },
    });

    // Flush logs by destroying
    await auditLogger.destroy();

    expect(SafeStorage.setItem).toHaveBeenCalled();
    const setItemMock = SafeStorage.setItem as jest.Mock;
    const key = setItemMock.mock.calls[0][0];
    const value = setItemMock.mock.calls[0][1];

    expect(key).toBe('audit_logs');
    expect(typeof value).toBe('string');

    const logs = JSON.parse(value as string);
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('AUTH_LOGIN');
    expect(logs[0].userId).toBe('test-user');
  });

  it('should verify log integrity using SHA-256 hashing', async () => {
    await auditLogger.log({
      type: 'DATA_ACCESS',
      outcome: 'SUCCESS',
      action: 'View Data',
      resource: 'data:123',
      riskLevel: 'MEDIUM',
      details: {},
    });

    await auditLogger.destroy();

    const setItemMock = SafeStorage.setItem as jest.Mock;
    const value = setItemMock.mock.calls[0][1] as string;
    const logs = JSON.parse(value);
    const log = logs[0];

    // Verify hash presence and format (SHA-256 hex string is 64 chars)
    expect(log.hash).toBeDefined();
    expect(typeof log.hash).toBe('string');
    // If implementation is weak (current), this might fail (length < 64).
    // If implementation is secure (future), this should pass (length === 64).
    // We assert 64 to enforce security requirement.
    expect(log.hash.length).toBe(64);

    // Verify previousHash for the first log
    expect(log.previousHash).toBeDefined();
  });
});
