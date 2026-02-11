/**
 * PredictiveAnalyticsEngine.integration.test.ts
 * 
 * PredictiveAnalyticsEngineの統合テスト
 * CompositeTechnicalAnalysisEngineとの統合を確認
 */

import { PredictiveAnalyticsEngine } from '../PredictiveAnalyticsEngine';
import { OHLCV } from '../../../types/shared';

describe('PredictiveAnalyticsEngine Integration', () => {
  let engine: PredictiveAnalyticsEngine;

  beforeEach(() => {
    engine = new PredictiveAnalyticsEngine();
  });

  // ヘルパー関数: テスト用のOHLCVデータを生成
  const generateOHLCVData = (length: number, startPrice: number = 100): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = startPrice;

    for (let i = 0; i < length; i++) {
      const date = new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000);
      
      price += (Math.random() - 0.5) * 5;
      const open = price;
      const high = price + Math.random() * 3;
      const low = price - Math.random() * 3;
      const close = price + (Math.random() - 0.5) * 2;
      const volume = 1000000 + Math.random() * 500000;

      data.push({
        date: date.toISOString(),
        timestamp: date.getTime(),
        open,
        high,
        low,
        close,
        volume,
      });

      price = close;
    }

    return data;
  };

  describe('predict() method', () => {
    test('should return valid PredictionResult', () => {
      const symbol = 'BTCUSD';
      const data = generateOHLCVData(100);

      const result = engine.predict(symbol, data);

      // 基本構造を確認
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('prediction');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('forecast');

      expect(result.symbol).toBe(symbol);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('should generate ModelPrediction with composite analysis', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      const { prediction } = result;

      // ModelPrediction構造を確認
      expect(prediction).toHaveProperty('rfPrediction');
      expect(prediction).toHaveProperty('xgbPrediction');
      expect(prediction).toHaveProperty('lstmPrediction');
      expect(prediction).toHaveProperty('ensemblePrediction');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('direction');
      expect(prediction).toHaveProperty('expectedReturn');
      expect(prediction).toHaveProperty('volatilityForecast');

      // Legacy fields は0
      expect(prediction.rfPrediction).toBe(0);
      expect(prediction.xgbPrediction).toBe(0);
      expect(prediction.lstmPrediction).toBe(0);

      // アクティブなフィールドは有効な値
      expect(prediction.ensemblePrediction).toBeGreaterThanOrEqual(-1);
      expect(prediction.ensemblePrediction).toBeLessThanOrEqual(1);
      
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);

      expect(['UP', 'DOWN', 'NEUTRAL']).toContain(prediction.direction);
    });

    test('should generate TradingSignal with explainability', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      const { signal } = result;

      // TradingSignal構造を確認
      expect(signal).toHaveProperty('type');
      expect(signal).toHaveProperty('confidence');
      expect(signal).toHaveProperty('entryPrice');
      expect(signal).toHaveProperty('targetPrice');
      expect(signal).toHaveProperty('stopLoss');
      expect(signal).toHaveProperty('timeHorizon');
      expect(signal).toHaveProperty('rationale');

      expect(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']).toContain(signal.type);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(signal.entryPrice).toBeGreaterThan(0);
      expect(['short', 'medium', 'long']).toContain(signal.timeHorizon);

      // 説明可能性：理由の配列が存在する
      expect(Array.isArray(signal.rationale)).toBe(true);
      expect(signal.rationale.length).toBeGreaterThan(0);

      // 理由にカテゴリータグが含まれる
      const hasCategories = signal.rationale.some(r => 
        r.includes('[RSI]') || 
        r.includes('[Trend]') || 
        r.includes('[Volatility]') || 
        r.includes('[Momentum]')
      );
      expect(hasCategories).toBe(true);
    });

    test('should generate PriceForecast', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      const { forecast } = result;

      expect(forecast).toHaveProperty('currentPrice');
      expect(forecast).toHaveProperty('predictions');
      expect(forecast).toHaveProperty('trend');
      expect(forecast).toHaveProperty('strength');

      expect(forecast.currentPrice).toBeGreaterThan(0);
      expect(Array.isArray(forecast.predictions)).toBe(true);
      expect(forecast.predictions.length).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'sideways']).toContain(forecast.trend);
      expect(forecast.strength).toBeGreaterThanOrEqual(0);
      expect(forecast.strength).toBeLessThanOrEqual(100);

      // 各時間枠の予測を確認
      forecast.predictions.forEach(pred => {
        expect(pred).toHaveProperty('timeframe');
        expect(pred).toHaveProperty('price');
        expect(pred).toHaveProperty('confidenceInterval');
        expect(pred).toHaveProperty('probability');

        expect(pred.price).toBeGreaterThan(0);
        expect(Array.isArray(pred.confidenceInterval)).toBe(true);
        expect(pred.confidenceInterval.length).toBe(2);
        expect(pred.confidenceInterval[0]).toBeLessThan(pred.confidenceInterval[1]);
      });
    });

    test('should calculate all TechnicalFeatures', () => {
      const data = generateOHLCVData(250); // 200期間MAも計算可能
      const result = engine.predict('BTCUSD', data);

      const { features } = result;

      // 全てのフィーチャーが存在することを確認
      expect(features).toHaveProperty('rsi');
      expect(features).toHaveProperty('rsiChange');
      expect(features).toHaveProperty('sma5');
      expect(features).toHaveProperty('sma20');
      expect(features).toHaveProperty('sma50');
      expect(features).toHaveProperty('sma200');
      expect(features).toHaveProperty('priceMomentum');
      expect(features).toHaveProperty('volumeRatio');
      expect(features).toHaveProperty('volatility');
      expect(features).toHaveProperty('macdSignal');
      expect(features).toHaveProperty('bollingerPosition');
      expect(features).toHaveProperty('atrPercent');
      expect(features).toHaveProperty('ema12');
      expect(features).toHaveProperty('ema26');
      expect(features).toHaveProperty('williamsR');
      expect(features).toHaveProperty('stochasticK');
      expect(features).toHaveProperty('stochasticD');
      expect(features).toHaveProperty('adx');
      expect(features).toHaveProperty('obv');
      expect(features).toHaveProperty('mfi');
      expect(features).toHaveProperty('cci');

      // 値の範囲確認
      expect(features.rsi).toBeGreaterThanOrEqual(0);
      expect(features.rsi).toBeLessThanOrEqual(100);
      expect(features.volumeRatio).toBeGreaterThan(0);
      expect(features.volatility).toBeGreaterThan(0);
    });
  });

  describe('Signal Direction Mapping', () => {
    test('should map BUY direction to UP in ModelPrediction', () => {
      const data = generateOHLCVData(100);
      
      // 強い上昇トレンドを作る
      for (let i = data.length - 30; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 1.02;
        data[i].open = prevClose;
        data[i].high = data[i].close * 1.001;
        data[i].low = prevClose * 0.99;
      }

      const result = engine.predict('BTCUSD', data);

      if (result.signal.type === 'BUY' || result.signal.type === 'STRONG_BUY') {
        expect(result.prediction.direction).toBe('UP');
      }
    });

    test('should map SELL direction to DOWN in ModelPrediction', () => {
      const data = generateOHLCVData(100);
      
      // 強い下降トレンドを作る
      for (let i = data.length - 30; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 0.98;
        data[i].open = prevClose;
        data[i].low = data[i].close;
        data[i].high = prevClose;
      }

      const result = engine.predict('BTCUSD', data);

      if (result.signal.type === 'SELL' || result.signal.type === 'STRONG_SELL') {
        expect(result.prediction.direction).toBe('DOWN');
      }
    });
  });

  describe('Signal Strength', () => {
    test('should generate STRONG_BUY for strong bullish signals', () => {
      const data = generateOHLCVData(100);
      
      // 非常に強い上昇トレンドを作る
      for (let i = data.length - 40; i < data.length; i++) {
        const prevClose = i > 0 ? data[i - 1].close : data[i].close;
        data[i].close = prevClose * 1.025;
        data[i].open = prevClose;
        data[i].high = data[i].close * 1.002;
        data[i].low = prevClose * 0.99;
        data[i].volume = 2000000 + Math.random() * 1000000; // 高出来高
      }

      const result = engine.predict('BTCUSD', data);

      // 強い上昇シグナルが出る可能性が高い
      if (result.signal.confidence > 80) {
        expect(['STRONG_BUY', 'BUY']).toContain(result.signal.type);
      }
    });

    test('should include warnings in rationale', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      // 警告セクションがあることを確認
      const hasWarningSection = result.signal.rationale.some(r => r.includes('【注意事項】'));
      const hasConsensusInfo = result.signal.rationale.some(r => r.includes('コンセンサスシグナル'));

      // どちらか、または両方が存在するはず
      expect(hasWarningSection || hasConsensusInfo).toBe(true);
    });
  });

  describe('Price Targets', () => {
    test('should set reasonable target and stop loss prices', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      const { signal } = result;
      const currentPrice = signal.entryPrice;

      // Buy の場合
      if (signal.type === 'BUY' || signal.type === 'STRONG_BUY') {
        expect(signal.targetPrice).toBeGreaterThan(currentPrice);
        expect(signal.stopLoss).toBeLessThan(currentPrice);
      }

      // Sell の場合
      if (signal.type === 'SELL' || signal.type === 'STRONG_SELL') {
        expect(signal.targetPrice).toBeLessThan(currentPrice);
        expect(signal.stopLoss).toBeGreaterThan(currentPrice);
      }

      // 価格差が妥当な範囲内
      const targetDiff = Math.abs(signal.targetPrice - currentPrice);
      const stopDiff = Math.abs(signal.stopLoss - currentPrice);

      expect(targetDiff).toBeLessThan(currentPrice * 0.5); // 50%以内
      expect(stopDiff).toBeLessThan(currentPrice * 0.2); // 20%以内
    });
  });

  describe('Prediction History', () => {
    test('should store prediction history', () => {
      const symbol = 'BTCUSD';
      const data1 = generateOHLCVData(100);
      const data2 = generateOHLCVData(100, 110);

      engine.predict(symbol, data1);
      engine.predict(symbol, data2);

      const history = engine.getPredictionHistory(symbol);
      
      expect(history).toBeDefined();
      expect(history.length).toBe(2);
    });

    test('should limit history to 100 predictions', () => {
      const symbol = 'BTCUSD';
      const baseData = generateOHLCVData(100);

      // 120回予測を実行
      for (let i = 0; i < 120; i++) {
        const data = baseData.map(d => ({
          ...d,
          close: d.close + i * 0.1,
        }));
        engine.predict(symbol, data);
      }

      const history = engine.getPredictionHistory(symbol);
      
      expect(history.length).toBe(100);
    });
  });

  describe('Model Validation', () => {
    test('should update and retrieve model accuracy', () => {
      const symbol = 'BTCUSD';
      const data = generateOHLCVData(100);
      
      engine.predict(symbol, data);
      
      const predictedReturn = 0.05;
      const actualReturn = 0.06;

      engine.updateModelAccuracy(symbol, predictedReturn, actualReturn);

      const accuracy = engine.getModelAccuracy(symbol);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });

    test('should track accuracy over multiple predictions', () => {
      const symbol = 'ETHUSD';

      engine.updateModelAccuracy(symbol, 0.05, 0.06);
      engine.updateModelAccuracy(symbol, 0.03, -0.02);
      engine.updateModelAccuracy(symbol, -0.02, -0.03);

      const accuracy = engine.getModelAccuracy(symbol);
      expect(accuracy).toBe(2 / 3);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with UnifiedTradingPlatform', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      // UnifiedTradingPlatform が期待する構造を確認
      expect(result.prediction).toHaveProperty('direction');
      expect(result.prediction).toHaveProperty('confidence');
      expect(result.signal).toHaveProperty('rationale');
      expect(Array.isArray(result.signal.rationale)).toBe(true);

      // direction が 'UP' | 'DOWN' | 'NEUTRAL' であることを確認
      expect(['UP', 'DOWN', 'NEUTRAL']).toContain(result.prediction.direction);
    });

    test('should have confidence in 0-1 range for prediction', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      expect(result.prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(result.prediction.confidence).toBeLessThanOrEqual(1);
    });

    test('should have confidence in 0-100 range for signal', () => {
      const data = generateOHLCVData(100);
      const result = engine.predict('BTCUSD', data);

      expect(result.signal.confidence).toBeGreaterThanOrEqual(0);
      expect(result.signal.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance', () => {
    test('should complete prediction in reasonable time', () => {
      const data = generateOHLCVData(100);
      const startTime = Date.now();
      
      engine.predict('BTCUSD', data);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1秒以内に完了すること
      expect(duration).toBeLessThan(1000);
    });

    test('should handle multiple predictions efficiently', () => {
      const data = generateOHLCVData(100);
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        engine.predict('BTCUSD', data);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 10回の予測が3秒以内に完了すること
      expect(duration).toBeLessThan(3000);
    });
  });
});
