/**
 * Unit tests for SignalGenerationService
 * Testing the optimized signal generation with improved thresholds and timing
 */

import { signalGenerationService } from '../signal-generation-service';
import { Stock, OHLCV, ModelPrediction } from '../../../types';
import { SIGNAL_THRESHOLDS } from '../../constants';

describe('SignalGenerationService - Optimized Signal Generation', () => {
  // Mock stock data
  const mockStock: Stock = {
    symbol: 'TEST',
    name: 'Test Stock',
    market: 'usa',
    sector: 'Technology',
    price: 100,
    change: 1.5,
    changePercent: 1.5,
    volume: 1000000
  };

  // Helper to generate OHLCV data
  const generateOHLCVData = (days: number, basePrice: number = 100): OHLCV[] => {
    const data: OHLCV[] = [];
    const now = Date.now();
    
    for (let i = 0; i < days; i++) {
      const price = basePrice + (Math.random() - 0.5) * 10;
      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: 1000000 + Math.random() * 500000,
      });
    }
    return data;
  };

  // Mock indicators
  const mockIndicators = {
    rsi: Array(50).fill(50),
    macd: {
      macd: Array(50).fill(0),
      signal: Array(50).fill(0),
      histogram: Array(50).fill(0)
    },
    bollingerBands: {
      upper: Array(50).fill(105),
      middle: Array(50).fill(100),
      lower: Array(50).fill(95)
    },
    sma5: Array(50).fill(100),
    sma20: Array(50).fill(100),
    sma50: Array(50).fill(100),
    atr: 2.0
  };

  describe('Improved Signal Thresholds', () => {
    it('should only generate BUY signal when confidence >= MIN_CONFIDENCE (60)', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 2.0,
        xgbPrediction: 2.0,
        lstmPrediction: 2.0,
        ensemblePrediction: 2.0,
        confidence: 65 // Above new threshold
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators
      );

      expect(signal.type).toBe('BUY');
      expect(signal.confidence).toBeGreaterThanOrEqual(SIGNAL_THRESHOLDS.MIN_CONFIDENCE);
    });

    it('should boost confidence to MIN_CONFIDENCE when below threshold', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 3.0,
        xgbPrediction: 3.0,
        lstmPrediction: 3.0,
        ensemblePrediction: 3.0,
        confidence: 55 // Below MIN_CONFIDENCE threshold
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators
      );

      // Confidence should be boosted to at least MIN_CONFIDENCE
      expect(signal.confidence).toBeGreaterThanOrEqual(SIGNAL_THRESHOLDS.MIN_CONFIDENCE);
      // With strong prediction, should still generate BUY
      expect(signal.type).toBe('BUY');
    });

    it('should mark signals as strong when confidence >= HIGH_CONFIDENCE (85)', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 2.5,
        xgbPrediction: 2.5,
        lstmPrediction: 2.5,
        ensemblePrediction: 2.5,
        confidence: 87 // Above HIGH_CONFIDENCE
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators
      );

      expect(signal.confidence).toBeGreaterThanOrEqual(SIGNAL_THRESHOLDS.HIGH_CONFIDENCE);
      expect(signal.reason).toContain('強気');
    });
  });

  describe('Dynamic Entry Threshold', () => {
    it('should use lower prediction threshold for high confidence signals', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 1.0,
        xgbPrediction: 1.0,
        lstmPrediction: 1.0,
        ensemblePrediction: 1.0,
        confidence: 88 // High confidence
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators
      );

      // With high confidence, even 1.0 prediction should trigger BUY
      expect(signal.type).toBe('BUY');
    });

    it('should require higher prediction for medium confidence signals', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 1.0,
        xgbPrediction: 1.0,
        lstmPrediction: 1.0,
        ensemblePrediction: 1.0,
        confidence: 70 // Medium confidence
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators
      );

      // With medium confidence, 1.0 prediction should not be enough
      expect(signal.type).toBe('HOLD');
    });
  });

  describe('Improved Target Price and Stop Loss', () => {
    it('should calculate target with confidence-based multiplier for BUY', () => {
      const data = generateOHLCVData(50, 100);
      const highConfPrediction: ModelPrediction = {
        rfPrediction: 2.0,
        xgbPrediction: 2.0,
        lstmPrediction: 2.0,
        ensemblePrediction: 2.0,
        confidence: 90
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        highConfPrediction,
        { ...mockIndicators, atr: 2.0 }
      );

      const currentPrice = data[data.length - 1].close;

      // Target should be higher with high confidence
      expect(signal.targetPrice).toBeGreaterThan(currentPrice);
      expect(signal.type).toBe('BUY');
    });

    it('should set stop loss at approximately 50% of target distance', () => {
      const data = generateOHLCVData(50, 100);
      const prediction: ModelPrediction = {
        rfPrediction: 2.0,
        xgbPrediction: 2.0,
        lstmPrediction: 2.0,
        ensemblePrediction: 2.0,
        confidence: 75
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        { ...mockIndicators, atr: 2.0 }
      );

      if (signal.type === 'BUY') {
        const currentPrice = data[data.length - 1].close;
        const targetDistance = signal.targetPrice - currentPrice;
        const stopDistance = currentPrice - signal.stopLoss;

        // Stop loss should be approximately 50% of target distance
        expect(Math.abs(stopDistance / targetDistance - 0.5)).toBeLessThan(0.15);
      }
    });
  });

  describe('Entry Timing Evaluation', () => {
    it('should evaluate entry timing and provide comprehensive score', () => {
      const currentPrice = 100;
      const indicators = {
        ...mockIndicators,
        rsi: [...Array(49).fill(50), 35], // Good buy zone
        macd: {
          macd: Array(50).fill(0),
          signal: Array(50).fill(0),
          histogram: [...Array(49).fill(-0.1), 0.1] // Positive and increasing
        }
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        generateOHLCVData(50),
        {
          rfPrediction: 2.0,
          xgbPrediction: 2.0,
          lstmPrediction: 2.0,
          ensemblePrediction: 2.0,
          confidence: 85
        },
        indicators
      );

      const timing = signalGenerationService.evaluateEntryTiming(
        currentPrice,
        indicators,
        signal
      );

      expect(timing.score).toBeGreaterThan(0);
      expect(timing.score).toBeLessThanOrEqual(100);
      expect(['IMMEDIATE', 'WAIT', 'AVOID']).toContain(timing.recommendation);
      expect(Array.isArray(timing.reasons)).toBe(true);
      expect(timing.reasons.length).toBeGreaterThan(0);
    });

    it('should recommend IMMEDIATE for excellent timing conditions', () => {
      const currentPrice = 100;
      const indicators = {
        ...mockIndicators,
        rsi: [...Array(49).fill(50), 35], // Good buy zone
        macd: {
          macd: Array(50).fill(0),
          signal: Array(50).fill(0),
          histogram: [...Array(49).fill(-0.1), 0.1]
        }
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        generateOHLCVData(50),
        {
          rfPrediction: 2.0,
          xgbPrediction: 2.0,
          lstmPrediction: 2.0,
          ensemblePrediction: 2.0,
          confidence: 90
        },
        indicators
      );
      signal.atr = 3.0; // Good volatility

      const timing = signalGenerationService.evaluateEntryTiming(
        currentPrice,
        indicators,
        signal
      );

      expect(timing.score).toBeGreaterThanOrEqual(70);
      expect(timing.recommendation).toBe('IMMEDIATE');
    });
  });

  describe('Market Correlation Enhancement', () => {
    it('should include market context when index data is provided', () => {
      const data = generateOHLCVData(50, 100);
      const indexData = generateOHLCVData(50, 30000);
      
      const prediction: ModelPrediction = {
        rfPrediction: 2.0,
        xgbPrediction: 2.0,
        lstmPrediction: 2.0,
        ensemblePrediction: 2.0,
        confidence: 70
      };

      const signal = signalGenerationService.generateSignal(
        mockStock,
        data,
        prediction,
        mockIndicators,
        indexData
      );

      // Should have market context
      expect(signal.marketContext).toBeDefined();
      if (signal.marketContext) {
        expect(signal.marketContext.correlation).toBeDefined();
        expect(['UP', 'DOWN', 'NEUTRAL']).toContain(signal.marketContext.indexTrend);
      }
    });
  });
});
