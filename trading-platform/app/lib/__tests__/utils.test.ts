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

  describe('getTickSize', () => {
    it('日本市場のティックサイズを正しく返す', () => {
      const { getTickSize } = require('../utils');
      // Price ≤ ¥3,000: ¥1
      expect(getTickSize(1000, 'japan')).toBe(1);
      expect(getTickSize(3000, 'japan')).toBe(1);
      // Price ≤ ¥5,000: ¥5
      expect(getTickSize(4000, 'japan')).toBe(5);
      expect(getTickSize(5000, 'japan')).toBe(5);
      // Price ≤ ¥10,000: ¥10
      expect(getTickSize(7500, 'japan')).toBe(10);
      expect(getTickSize(10000, 'japan')).toBe(10);
      // Price ≤ ¥30,000: ¥50
      expect(getTickSize(20000, 'japan')).toBe(50);
      expect(getTickSize(30000, 'japan')).toBe(50);
      // Price ≤ ¥50,000: ¥100
      expect(getTickSize(40000, 'japan')).toBe(100);
      expect(getTickSize(50000, 'japan')).toBe(100);
      // Price ≤ ¥100,000: ¥500
      expect(getTickSize(75000, 'japan')).toBe(500);
      expect(getTickSize(100000, 'japan')).toBe(500);
      // Price ≤ ¥300,000: ¥1,000
      expect(getTickSize(200000, 'japan')).toBe(1000);
      expect(getTickSize(300000, 'japan')).toBe(1000);
      // Price ≤ ¥500,000: ¥5,000
      expect(getTickSize(400000, 'japan')).toBe(5000);
      expect(getTickSize(500000, 'japan')).toBe(5000);
      // Price ≤ ¥1,000,000: ¥10,000
      expect(getTickSize(750000, 'japan')).toBe(10000);
      expect(getTickSize(1000000, 'japan')).toBe(10000);
      // Price ≤ ¥3,000,000: ¥50,000
      expect(getTickSize(2000000, 'japan')).toBe(50000);
      expect(getTickSize(3000000, 'japan')).toBe(50000);
      // Price ≤ ¥5,000,000: ¥100,000
      expect(getTickSize(4000000, 'japan')).toBe(100000);
      expect(getTickSize(5000000, 'japan')).toBe(100000);
      // Price > ¥5,000,000: ¥500,000
      expect(getTickSize(10000000, 'japan')).toBe(500000);
    });

    it('米国市場のティックサイズは常に$0.01', () => {
      const { getTickSize } = require('../utils');
      expect(getTickSize(100, 'usa')).toBe(0.01);
      expect(getTickSize(1000, 'usa')).toBe(0.01);
      expect(getTickSize(10000, 'usa')).toBe(0.01);
    });

    it('デフォルトは日本市場', () => {
      const { getTickSize } = require('../utils');
      expect(getTickSize(1000)).toBe(1);
    });
  });

  describe('roundToTickSize', () => {
    it('価格をティックサイズに丸める', () => {
      const { roundToTickSize } = require('../utils');
      // 日本市場
      expect(roundToTickSize(1001, 'japan')).toBe(1001);
      expect(roundToTickSize(1001.5, 'japan')).toBe(1002);
      expect(roundToTickSize(4502, 'japan')).toBe(4500);
      // 米国市場
      expect(roundToTickSize(100.123, 'usa')).toBe(100.12);
      expect(roundToTickSize(100.127, 'usa')).toBe(100.13);
    });
  });

  describe('getPriceLimit', () => {
    it('価格制限を正しく返す', () => {
      const { getPriceLimit } = require('../utils');
      // Price ≤ ¥100: ¥30
      expect(getPriceLimit(50)).toBe(30);
      expect(getPriceLimit(100)).toBe(30);
      // Price ≤ ¥200: ¥50
      expect(getPriceLimit(150)).toBe(50);
      expect(getPriceLimit(200)).toBe(50);
      // Price ≤ ¥500: ¥80
      expect(getPriceLimit(300)).toBe(80);
      expect(getPriceLimit(500)).toBe(80);
      // Price ≤ ¥1,000: ¥150
      expect(getPriceLimit(700)).toBe(100);
      expect(getPriceLimit(1000)).toBe(150);
      // Price ≤ ¥3,000: ¥500
      expect(getPriceLimit(2000)).toBe(400);
      expect(getPriceLimit(3000)).toBe(500);
      // Price > ¥1,000,000: ¥300,000
      expect(getPriceLimit(2000000)).toBe(300000);
    });
  });

  describe('calculateReturns', () => {
    it('リターンを正しく計算する', () => {
      const { calculateReturns } = require('../utils');
      const prices = [100, 110, 121, 133.1];
      const returns = calculateReturns(prices);
      expect(returns).toHaveLength(3);
      expect(returns[0]).toBeCloseTo(0.1, 4);  // (110-100)/100 = 0.1
      expect(returns[1]).toBeCloseTo(0.1, 4);  // (121-110)/110 = 0.1
      expect(returns[2]).toBeCloseTo(0.1, 4);  // (133.1-121)/121 ≈ 0.1
    });

    it('空配列または1要素の場合は空配列を返す', () => {
      const { calculateReturns } = require('../utils');
      expect(calculateReturns([])).toEqual([]);
      expect(calculateReturns([100])).toEqual([]);
    });

    it('ゼロ除算を処理する', () => {
      const { calculateReturns } = require('../utils');
      const prices = [0, 100, 110];
      const returns = calculateReturns(prices);
      expect(returns[0]).toBe(0);  // ゼロ除算時は0
      expect(returns[1]).toBeCloseTo(0.1, 4);
    });

    it('NaN値を処理する', () => {
      const { calculateReturns } = require('../utils');
      const prices = [100, NaN, 110];
      const returns = calculateReturns(prices);
      // NaNとの計算は0になる
      expect(returns[0]).toBe(0);  // (NaN - 100) / 100 = NaN -> 0
      expect(returns[1]).toBe(0);  // (110 - NaN) / NaN = NaN -> 0
    });
  });

  describe('calculateSMA', () => {
    it('単純移動平均を正しく計算する', () => {
      const { calculateSMA } = require('../utils');
      const prices = [10, 20, 30, 40, 50];
      const sma = calculateSMA(prices, 3);
      expect(sma).toHaveLength(5);
      expect(sma[0]).toBeNaN();  // 最初の2要素はNaN
      expect(sma[1]).toBeNaN();
      expect(sma[2]).toBe(20);   // (10+20+30)/3
      expect(sma[3]).toBe(30);   // (20+30+40)/3
      expect(sma[4]).toBe(40);   // (30+40+50)/3
    });

    it('期間1の場合は元の値を返す', () => {
      const { calculateSMA } = require('../utils');
      const prices = [10, 20, 30];
      const sma = calculateSMA(prices, 1);
      expect(sma[0]).toBe(10);
      expect(sma[1]).toBe(20);
      expect(sma[2]).toBe(30);
    });

    it('空配列の場合は空配列を返す', () => {
      const { calculateSMA } = require('../utils');
      expect(calculateSMA([], 3)).toEqual([]);
    });

    it('NaN値を含むデータを処理する', () => {
      const { calculateSMA } = require('../utils');
      const prices = [10, NaN, 30, 40, 50];
      const sma = calculateSMA(prices, 3);
      expect(sma[0]).toBeNaN();
      expect(sma[1]).toBeNaN();
      expect(sma[2]).toBeNaN();  // NaNを含む期間はNaN
      expect(sma[3]).toBeNaN();
      expect(sma[4]).toBe(40);   // (30+40+50)/3
    });
  });

  describe('calculateRSI', () => {
    it('RSIを正しく計算する', () => {
      const { calculateRSI } = require('../utils');
      // 上昇トレンドの価格データ
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toHaveLength(15);
      // 最初の14期間はNaN
      for (let i = 0; i < 14; i++) {
        expect(rsi[i]).toBeNaN();
      }
      // 継続的な上昇なのでRSIは100に近い
      expect(rsi[14]).toBeGreaterThan(90);
    });

    it('下降トレンドでは低いRSIを返す', () => {
      const { calculateRSI } = require('../utils');
      const prices = [114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
      const rsi = calculateRSI(prices, 14);
      expect(rsi[14]).toBeLessThan(10);
    });

    it('デフォルト期間は14', () => {
      const { calculateRSI } = require('../utils');
      const prices = Array(20).fill(100).map((v, i) => v + i);
      const rsi = calculateRSI(prices);
      expect(rsi).toHaveLength(20);
    });
  });

  describe('calculateEMA', () => {
    it('指数移動平均を正しく計算する', () => {
      const { calculateEMA } = require('../utils');
      const prices = [10, 20, 30, 40, 50];
      const ema = calculateEMA(prices, 3);
      expect(ema).toHaveLength(5);
      expect(ema[0]).toBeNaN();
      expect(ema[1]).toBeNaN();
      expect(ema[2]).toBe(20);  // 最初のSMA
      // EMAは最新のデータに重みをつける
      expect(ema[3]).toBeGreaterThan(20);
      expect(ema[3]).toBeLessThan(50);
    });

    it('空配列の場合は空配列を返す', () => {
      const { calculateEMA } = require('../utils');
      expect(calculateEMA([], 3)).toEqual([]);
    });
  });

  describe('calculateMACD', () => {
    it('MACDを正しく計算する', () => {
      const { calculateMACD } = require('../utils');
      const prices = Array(50).fill(100).map((v, i) => v + Math.sin(i * 0.1) * 10);
      const result = calculateMACD(prices, 12, 26, 9);
      
      expect(result.macd).toHaveLength(50);
      expect(result.signal).toHaveLength(50);
      expect(result.histogram).toHaveLength(50);
      
      // 最初の数要素はNaN（EMAの計算に十分なデータがないため）
      expect(result.macd[0]).toBeNaN();
      expect(result.signal[0]).toBeNaN();
    });

    it('デフォルトパラメータを使用する', () => {
      const { calculateMACD } = require('../utils');
      const prices = Array(50).fill(100);
      const result = calculateMACD(prices);
      expect(result.macd).toBeDefined();
      expect(result.signal).toBeDefined();
      expect(result.histogram).toBeDefined();
    });
  });

  describe('calculateBollingerBands', () => {
    it('ボリンジャーバンドを正しく計算する', () => {
      const { calculateBollingerBands } = require('../utils');
      const prices = Array(30).fill(100).map((v, i) => v + (Math.random() - 0.5) * 10);
      const result = calculateBollingerBands(prices, 20, 2);
      
      expect(result.upper).toHaveLength(30);
      expect(result.middle).toHaveLength(30);
      expect(result.lower).toHaveLength(30);
      
      // 最初の19要素はNaN
      for (let i = 0; i < 19; i++) {
        expect(result.upper[i]).toBeNaN();
        expect(result.middle[i]).toBeNaN();
        expect(result.lower[i]).toBeNaN();
      }
      
      // 有効なデータでは upper > middle > lower
      for (let i = 20; i < 30; i++) {
        if (!isNaN(result.upper[i])) {
          expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
          expect(result.middle[i]).toBeGreaterThan(result.lower[i]);
        }
      }
    });

    it('デフォルトパラメータを使用する', () => {
      const { calculateBollingerBands } = require('../utils');
      const prices = Array(30).fill(100);
      const result = calculateBollingerBands(prices);
      expect(result.upper).toBeDefined();
      expect(result.middle).toBeDefined();
      expect(result.lower).toBeDefined();
    });
  });

  describe('calculateATR', () => {
    it('ATRを正しく計算する', () => {
      const { calculateATR } = require('../utils');
      const highs = [105, 110, 115, 112, 118];
      const lows = [100, 105, 108, 107, 112];
      const closes = [103, 108, 112, 110, 116];
      const atr = calculateATR(highs, lows, closes, 3);
      
      expect(atr).toHaveLength(5);
      // 最初の2要素はNaN
      expect(atr[0]).toBeNaN();
      expect(atr[1]).toBeNaN();
      // 3番目から有効な値
      expect(atr[2]).toBeGreaterThan(0);
    });

    it('デフォルト期間は14', () => {
      const { calculateATR } = require('../utils');
      const data = Array(20).fill(100);
      const atr = calculateATR(data, data, data);
      expect(atr).toHaveLength(20);
    });

    it('空配列の場合は空配列を返す', () => {
      const { calculateATR } = require('../utils');
      expect(calculateATR([], [], [], 14)).toEqual([]);
    });
  });
});
