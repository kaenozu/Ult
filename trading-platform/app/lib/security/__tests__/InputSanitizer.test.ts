/**
 * @jest-environment node
 */

import {
  escapeHtml,
  unescapeHtml,
  escapeSql,
  detectSqlInjection,
  detectXss,
  detectPathTraversal,
  detectNullByte,
  sanitizeText,
  sanitizeSymbol,
  sanitizeNumber,
  sanitizeJson,
  whitelist,
} from '../InputSanitizer';

describe('InputSanitizer', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("'test'")).toBe('&#x27;test&#x27;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(escapeHtml('hello world')).toBe('hello world');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;test&lt;/div&gt;')).toBe('<div>test</div>');
    });

    it('should handle empty string', () => {
      expect(unescapeHtml('')).toBe('');
    });
  });

  describe('escapeSql', () => {
    it('should escape single quotes', () => {
      expect(escapeSql("' OR '1'='1")).toBe("\\' OR \\'1\\'=\\'1");
    });

    it('should escape backslashes', () => {
      expect(escapeSql('\\path\\to\\file')).toBe('\\\\path\\\\to\\\\file');
    });

    it('should escape newlines', () => {
      expect(escapeSql('line1\nline2')).toBe('line1\\nline2');
    });
  });

  describe('detectSqlInjection', () => {
    it('should detect SQL injection patterns', () => {
      expect(detectSqlInjection("' OR '1'='1")).toBe(true);
      expect(detectSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSqlInjection("' UNION SELECT * FROM passwords")).toBe(true);
    });

    it('should return false for safe strings', () => {
      expect(detectSqlInjection('hello world')).toBe(false);
      expect(detectSqlInjection('show me the data')).toBe(false);
    });
  });

  describe('detectXss', () => {
    it('should detect XSS patterns', () => {
      expect(detectXss('<script>alert(1)</script>')).toBe(true);
      expect(detectXss('javascript:void(0)')).toBe(true);
      expect(detectXss('<img src=x onerror=alert(1)>')).toBe(true);
    });

    it('should return false for safe strings', () => {
      expect(detectXss('hello world')).toBe(false);
      expect(detectXss('normal text')).toBe(false);
    });
  });

  describe('detectPathTraversal', () => {
    it('should detect path traversal patterns', () => {
      expect(detectPathTraversal('../../../etc/passwd')).toBe(true);
      expect(detectPathTraversal('..\\..\\windows\\system32')).toBe(true);
    });

    it('should return false for safe paths', () => {
      expect(detectPathTraversal('/valid/path')).toBe(false);
      expect(detectPathTraversal('file.txt')).toBe(false);
    });
  });

  describe('detectNullByte', () => {
    it('should detect null bytes', () => {
      expect(detectNullByte('test\x00')).toBe(true);
      expect(detectNullByte('test%00')).toBe(true);
    });

    it('should return false for strings without null bytes', () => {
      expect(detectNullByte('test')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should return sanitized text', () => {
      const result = sanitizeText('  hello  ');
      expect(result.sanitized).toBe('hello');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should trim whitespace', () => {
      const result = sanitizeText('  test  ');
      expect(result.sanitized).toBe('test');
    });

    it('should detect XSS and escape', () => {
      const result = sanitizeText('<script>alert(1)</script>');
      expect(result.errors).toContain('Potential XSS pattern detected');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should respect maxLength', () => {
      const result = sanitizeText('abcdefghij', { maxLength: 5 });
      expect(result.sanitized).toBe('abcde');
      expect(result.warnings).toContain('Input truncated to 5 characters');
    });

    it('should handle null bytes', () => {
      const result = sanitizeText('test\x00test');
      expect(result.errors).toContain('Null byte detected');
      expect(result.sanitized).toBe('testtest');
    });

    it('should escape HTML when allowHtml is false, even if no XSS detected', () => {
      const result = sanitizeText('<b>bold</b>');
      expect(result.sanitized).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    });
  });

  describe('sanitizeSymbol', () => {
    it('should sanitize valid symbol', () => {
      const result = sanitizeSymbol('AAPL');
      expect(result.sanitized).toBe('AAPL');
      expect(result.isValid).toBe(true);
    });

    it('should convert to uppercase', () => {
      const result = sanitizeSymbol('aapl');
      expect(result.sanitized).toBe('AAPL');
    });

    it('should trim whitespace', () => {
      const result = sanitizeSymbol('  AAPL  ');
      expect(result.sanitized).toBe('AAPL');
    });

    it('should remove invalid characters', () => {
      const result = sanitizeSymbol('AAPL!@#');
      expect(result.sanitized).toBe('AAPL');
      expect(result.warnings).toContain('Invalid characters removed from symbol');
    });

    it('should detect symbol too long', () => {
      const result = sanitizeSymbol('A'.repeat(25));
      expect(result.errors).toContain('Symbol too long');
    });

    it('should handle batch symbols', () => {
      const result = sanitizeSymbol('AAPL,MSFT,GOOGL');
      expect(result.sanitized).toBe('AAPL,MSFT,GOOGL');
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid number', () => {
      const result = sanitizeNumber('42');
      expect(result.sanitized).toBe('42');
      expect(result.isValid).toBe(true);
    });

    it('should validate decimal numbers', () => {
      const result = sanitizeNumber('3.14', { allowDecimal: true });
      expect(result.sanitized).toBe('3.14');
      expect(result.isValid).toBe(true);
    });

    it('should reject decimal when not allowed', () => {
      const result = sanitizeNumber('3.14', { allowDecimal: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid number format');
    });

    it('should validate range', () => {
      const result = sanitizeNumber('150', { min: 0, max: 100 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value above maximum 100');
    });

    it('should reject negative when not allowed', () => {
      const result = sanitizeNumber('-10', { allowNegative: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Negative values not allowed');
    });
  });

  describe('sanitizeJson', () => {
    it('should sanitize valid JSON', () => {
      const result = sanitizeJson('{"key": "value"}');
      expect(result.sanitized).toBe('{"key":"value"}');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = sanitizeJson('{"key": value}');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should handle null bytes in JSON', () => {
      const result = sanitizeJson('{"key": "val\x00ue"}');
      expect(result.errors).toContain('Null byte detected in JSON');
    });
  });

  describe('whitelist', () => {
    it('should filter characters based on whitelist', () => {
      expect(whitelist('abc123', /[a-z]/)).toBe('abc');
      expect(whitelist('ABC123', /[A-Z]/)).toBe('ABC');
    });

    it('should handle empty string', () => {
      expect(whitelist('', /[a-z]/)).toBe('');
    });
  });
});
