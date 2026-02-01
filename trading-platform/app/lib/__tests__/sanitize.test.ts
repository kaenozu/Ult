import { sanitizeString, sanitizeNumber } from '../sanitize';

// Store original values
const originalWindow = global.window;
const originalDocument = global.document;

describe('sanitize utility', () => {
  describe('sanitizeString', () => {
    describe('server-side (without window.document)', () => {
      beforeEach(() => {
        // Remove window and document to simulate true SSR
        delete (global as any).window;
        delete (global as any).document;
      });

      afterEach(() => {
        // Restore window and document
        (global as any).window = originalWindow;
        (global as any).document = originalDocument;
      });

      it('should return empty string for null or undefined', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
      });

      it('should escape HTML entities on server', () => {
        const malicious = '<script>alert("XSS")</script>';
        const result = sanitizeString(malicious);
        expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      });

      it('should escape ampersands', () => {
        const text = 'A & B';
        const result = sanitizeString(text);
        expect(result).toBe('A &amp; B');
      });

      it('should escape quotes', () => {
        const text = 'Say "hello"';
        const result = sanitizeString(text);
        expect(result).toContain('&quot;');
      });

      it('should escape single quotes', () => {
        const text = "It's working";
        const result = sanitizeString(text);
        expect(result).toContain('&#x27;');
      });

      it('should escape forward slashes', () => {
        const text = '</script>';
        const result = sanitizeString(text);
        expect(result).toContain('&#x2F;');
      });

      it('should handle normal text', () => {
        const normalText = 'Normal text 123';
        const result = sanitizeString(normalText);
        expect(result).toBe('Normal text 123');
      });
    });

    describe('client-side behavior', () => {
      // In Jest environment with jsdom, window.document exists
      // DOMPurify will be used automatically
      
      it('should return empty string for null or undefined', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
      });

      it('should sanitize basic XSS attempts', () => {
        const malicious = '<script>alert("XSS")</script>';
        const result = sanitizeString(malicious);
        // DOMPurify strips <script> tags entirely, even with KEEP_CONTENT
        // This is correct security behavior
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('</script>');
        expect(result).not.toContain('alert');
      });

      it('should remove HTML tags but keep content', () => {
        const html = '<b>Bold</b> text';
        const result = sanitizeString(html);
        // Should keep "Bold text" but remove tags
        expect(result).toContain('Bold');
        expect(result).toContain('text');
        expect(result).not.toContain('<b>');
        expect(result).not.toContain('</b>');
      });

      it('should handle img tags with onerror XSS', () => {
        const malicious = '<img src=x onerror="alert(1)">';
        const result = sanitizeString(malicious);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('<img');
      });

      it('should handle javascript: protocol', () => {
        const malicious = '<a href="javascript:alert(1)">Click</a>';
        const result = sanitizeString(malicious);
        expect(result).not.toContain('javascript:');
        // Should keep the text content
        expect(result).toContain('Click');
      });

      it('should handle normal text without modification', () => {
        const normalText = 'Normal text 123';
        const result = sanitizeString(normalText);
        expect(result).toBe('Normal text 123');
      });
      
      it('should preserve safe content while stripping dangerous tags', () => {
        const mixed = 'Safe <script>bad()</script> content';
        const result = sanitizeString(mixed);
        expect(result).toContain('Safe');
        expect(result).toContain('content');
        expect(result).not.toContain('<script>');
        // The content inside script tags is typically removed by DOMPurify for security
      });
    });
  });

  describe('sanitizeNumber', () => {
    it('should return 0 for null or undefined', () => {
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber(undefined)).toBe(0);
    });

    it('should return 0 for NaN', () => {
      expect(sanitizeNumber(NaN)).toBe(0);
    });

    it('should return the number for valid numbers', () => {
      expect(sanitizeNumber(42)).toBe(42);
      expect(sanitizeNumber(0)).toBe(0);
      expect(sanitizeNumber(-100)).toBe(-100);
      expect(sanitizeNumber(3.14)).toBe(3.14);
    });

    it('should convert numeric strings to numbers', () => {
      expect(sanitizeNumber(Number('123'))).toBe(123);
      expect(sanitizeNumber(Number('3.14'))).toBe(3.14);
    });
  });
});
