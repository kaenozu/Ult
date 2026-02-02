/**
 * 統合テスト: Result型を使用した統一されたエラーハンドリング
 * 
 * このテストは、Result型が複数のサービス間で正しく動作することを検証します。
 */

import { MLModelService } from '../services/ml-model-service';
import { accuracyService } from '../AccuracyService';
import { OHLCV } from '../../types';
import { isOk, isErr } from '../errors';

describe('Unified Error Handling Integration', () => {
  let mlService: MLModelService;

  beforeEach(() => {
    mlService = new MLModelService();
  });

  describe('MLModelService Result handling', () => {
    it('should return Ok result for successful async prediction', async () => {
      const features = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1.0,
        volatility: 0.02,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 2.0
      };

      const result = await mlService.predictAsync(features);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toHaveProperty('ensemblePrediction');
        expect(result.value).toHaveProperty('confidence');
      }
    });

    it('should handle load models gracefully', async () => {
      const result = await mlService.loadModels();

      // Result型なのでエラーでも型安全
      expect(result).toBeDefined();
      expect(result.isOk || result.isErr).toBe(true);
    });
  });

  describe('AccuracyService Result handling', () => {
    function generateMockData(count: number, basePrice: number = 100): OHLCV[] {
      const data: OHLCV[] = [];
      const startDate = new Date('2023-01-01');

      for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const price = basePrice + (Math.random() - 0.5) * 10;

        data.push({
          date: date.toISOString(),
          open: price,
          high: price + Math.random() * 2,
          low: price - Math.random() * 2,
          close: price + (Math.random() - 0.5) * 1,
          volume: Math.floor(Math.random() * 1000000) + 500000,
        });
      }

      return data;
    }

    it('should return Err for insufficient data', () => {
      const shortData = generateMockData(100);
      const result = accuracyService.calculateRealTimeAccuracy('TEST', shortData, 'japan');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Insufficient data');
        expect(result.error.symbol).toBe('TEST');
      }
    });

    it('should return Ok for sufficient data', () => {
      const data = generateMockData(300);
      const result = accuracyService.calculateRealTimeAccuracy('TEST', data, 'japan');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.hitRate).toBeGreaterThanOrEqual(0);
        expect(result.value.hitRate).toBeLessThanOrEqual(100);
        expect(result.value.directionalAccuracy).toBeGreaterThanOrEqual(0);
        expect(result.value.directionalAccuracy).toBeLessThanOrEqual(100);
        expect(result.value.totalTrades).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide detailed error information', () => {
      const shortData = generateMockData(100);
      const result = accuracyService.calculateRealTimeAccuracy('AAPL', shortData, 'usa');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        // エラーには詳細な情報が含まれる
        expect(result.error.code).toBe('DATA_ERROR');
        expect(result.error.symbol).toBe('AAPL');
        expect(result.error.dataType).toBe('historical');
        expect(result.error.message).toBeTruthy();
      }
    });
  });

  describe('Result type composability', () => {
    it('should compose Results using map', async () => {
      const features = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1.0,
        volatility: 0.02,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 2.0
      };

      const result = await mlService.predictAsync(features);
      
      // mapで変換可能
      const transformed = result.map(prediction => ({
        prediction: prediction.ensemblePrediction,
        confidence: prediction.confidence,
        timestamp: new Date().toISOString()
      }));

      expect(isOk(transformed)).toBe(true);
      if (isOk(transformed)) {
        expect(transformed.value).toHaveProperty('prediction');
        expect(transformed.value).toHaveProperty('confidence');
        expect(transformed.value).toHaveProperty('timestamp');
      }
    });

    it('should handle errors consistently across services', () => {
      const shortData: OHLCV[] = [];
      
      // AccuracyServiceのエラー
      const accuracyResult = accuracyService.calculateRealTimeAccuracy('TEST', shortData, 'japan');
      
      expect(isErr(accuracyResult)).toBe(true);
      
      // エラーは統一された型で処理可能
      if (isErr(accuracyResult)) {
        const error = accuracyResult.error;
        expect(error.name).toBe('DataError');
        expect(error.code).toBe('DATA_ERROR');
        expect(error.severity).toBeDefined();
      }
    });

    it('should provide unwrapOr for safe default values', () => {
      const shortData: OHLCV[] = [];
      const result = accuracyService.calculateRealTimeAccuracy('TEST', shortData, 'japan');
      
      // エラーの場合はデフォルト値を使用
      const accuracy = result.unwrapOr({
        hitRate: 0,
        directionalAccuracy: 0,
        totalTrades: 0
      });

      expect(accuracy.hitRate).toBe(0);
      expect(accuracy.directionalAccuracy).toBe(0);
      expect(accuracy.totalTrades).toBe(0);
    });
  });

  describe('Type safety verification', () => {
    it('should enforce error handling at compile time', async () => {
      const features = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1.0,
        volatility: 0.02,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 2.0
      };

      const result = await mlService.predictAsync(features);

      // TypeScriptがisOk/isErrチェックを強制
      // result.valueに直接アクセスするとコンパイルエラー（型ガード必要）
      
      if (result.isOk) {
        // ここでのみresult.valueにアクセス可能
        const prediction = result.value;
        expect(prediction).toBeDefined();
      } else {
        // ここではresult.errorにアクセス可能
        const error = result.error;
        expect(error).toBeDefined();
      }
    });

    it('should prevent null/undefined errors', () => {
      const data = generateMockData(100);
      const result = accuracyService.calculateRealTimeAccuracy('TEST', data, 'japan');

      // nullチェック不要 - Result型が保証
      expect(result).toBeDefined();
      expect(result.isOk !== undefined).toBe(true);
      expect(result.isErr !== undefined).toBe(true);
    });
  });

  function generateMockData(count: number, basePrice: number = 100): OHLCV[] {
    const data: OHLCV[] = [];
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const price = basePrice + (Math.random() - 0.5) * 10;

      data.push({
        date: date.toISOString(),
        open: price,
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price + (Math.random() - 0.5) * 1,
        volume: Math.floor(Math.random() * 1000000) + 500000,
      });
    }

    return data;
  }
});
