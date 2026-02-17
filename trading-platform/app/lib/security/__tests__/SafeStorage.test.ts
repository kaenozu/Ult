
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
});
