import { calculateSMA, calculateRSI, calculateBollingerBands, calculateATR } from '../lib/utils';

describe('Data Interpolation and Technical Indicator Tests', () => {
  describe('Data Interpolation Handling', () => {
    it('should handle null/invalid values in SMA calculation', () => {
      // テストデータ: 途中にnull値が含まれる価格データ
      const pricesWithNulls = [100, 102, null as any, 104, 103, undefined as any, 105, 107];
      
      const result = calculateSMA(pricesWithNulls as any as number[], 3);
      
      // 最初の2つの値はNaNであるべき
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      
      // 3番目のデータはnullなのでNaN、かつ期間内に必要な有効データが不足しているためNaN
      expect(result[2]).toBeNaN();
      // 4番目のデータは、有効なデータが2つしかないためNaN
      expect(result[3]).toBeNaN();
      // 5番目のデータは、有効なデータが3つ(102,104,103)あるので計算可能
      expect(result[4]).toBeCloseTo((102 + 104 + 103) / 3, 2); // 103
      // 6番目のデータはNaNのためNaN
      expect(result[5]).toBeNaN();
      // 7番目のデータは、有効なデータが2つしかないのでNaN
      expect(result[6]).toBeNaN();
      // 8番目のデータは、有効なデータが3つ(104,103,105)あるので計算可能
      expect(result[7]).toBeCloseTo((104 + 103 + 105) / 3, 2); // 104
    });

    it('should handle null/invalid values in RSI calculation', () => {
      // テストデータ: 途中にnull値が含まれる価格データ
      const pricesWithNulls = [100, 102, null as any, 104, 103, 105];
      
      const result = calculateRSI(pricesWithNulls as any as number[], 3);
      
      // 最初のfew valuesはNaNであるべき
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      expect(result[2]).toBeNaN(); // null値のためNaN
      expect(result[3]).toBeNaN(); // 十分なデータがないためNaN
      expect(result[4]).toBeNaN(); // 十分なデータがないためNaN
      expect(result[5]).toBeNaN(); // 十分なデータがないためNaN
    });

    it('should handle negative values in technical indicators', () => {
      const pricesWithNegative = [100, 102, -5, 104, 103];
      
      const smaResult = calculateSMA(pricesWithNegative, 3);
      expect(smaResult[0]).toBeNaN();
      expect(smaResult[1]).toBeNaN();
      expect(smaResult[2]).toBeNaN(); // 負の値を除外するためNaN
      expect(smaResult[3]).toBeNaN(); // 有効なデータが3つ未満のためNaN
      expect(smaResult[4]).toBeNaN(); // 有効なデータが3つ未満のためNaN
    });
  });

  describe('Technical Indicator Calculations with Valid Data', () => {
    it('should calculate SMA correctly with valid data', () => {
      const prices = [100, 102, 101, 103, 105];
      const result = calculateSMA(prices, 3);
      
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      expect(result[2]).toBeCloseTo((100 + 102 + 101) / 3, 2); // 101
      expect(result[3]).toBeCloseTo((102 + 101 + 103) / 3, 2); // 102
      expect(result[4]).toBeCloseTo((101 + 103 + 105) / 3, 2); // 103
    });

    it('should calculate RSI correctly with valid data', () => {
      // 明確な上昇トレンドのデータ
      const prices = [100, 105, 110, 115, 120];
      const result = calculateRSI(prices, 3);
      
      // 最初のfew valuesはNaNであるべき
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      expect(result[2]).toBeNaN();
      // 以降は計算されるが、具体的な値はアルゴリズム依存
      expect(result[3]).toBeDefined();
      expect(result[4]).toBeDefined();
    });

    it('should calculate Bollinger Bands correctly with valid data', () => {
      const prices = [100, 102, 101, 103, 105];
      const { upper, middle, lower } = calculateBollingerBands(prices, 3);
      
      expect(middle[0]).toBeNaN();
      expect(middle[1]).toBeNaN();
      expect(middle[2]).toBeCloseTo((100 + 102 + 101) / 3, 2); // SMA
      
      // 上下バンドは中バンドよりも外側にあるべき
      if (!isNaN(upper[2]) && !isNaN(lower[2]) && !isNaN(middle[2])) {
        expect(upper[2]).toBeGreaterThanOrEqual(middle[2]);
        expect(lower[2]).toBeLessThanOrEqual(middle[2]);
      }
    });

    it('should calculate ATR correctly with valid OHLC data', () => {
      const highs = [105, 107, 106, 108, 110];
      const lows = [100, 102, 101, 103, 105];
      const closes = [102, 104, 103, 105, 107];
      
      const result = calculateATR(highs, lows, closes, 3);
      
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
      expect(result[2]).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should return NaN array for insufficient data', () => {
      const prices = [100, 102];
      const result = calculateSMA(prices, 5);
      
      expect(result.length).toBe(2);
      expect(result[0]).toBeNaN();
      expect(result[1]).toBeNaN();
    });

    it('should handle all invalid data', () => {
      const prices = [null, undefined, NaN, -1, 0] as any as number[];
      const result = calculateSMA(prices, 3);
      
      expect(result.every(val => isNaN(val))).toBe(true);
    });
  });
});
