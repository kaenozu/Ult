
import { SafeStorage, sanitizeHtml } from '../XSSProtection';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SafeStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should store and retrieve data without interference', () => {
    const key = 'test-key';
    const value = 'test-value';

    SafeStorage.setItem(key, value);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(key, value);

    const retrieved = SafeStorage.getItem(key);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
    expect(retrieved).toBe(value);
  });

  it('should allow storing "dangerous" content (to prevent data loss for logging)', () => {
    const key = 'audit-log';
    const maliciousValue = JSON.stringify({
      event: 'LOGIN',
      username: '<script>alert(1)</script>'
    });

    // Should NOT throw
    expect(() => {
      SafeStorage.setItem(key, maliciousValue);
    }).not.toThrow();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(key, maliciousValue);

    // Should retrieve it back exactly as is
    const retrieved = SafeStorage.getItem(key);
    expect(retrieved).toBe(maliciousValue);
  });

  it('should return null on storage error (e.g. quota exceeded)', () => {
    // Simulate setItem error
    (localStorageMock.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      SafeStorage.setItem('key', 'value');
    }).not.toThrow(); // Should catch internally

    // getItem error
    (localStorageMock.getItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });

    expect(SafeStorage.getItem('key')).toBeNull();
  });
});

describe('sanitizeHtml', () => {
  it('should sanitize dangerous HTML using DOMPurify', () => {
    const dirty = '<p>Hello <script>alert(1)</script>World</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toBe('<p>Hello World</p>');
  });

  it('should keep allowed tags', () => {
    const html = '<b>Bold</b> and <i>Italic</i>';
    const clean = sanitizeHtml(html, ['b', 'i']);
    expect(clean).toBe('<b>Bold</b> and <i>Italic</i>');
  });

  it('should strip attributes from allowed tags (default behavior)', () => {
     // NOTE: We configured DOMPurify with ALLOWED_ATTR: []
    const html = '<b onclick="alert(1)" class="test">Bold</b>';
    const clean = sanitizeHtml(html, ['b']);
    expect(clean).toBe('<b>Bold</b>');
  });

  it('should handle multiple XSS attack vectors', () => {
    const vectors = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '<a href="javascript:alert(1)">click</a>',
      '<div onclick="alert(1)">click</div>',
    ];

    vectors.forEach(vector => {
      const clean = sanitizeHtml(vector, ['img', 'svg', 'iframe', 'a', 'div']);
      // Should remove all dangerous content but potentially keep safe structure
      expect(clean).not.toContain('alert');
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('onclick');
    });
  });
});

describe('SafeStorage + sanitizeHtml integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should safely store and display audit logs with malicious content', () => {
    // Scenario: An attacker tries XSS via login form
    const auditLog = {
      event: 'AUTH_FAILED',
      timestamp: Date.now(),
      username: '<script>alert("XSS")</script>',
      ipAddress: '192.168.1.1',
      userAgent: '<img src=x onerror=alert(1)>'
    };

    // Step 1: Store the audit log without filtering (prevents DoS)
    const serialized = JSON.stringify(auditLog);
    SafeStorage.setItem('audit_logs', serialized);
    
    // Verify raw data is stored exactly as-is
    const stored = SafeStorage.getItem('audit_logs');
    expect(stored).toBe(serialized);
    expect(stored).toContain('<script>');
    expect(stored).toContain('<img src=x onerror=alert(1)>');

    // Step 2: When displaying, sanitize the output
    const retrieved = JSON.parse(stored!);
    const safeUsername = sanitizeHtml(retrieved.username, []);
    const safeUserAgent = sanitizeHtml(retrieved.userAgent, []);

    // Verify XSS is removed at render time
    expect(safeUsername).not.toContain('<script>');
    expect(safeUsername).not.toContain('alert');
    expect(safeUserAgent).not.toContain('onerror');
    expect(safeUserAgent).not.toContain('alert');
  });
});
