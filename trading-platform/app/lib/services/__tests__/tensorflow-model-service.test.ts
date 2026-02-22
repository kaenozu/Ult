/**
 * Tests for TensorFlow.js Model Service
 */

import {
  LSTMModel,
  GRUModel,
  FeedForwardModel,
  featuresToArray
} from '../tensorflow-model-service';
import { PredictionFeatures } from '../feature-engineering-service';

describe('TensorFlow.js Model Service', () => {
  describe('FeedForwardModel', () => {
    let model: FeedForwardModel;

    beforeEach(() => {
      model = new FeedForwardModel();
    });

    afterEach(() => {
      if (model) {
        model.dispose();
      }
    });

    it('should create model successfully', () => {
      expect(model).toBeDefined();
      expect(model.getMetrics).toBeDefined();
    });

    it('should throw error when predicting without training', async () => {
      const features = [0.5, 0.05, 0.02, 0.01, 0.005, 0.3, 1.5, 0.02, 0.2, 0.6, 0.25];
      await expect(model.predict(features)).rejects.toThrow();
    });

    it('should return metrics after initialization', () => {
      const metrics = model.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.mae).toBe(0);
      expect(metrics.rmse).toBe(0);
      expect(metrics.accuracy).toBe(0);
    });
  });

  describe('LSTMModel', () => {
    let model: LSTMModel;

    beforeEach(() => {
      model = new LSTMModel();
    });

    afterEach(() => {
      if (model) {
        model.dispose();
      }
    });

    it('should create model successfully', () => {
      expect(model).toBeDefined();
    });

    it('should throw error when predicting without training', async () => {
      const features = [0.5, 0.05, 0.02, 0.01, 0.005, 0.3, 1.5, 0.02, 0.2, 0.6, 0.25];
      await expect(model.predict(features)).rejects.toThrow();
    });
  });

  describe('GRUModel', () => {
    let model: GRUModel;

    beforeEach(() => {
      model = new GRUModel();
    });

    afterEach(() => {
      if (model) {
        model.dispose();
      }
    });

    it('should create model successfully', () => {
      expect(model).toBeDefined();
    });

    it('should throw error when predicting without training', async () => {
      const features = [0.5, 0.05, 0.02, 0.01, 0.005, 0.3, 1.5, 0.02, 0.2, 0.6, 0.25];
      await expect(model.predict(features)).rejects.toThrow();
    });
  });

  describe('featuresToArray', () => {
    it('should convert PredictionFeatures to normalized array', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 5,
        sma5: 2,
        sma20: 1,
        sma50: 0.5,
        priceMomentum: 3,
        volumeRatio: 1.5,
        volatility: 0.02,
        macdSignal: 2,
        bollingerPosition: 60,
        atrPercent: 2.5
      };

      const array = featuresToArray(features);

      expect(array).toHaveLength(11);
      expect(array[0]).toBe(0.5); // rsi / 100
      expect(array[1]).toBe(0.05); // rsiChange / 100
      expect(array[2]).toBe(0.02); // sma5 / 100
      expect(array[6]).toBe(1.5); // volumeRatio
      expect(array[7]).toBe(0.02); // volatility
    });

    it('should handle extreme values', () => {
      const features: PredictionFeatures = {
        rsi: 100,
        rsiChange: -50,
        sma5: 100,
        sma20: -100,
        sma50: 50,
        priceMomentum: 100,
        volumeRatio: 5.0,
        volatility: 0.1,
        macdSignal: -50,
        bollingerPosition: 100,
        atrPercent: 10
      };

      const array = featuresToArray(features);

      expect(array).toHaveLength(11);
      expect(isFinite(array.reduce((a, b) => a + b, 0))).toBe(true);
    });

    it('should handle zero values', () => {
      const features: PredictionFeatures = {
        rsi: 0,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 0,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 0,
        atrPercent: 0
      };

      const array = featuresToArray(features);

      expect(array).toHaveLength(11);
      expect(array.every(v => v === 0)).toBe(true);
    });

    it('should normalize RSI to 0-1 range', () => {
      const features: PredictionFeatures = {
        rsi: 75,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 0
      };

      const array = featuresToArray(features);
      expect(array[0]).toBe(0.75); // 75 / 100
    });

    it('should normalize bollinger position to 0-1 range', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 80,
        atrPercent: 0
      };

      const array = featuresToArray(features);
      expect(array[9]).toBe(0.8); // 80 / 100
    });

    it('should scale momentum values', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 5,
        volumeRatio: 1,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 0
      };

      const array = featuresToArray(features);
      expect(array[5]).toBe(0.5); // 5 / 10
    });

    it('should preserve volume ratio as-is', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 2.5,
        volatility: 0,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 0
      };

      const array = featuresToArray(features);
      expect(array[6]).toBe(2.5);
    });

    it('should preserve volatility as-is', () => {
      const features: PredictionFeatures = {
        rsi: 50,
        rsiChange: 0,
        sma5: 0,
        sma20: 0,
        sma50: 0,
        priceMomentum: 0,
        volumeRatio: 1,
        volatility: 0.035,
        macdSignal: 0,
        bollingerPosition: 50,
        atrPercent: 0
      };

      const array = featuresToArray(features);
      expect(array[7]).toBe(0.035);
    });
  });

  describe('Model instantiation', () => {
    it('should create all model types without errors', () => {
      const ff = new FeedForwardModel();
      const lstm = new LSTMModel();
      const gru = new GRUModel();

      expect(ff).toBeDefined();
      expect(lstm).toBeDefined();
      expect(gru).toBeDefined();

      ff.dispose();
      lstm.dispose();
      gru.dispose();
    });

    it('should allow disposal of models', () => {
      const model = new FeedForwardModel();
      expect(() => model.dispose()).not.toThrow();
    });

    it('should allow multiple disposals safely', () => {
      const model = new FeedForwardModel();
      model.dispose();
      expect(() => model.dispose()).not.toThrow();
    });
  });
});

