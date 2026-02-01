/**
 * Tests for Advanced Technical Analysis System
 */

import { OHLCV } from '../../../types/shared';
import {
  IntegratedTechnicalAnalyzer,
  PatternRecognizer,
  CycleAnalyzer,
  FractalAnalyzer,
  WaveletAnalyzer,
  createDefaultPatternConfig,
  createDefaultCycleConfig,
  createDefaultFractalConfig,
  createDefaultWaveletConfig
} from '../technicalAnalysis';

// Generate sample OHLCV data for testing
function generateSampleData(length: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  
  for (let i = 0; i < length; i++) {
    const change = (Math.random() - 0.5) * 2; // Random walk
    price += change;
    
    const high = price + Math.random() * 2;
    const low = price - Math.random() * 2;
    const open = price + (Math.random() - 0.5);
    const close = price + (Math.random() - 0.5);
    
    data.push({
      symbol: 'TEST',
      date: new Date(Date.now() - (length - i) * 86400000).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return data;
}

// Generate trending data
function generateTrendingData(length: number = 100, trend: 'up' | 'down' = 'up'): OHLCV[] {
  const data: OHLCV[] = [];
  let price = 100;
  const direction = trend === 'up' ? 1 : -1;
  
  for (let i = 0; i < length; i++) {
    const change = direction * Math.random() * 2 + (Math.random() - 0.5) * 0.5;
    price += change;
    
    const high = price + Math.random();
    const low = price - Math.random();
    const open = price - direction * Math.random() * 0.5;
    const close = price + direction * Math.random() * 0.5;
    
    data.push({
      symbol: 'TREND',
      date: new Date(Date.now() - (length - i) * 86400000).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000) + 100000
    });
  }
  
  return data;
}

describe('Advanced Technical Analysis System', () => {
  let sampleData: OHLCV[];
  let trendingData: OHLCV[];

  beforeEach(() => {
    sampleData = generateSampleData(100);
    trendingData = generateTrendingData(100, 'up');
  });

  describe('PatternRecognizer', () => {
    let recognizer: PatternRecognizer;

    beforeEach(() => {
      recognizer = new PatternRecognizer(createDefaultPatternConfig());
    });

    it('should recognize candlestick patterns', () => {
      const patterns = recognizer.recognizeCandlestickPatterns(sampleData);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should recognize chart patterns', () => {
      const patterns = recognizer.recognizeChartPatterns(sampleData);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should recognize geometric patterns', () => {
      const patterns = recognizer.recognizeGeometricPatterns(sampleData);
      expect(Array.isArray(patterns)).toBe(true);
      
      // Should have Fibonacci and pivot points
      const hasFibonacci = patterns.some(p => p.type === 'FIBONACCI');
      const hasPivot = patterns.some(p => p.type === 'PIVOT');
      expect(hasFibonacci).toBe(true);
      expect(hasPivot).toBe(true);
    });

    it('should evaluate pattern reliability', () => {
      const patterns = recognizer.recognizeCandlestickPatterns(sampleData);
      if (patterns.length > 0) {
        const reliability = recognizer.evaluatePatternReliability(patterns[0], sampleData);
        expect(reliability).toHaveProperty('successRate');
        expect(reliability).toHaveProperty('confidence');
        expect(reliability.successRate).toBeGreaterThanOrEqual(0);
        expect(reliability.successRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('CycleAnalyzer', () => {
    let analyzer: CycleAnalyzer;

    beforeEach(() => {
      analyzer = new CycleAnalyzer(createDefaultCycleConfig());
    });

    it('should detect price cycles', () => {
      const result = analyzer.detectPriceCycles(sampleData);
      expect(result).toHaveProperty('cycles');
      expect(result).toHaveProperty('dominantCycle');
      expect(result).toHaveProperty('cycleStrength');
      expect(Array.isArray(result.cycles)).toBe(true);
    });

    it('should analyze seasonality', () => {
      const result = analyzer.analyzeSeasonality(sampleData);
      expect(result).toHaveProperty('monthly');
      expect(result).toHaveProperty('weekly');
      expect(result).toHaveProperty('overallSeasonality');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should predict from cycles', () => {
      const prediction = analyzer.predictFromCycles(sampleData, 5);
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions.length).toBe(5);
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect cycle turning points', () => {
      const turningPoints = analyzer.detectCycleTurningPoints(sampleData);
      expect(Array.isArray(turningPoints)).toBe(true);
    });
  });

  describe('FractalAnalyzer', () => {
    let analyzer: FractalAnalyzer;

    beforeEach(() => {
      analyzer = new FractalAnalyzer(createDefaultFractalConfig());
    });

    it('should calculate fractal dimension', () => {
      const result = analyzer.calculateFractalDimension(sampleData);
      expect(result).toHaveProperty('fractalDimension');
      expect(result).toHaveProperty('interpretation');
      expect(result.fractalDimension).toBeGreaterThan(0);
      expect(result.fractalDimension).toBeLessThan(3);
    });

    it('should calculate Hurst exponent', () => {
      const result = analyzer.calculateHurstExponent(sampleData);
      expect(result).toHaveProperty('hurstExponent');
      expect(result).toHaveProperty('interpretation');
      expect(result.hurstExponent).toBeGreaterThanOrEqual(0);
      expect(result.hurstExponent).toBeLessThanOrEqual(1);
    });

    it('should detect trending behavior in trending data', () => {
      const result = analyzer.calculateHurstExponent(trendingData);
      // Trending data should have Hurst > 0.5
      expect(result.hurstExponent).toBeGreaterThan(0.4);
    });

    it('should analyze self-similarity', () => {
      const result = analyzer.analyzeSelfSimilarity(sampleData);
      expect(result).toHaveProperty('similarities');
      expect(result).toHaveProperty('overallSimilarity');
      expect(Array.isArray(result.similarities)).toBe(true);
    });

    it('should analyze multiple timeframes', () => {
      const result = analyzer.analyzeMultiTimeframe(sampleData);
      expect(result).toHaveProperty('timeframes');
      expect(result).toHaveProperty('consistency');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should predict from fractals', () => {
      const prediction = analyzer.predictFromFractals(sampleData, 5);
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions.length).toBe(5);
      expect(prediction).toHaveProperty('fractalCharacteristics');
    });
  });

  describe('WaveletAnalyzer', () => {
    let analyzer: WaveletAnalyzer;

    beforeEach(() => {
      analyzer = new WaveletAnalyzer(createDefaultWaveletConfig());
    });

    it('should perform discrete wavelet transform', () => {
      const result = analyzer.performDiscreteWaveletTransform(sampleData);
      expect(result).toHaveProperty('levels');
      expect(result).toHaveProperty('reconstructed');
      expect(result).toHaveProperty('reconstructionError');
      expect(Array.isArray(result.levels)).toBe(true);
      expect(result.levels.length).toBeGreaterThan(0);
    });

    it('should denoise with wavelets', () => {
      const result = analyzer.denoiseWithWavelets(sampleData);
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('denoised');
      expect(result).toHaveProperty('noise');
      expect(result).toHaveProperty('signalToNoiseRatio');
      expect(result.original.length).toBe(result.denoised.length);
    });

    it('should have positive SNR after denoising', () => {
      const result = analyzer.denoiseWithWavelets(sampleData);
      // SNR should be positive (in dB)
      expect(result.signalToNoiseRatio).toBeGreaterThan(0);
    });

    it('should predict from wavelets', () => {
      const prediction = analyzer.predictFromWavelets(sampleData, 5);
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions.length).toBe(5);
      expect(prediction).toHaveProperty('confidence');
    });
  });

  describe('IntegratedTechnicalAnalyzer', () => {
    let analyzer: IntegratedTechnicalAnalyzer;

    beforeEach(() => {
      analyzer = new IntegratedTechnicalAnalyzer();
    });

    it('should perform comprehensive analysis', () => {
      const analysis = analyzer.performComprehensiveAnalysis(sampleData);
      
      expect(analysis).toHaveProperty('symbol');
      expect(analysis).toHaveProperty('patterns');
      expect(analysis).toHaveProperty('cycles');
      expect(analysis).toHaveProperty('fractals');
      expect(analysis).toHaveProperty('wavelets');
      expect(analysis).toHaveProperty('integrated');
      expect(analysis).toHaveProperty('recommendations');
    });

    it('should have valid integrated signal', () => {
      const analysis = analyzer.performComprehensiveAnalysis(sampleData);
      const validSignals = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
      expect(validSignals).toContain(analysis.integrated.overallSignal);
    });

    it('should have confidence between 0 and 1', () => {
      const analysis = analyzer.performComprehensiveAnalysis(sampleData);
      expect(analysis.integrated.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.integrated.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate recommendations', () => {
      const analysis = analyzer.performComprehensiveAnalysis(sampleData);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should integrate predictions from all engines', async () => {
      const prediction = await analyzer.integratePredictions(sampleData, 5);
      
      expect(prediction).toHaveProperty('predictions');
      expect(prediction.predictions.length).toBe(5);
      
      // Check that all prediction components are present
      prediction.predictions.forEach(p => {
        expect(p).toHaveProperty('cyclePrediction');
        expect(p).toHaveProperty('fractalPrediction');
        expect(p).toHaveProperty('waveletPrediction');
        expect(p).toHaveProperty('ensemblePrediction');
        expect(p).toHaveProperty('confidence');
      });
    });

    it('should handle trending data appropriately', () => {
      const analysis = analyzer.performComprehensiveAnalysis(trendingData);
      
      // Trending up data should tend towards bullish signals
      const signal = analysis.integrated.overallSignal;
      expect(['STRONG_BUY', 'BUY', 'HOLD']).toContain(signal);
    });
  });

  describe('Integration with existing system', () => {
    it('should work with OHLCV data structure', () => {
      const analyzer = new IntegratedTechnicalAnalyzer();
      const analysis = analyzer.performComprehensiveAnalysis(sampleData);
      
      expect(analysis.symbol).toBe('TEST');
      expect(analysis.analysisDate).toBeInstanceOf(Date);
    });

    it('should handle minimum data requirements', () => {
      const minimalData = generateSampleData(10);
      const analyzer = new IntegratedTechnicalAnalyzer();
      
      // Should not throw error with minimal data
      expect(() => {
        analyzer.performComprehensiveAnalysis(minimalData);
      }).not.toThrow();
    });
  });
});
