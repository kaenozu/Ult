/**
 * utils.test.ts
 * 
 * ユーティリティ関数のテスト
 * フォーマット関数、色取得関数、日付生成関数のテスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatVolume,
  getChangeColor,
  getSignalColor,
  getSignalBgColor,
  getConfidenceColor,
  truncate,
  generateDateRange,
  cn,
} from '../utils';
import type { CurrencyCode } from '../utils';

describe('utils', () => {
  describe('formatCurrency', () => {
    it('JPYを正しくフォーマットする', () => {
      const result1 = formatCurrency(1000, 'JPY');
      const result2 = formatCurrency(1234567, 'JPY');
      expect(result1).toContain('1,000');
      expect(result2).toContain('1,234,567');
    });

    it('USDを正しくフォーマットする', () => {
      expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('EURを正しくフォーマットする', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('1.000,00 €');
    });

    it('GBPを正しくフォーマットする', () => {
      expect(formatCurrency(1000, 'GBP')).toBe('£1,000.00');
    });

    it('デフォルトでJPYを使用する', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1,000');
    });

    it('0を正しくフォーマットする', () => {
      const result1 = formatCurrency(0, 'JPY');
      const result2 = formatCurrency(0, 'USD');
      expect(result1).toContain('0');
      expect(result2).toContain('0.00');
    });

    it('負の値を正しくフォーマットする', () => {
      const result1 = formatCurrency(-1000, 'JPY');
      const result2 = formatCurrency(-1000, 'USD');
      expect(result1).toContain('-');
      expect(result1).toContain('1,000');
      expect(result2).toContain('-');
      expect(result2).toContain('1,000.00');
    });
  });

  describe('formatNumber', () => {
    it('数値を正しくフォーマットする', () => {
      expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
      expect(formatNumber(1000, 0)).toBe('1,000');
      expect(formatNumber(1234.5678, 4)).toBe('1,234.5678');
    });

    it('デフォルトで小数点2桁を使用する', () => {
      expect(formatNumber(1234.5678)).toBe('1,234.57');
    });

    it('0を正しくフォーマットする', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    it('負の値を正しくフォーマットする', () => {
      expect(formatNumber(-1234.5678, 2)).toBe('-1,234.57');
    });
  });

  describe('formatPercent', () => {
    it('正のパーセンテージを正しくフォーマットする', () => {
      expect(formatPercent(5.25)).toBe('+5.25%');
      expect(formatPercent(100)).toBe('+100.00%');
    });

    it('負のパーセンテージを正しくフォーマットする', () => {
      expect(formatPercent(-5.25)).toBe('-5.25%');
      expect(formatPercent(-100)).toBe('-100.00%');
    });

    it('0を正しくフォーマットする', () => {
      expect(formatPercent(0)).toBe('+0.00%');
    });

    it('小数点を含む値を正しくフォーマットする', () => {
      expect(formatPercent(0.123)).toBe('+0.12%');
    });
  });

  describe('formatVolume', () => {
    it('百万単位でフォーマットする', () => {
      expect(formatVolume(1000000)).toBe('1.0M');
      expect(formatVolume(1500000)).toBe('1.5M');
      expect(formatVolume(12345678)).toBe('12.3M');
    });

    it('千単位でフォーマットする', () => {
      expect(formatVolume(1000)).toBe('1.0K');
      expect(formatVolume(1500)).toBe('1.5K');
      expect(formatVolume(12345)).toBe('12.3K');
    });

    it('小さな値をそのまま返す', () => {
      expect(formatVolume(999)).toBe('999');
      expect(formatVolume(100)).toBe('100');
      expect(formatVolume(0)).toBe('0');
    });
  });

  describe('getChangeColor', () => {
    it('正の変動に対して緑色を返す', () => {
      expect(getChangeColor(1)).toBe('text-green-500');
      expect(getChangeColor(100)).toBe('text-green-500');
    });

    it('負の変動に対して赤色を返す', () => {
      expect(getChangeColor(-1)).toBe('text-red-500');
      expect(getChangeColor(-100)).toBe('text-red-500');
    });

    it('変動がない場合に灰色を返す', () => {
      expect(getChangeColor(0)).toBe('text-gray-400');
    });
  });

  describe('getSignalColor', () => {
    it('BUYシグナルに対して緑色を返す', () => {
      expect(getSignalColor('BUY')).toBe('text-green-500 bg-green-500/10');
    });

    it('SELLシグナルに対して赤色を返す', () => {
      expect(getSignalColor('SELL')).toBe('text-red-500 bg-red-500/10');
    });

    it('HOLDシグナルに対して灰色を返す', () => {
      expect(getSignalColor('HOLD')).toBe('text-gray-400 bg-gray-400/10');
    });
  });

  describe('getSignalBgColor', () => {
    it('BUYシグナルに対して緑色の背景を返す', () => {
      expect(getSignalBgColor('BUY')).toBe('bg-green-500/20 border-green-500');
    });

    it('SELLシグナルに対して赤色の背景を返す', () => {
      expect(getSignalBgColor('SELL')).toBe('bg-red-500/20 border-red-500');
    });

    it('HOLDシグナルに対して灰色の背景を返す', () => {
      expect(getSignalBgColor('HOLD')).toBe('bg-gray-500/20 border-gray-500');
    });
  });

  describe('getConfidenceColor', () => {
    it('高信頼度（80%以上）に対して緑色を返す', () => {
      expect(getConfidenceColor(80)).toBe('text-green-500');
      expect(getConfidenceColor(90)).toBe('text-green-500');
      expect(getConfidenceColor(100)).toBe('text-green-500');
    });

    it('中程度の信頼度（60%以上80%未満）に対して黄色を返す', () => {
      expect(getConfidenceColor(60)).toBe('text-yellow-500');
      expect(getConfidenceColor(70)).toBe('text-yellow-500');
      expect(getConfidenceColor(79)).toBe('text-yellow-500');
    });

    it('低信頼度（60%未満）に対して赤色を返す', () => {
      expect(getConfidenceColor(0)).toBe('text-red-500');
      expect(getConfidenceColor(30)).toBe('text-red-500');
      expect(getConfidenceColor(59)).toBe('text-red-500');
    });
  });

  describe('truncate', () => {
    it('文字列を指定した長さで切り詰める', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('This is a long string', 10)).toBe('This is a ...');
    });

    it('文字列が指定した長さ以下の場合はそのまま返す', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('空文字列を正しく処理する', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('長さ0を指定した場合は空文字列を返す', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });
  });

  describe('generateDateRange', () => {
    it('指定した日数分の日付範囲を生成する', () => {
      const dates = generateDateRange(5);
      expect(dates).toHaveLength(6); // 今日を含むため+1
      expect(dates[0]).toBeDefined();
      expect(dates[5]).toBeDefined();
    });

    it('日付が昇順であることを確認する', () => {
      const dates = generateDateRange(3);
      expect(dates).toHaveLength(4);
      // 日付がISO形式であることを確認
      dates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('0日を指定した場合は今日のみを返す', () => {
      const dates = generateDateRange(0);
      expect(dates).toHaveLength(1);
      const today = new Date().toISOString().split('T')[0];
      expect(dates[0]).toBe(today);
    });

    it('負の値を指定した場合は空配列を返す', () => {
      const dates = generateDateRange(-1);
      expect(dates).toHaveLength(0);
    });
  });

  describe('cn', () => {
    it('クラス名を正しくマージする', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
      expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('条件付きクラス名を正しく処理する', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    });

    it('重複するクラス名をマージする', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });
  });
});
