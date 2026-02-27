/**
 * @jest-environment node
 */
import { sanitizeText, detectPathTraversal } from '../InputSanitizer';

describe('InputSanitizer Extra Tests', () => {
  describe('Path Traversal Sanitization', () => {
    it('should replace path traversal patterns with underscores', () => {
      const input = '../../../etc/passwd';
      const detected = detectPathTraversal(input);
      // expect(detected).toBe(true); // Check detection first

      const result = sanitizeText(input);
      if (!result.errors.includes('Path traversal attempt detected')) {
         console.log('Detection failed. Result:', result);
         console.log('detectPathTraversal result:', detected);
      }
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path traversal attempt detected');
      expect(result.sanitized).toBe('.._.._.._etc_passwd');
    });

    it('should sanitize encoded traversal patterns', () => {
      const input = '..%2f..%2fetc%2fpasswd';
      const result = sanitizeText(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path traversal attempt detected');
      expect(result.sanitized).toBe('.._.._etc_passwd');
    });

    it('should handle mixed separators', () => {
      const input = '..\\../windows';
      const result = sanitizeText(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('.._.._windows');
    });
  });
});
