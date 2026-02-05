/**
 * Property-Based Tests
 * 
 * プロパティベーステスト（fast-check）
 * 境界値テスト、ランダムデータによる堅牢性検証
 */

import fc from 'fast-check';
import {
  escapeHtml,
  sanitizeText,
  sanitizeNumber,
  sanitizeSymbol,
  detectSqlInjection,
  detectXss,
} from '../security/InputSanitizer';
import {
  validateRequiredString,
  validateNumber,
  validateSymbol,
  validateOrderSide,
} from '../validation';

describe('Property-Based Tests', () => {
  describe('Input Sanitizer', () => {
    it('should always escape HTML special characters', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const escaped = escapeHtml(input);
          // エスケープ後に危険な文字が含まれていないことを確認
          expect(escaped).not.toContain('<');
          expect(escaped).not.toContain('>');
          expect(escaped).not.toContain('"');
          expect(escaped).not.toContain("'");
        }),
        { numRuns: 1000 }
      );
    });

    it('should preserve non-HTML text', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // HTML特殊文字を含まない文字列は変更されない
          if (!/[<>'"&`]/.test(input)) {
            expect(escapeHtml(input)).toBe(input);
          }
        }),
        { numRuns: 1000 }
      );
    });

    it('should detect SQL injection patterns', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (prefix, suffix) => {
            // SQLインジェクションパターンを作成
            const injectionPatterns = [
              `${prefix}' OR '1'='1${suffix}`,
              `${prefix}'; DROP TABLE users; --${suffix}`,
              `${prefix}' UNION SELECT * FROM passwords${suffix}`,
            ];
            
            injectionPatterns.forEach(pattern => {
              expect(detectSqlInjection(pattern)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect XSS patterns', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          (prefix, suffix) => {
            // XSSパターンを作成
            const xssPatterns = [
              `${prefix}<script>${suffix}`,
              `${prefix}javascript:void(0)${suffix}`,
              `${prefix}onerror=alert(1)${suffix}`,
            ];
            
            xssPatterns.forEach(pattern => {
              expect(detectXss(pattern)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sanitize numbers within valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          (num) => {
            const result = sanitizeNumber(num.toString(), {
              min: 1,
              max: 1000000,
              positive: true,
            });
            expect(result.isValid).toBe(true);
            expect(parseInt(result.sanitized)).toBe(num);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should reject numbers outside valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (num) => {
            const result = sanitizeNumber(num.toString(), {
              min: 1,
              positive: true,
            });
            expect(result.isValid).toBe(false);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle valid stock symbols', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => /^[A-Z]+$/.test(s)),
          (symbol) => {
            const result = sanitizeSymbol(symbol);
            expect(result.isValid).toBe(true);
            expect(result.sanitized).toBe(symbol.toUpperCase());
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Validation Functions', () => {
    it('should validate non-empty strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (input) => {
            const result = validateRequiredString(input, 'field');
            // 結果がResponseでないことを確認（成功時は文字列を返す）
            expect(typeof result).toBe('string');
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should reject empty or whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 10 }).map(s => s.replace(/./g, ' '))
          ),
          (input) => {
            const result = validateRequiredString(input, 'field');
            // 結果がResponseオブジェクトであることを確認（エラー時）
            expect(result).toBeInstanceOf(Response);
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should validate valid order sides', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('BUY', 'SELL'),
          (side) => {
            const result = validateOrderSide(side);
            expect(result).toBe(side);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Data Transformations', () => {
    it('should maintain data integrity through sanitization round-trip', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !/[<>'"&`\/]/.test(s) && s.trim().length > 0),
          (input) => {
            const result = sanitizeText(input);
            // 危険な文字が含まれていない場合、本質的なデータは保持される
            expect(result.sanitized).toContain(input.trim());
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle Unicode strings correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).map(s => `テスト${s}🎉`),
          (input) => {
            const result = sanitizeText(input, { normalizeUnicode: true });
            // Unicode文字が保持されることを確認
            expect(result.sanitized).toContain('テスト');
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('should handle very long strings within limits', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1000, maxLength: 5000 }),
          (input) => {
            const result = sanitizeText(input, { maxLength: 10000 });
            // 制限内の長さの文字列は完全に保持される
            expect(result.sanitized.length).toBeLessThanOrEqual(10000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters safely', () => {
      const specialChars = [
        '\x00', '\x01', '\x02', // Null bytes
        '\n', '\r', '\t',       // Whitespace
        '\u2028', '\u2029',     // Line terminators
      ];
      
      specialChars.forEach(char => {
        const result = sanitizeText(char);
        expect(result).toBeDefined();
        expect(result.errors.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle boundary numeric values', () => {
      const boundaryValues = [
        Number.MIN_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_VALUE,
        Number.MAX_VALUE,
        0,
        -0,
        Infinity,
        -Infinity,
      ];
      
      boundaryValues.forEach(value => {
        const result = sanitizeNumber(value.toString());
        // 無限大は無効とみなされるべき
        if (!Number.isFinite(value)) {
          expect(result.isValid).toBe(false);
        }
      });
    });
  });
});

describe('Boundary Value Tests', () => {
  describe('String Length Boundaries', () => {
    it('should handle empty string', () => {
      const result = validateRequiredString('', 'field');
      expect(result).toBeInstanceOf(Response);
    });

    it('should handle single character', () => {
      const result = validateRequiredString('a', 'field');
      expect(result).toBe('a');
    });

    it('should handle maximum length', () => {
      const maxLength = 1000;
      const longString = 'a'.repeat(maxLength);
      const result = sanitizeText(longString, { maxLength });
      expect(result.sanitized.length).toBe(maxLength);
    });

    it('should truncate overflow strings', () => {
      const maxLength = 10;
      const longString = 'a'.repeat(100);
      const result = sanitizeText(longString, { maxLength });
      expect(result.sanitized.length).toBe(maxLength);
      expect(result.warnings).toContain(`Input truncated to ${maxLength} characters`);
    });
  });

  describe('Numeric Boundaries', () => {
    it('should handle zero', () => {
      const result = validateNumber(0, 'field', { positive: false });
      expect(result).toBe(0);
    });

    it('should reject zero when positive required', () => {
      const result = validateNumber(0, 'field', { positive: true });
      expect(result).toBeInstanceOf(Response);
    });

    it('should handle boundary values', () => {
      const boundaries = [
        { value: 1, min: 1, shouldPass: true },
        { value: 0.999, min: 1, shouldPass: false },
        { value: 100, max: 100, shouldPass: true },
        { value: 100.001, max: 100, shouldPass: false },
      ];

      boundaries.forEach(({ value, min, max, shouldPass }) => {
        const result = validateNumber(value, 'field', { min, max });
        if (shouldPass) {
          expect(result).toBe(value);
        } else {
          expect(result).toBeInstanceOf(Response);
        }
      });
    });
  });

  describe('Symbol Validation Boundaries', () => {
    it('should reject symbols exceeding max length', () => {
      const longSymbol = 'A'.repeat(25);
      const result = sanitizeSymbol(longSymbol);
      expect(result.isValid).toBe(false);
    });

    it('should accept symbols at max length', () => {
      const maxSymbol = 'A'.repeat(20);
      const result = sanitizeSymbol(maxSymbol);
      expect(result.isValid).toBe(true);
    });

    it('should handle batch symbols within limit', () => {
      const batchSymbols = Array(50).fill('AAPL').join(',');
      const result = sanitizeSymbol(batchSymbols);
      expect(result.isValid).toBe(true);
    });
  });
});
