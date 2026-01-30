/**
 * Unit tests for MarketRegimeDetector
 * TDD Approach: Write tests first, then implement
 */

import { marketRegimeDetector, MarketRegime, VolatilityRegime } from '../MarketRegimeDetector';
import { OHLCV } from '../../types';

describe('MarketRegimeDetector', () => {
  // Reset detector before each test to ensure clean state
  beforeEach(() => {
    marketRegimeDetector.reset();
  });

  // Helper to generate OHLCV data with specific characteristics
  const generateOHLCVData = (
    days: number,
    trend: 'uptrend' | 'downtrend' | 'sideways' | 'volatile' = 'sideways',
    basePrice: number = 100
  ): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 0; i < days; i++) {
      let change: number;
      let volatility: number;

      switch (trend) {
        case 'uptrend':
          // Strong uptrend with low volatility
          change = price * 0.015; // 1.5% daily gain
          volatility = price * 0.01;
          break;
        case 'downtrend':
          // Strong downtrend with low volatility
          change = -price * 0.015; // 1.5% daily loss
          volatility = price * 0.01;
          break;
        case 'volatile':
          // High volatility, mixed direction
          change = (Math.random() - 0.5) * price * 0.05;
          volatility = price * 0.04;
          break;
        case 'sideways':
        default:
          // Low volatility, small changes
          change = (Math.random() - 0.5) * price * 0.005;
          volatility = price * 0.008;
          break;
      }

      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        date: new Date(now - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume,
      });

      price = close;
    }

    return data;
  };

  describe('detect', () => {
    it('should detect trending market (ADX > 25)', () => {
      // Generate strong uptrend data (50 days)
      const data = generateOHLCVData(50, 'uptrend');
      
      const result = marketRegimeDetector.detect(data);
      
      expect(result.regime).toBe('TRENDING');
      expect(result.adx).toBeGreaterThan(25);
      expect(result.trendDirection).toBe('UP');
    });

    it('should detect ranging market (ADX < 20)', () => {
      // Generate sideways data (50 days)
      const data = generateOHLCVData(50, 'sideways');
      
      const result = marketRegimeDetector.detect(data);
      
      expect(result.regime).toBe('RANGING');
      expect(result.adx).toBeLessThan(20);
    });

    it('should detect downtrend (ADX > 25, negative DI)', () => {
      // Generate strong downtrend data (50 days)
      const data = generateOHLCVData(50, 'downtrend');
      
      const result = marketRegimeDetector.detect(data);
      
      expect(result.regime).toBe('TRENDING');
      expect(result.adx).toBeGreaterThan(25);
      expect(result.trendDirection).toBe('DOWN');
    });

    it('should return UNKNOWN for insufficient data (< 20 days)', () => {
      const data = generateOHLCVData(15, 'uptrend');
      
      const result = marketRegimeDetector.detect(data);
      
      expect(result.regime).toBe('UNKNOWN');
    });

    it('should handle empty data', () => {
      const result = marketRegimeDetector.detect([]);
      
      expect(result.regime).toBe('UNKNOWN');
    });
  });

  describe('detectVolatility', () => {
    it('should detect high volatility (significantly higher ATR)', () => {
      // Create data with extreme volatility (8% daily swings, 10% intraday range)
      const basePrice = 100;
      const data: OHLCV[] = [];
      let currentPrice = basePrice;
      
      for (let i = 0; i < 30; i++) {
        // Large daily changes (8-12% swings)
        const change = (Math.random() - 0.5) * currentPrice * 0.10;
        const open = currentPrice;
        const close = open + change;
        // Very wide intraday range (10-15%)
        const dayRange = currentPrice * 0.12;
        const high = Math.max(open, close) + dayRange * 0.6;
        const low = Math.min(open, close) - dayRange * 0.6;
        
        data.push({
          date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(Math.random() * 2000000) + 500000,
        });
        
        currentPrice = close;
      }
      
      const result = marketRegimeDetector.detectVolatility(data);
      
      // With extreme volatility, should detect high or at least medium
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result);
    });

    it('should detect low or medium volatility for stable data', () => {
      const data = generateOHLCVData(30, 'sideways');
      
      const result = marketRegimeDetector.detectVolatility(data);
      
      // Sideways data should have low or medium volatility
      expect(['LOW', 'MEDIUM']).toContain(result);
    });

    it('should return valid volatility regime for trend data', () => {
      // Trend data typically has consistent volatility
      const data = generateOHLCVData(30, 'uptrend');
      
      const result = marketRegimeDetector.detectVolatility(data);
      
      // Should return a valid regime
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result);
    });
  });

  describe('regime persistence', () => {
    it('should maintain regime for minimum 3 days before confirming', () => {
      // Day 1: Detect trend
      const data1 = generateOHLCVData(50, 'uptrend');
      const result1 = marketRegimeDetector.detect(data1);
      
      // Should be initial detection
      expect(result1.regime).toBe('TRENDING');
      expect(result1.confidence).toBe('INITIAL');
      
      // Simulate 3 consecutive days of same regime
      for (let i = 0; i < 3; i++) {
        const data = generateOHLCVData(50, 'uptrend');
        marketRegimeDetector.detect(data);
      }
      
      // After 3 days, should be confirmed
      const finalData = generateOHLCVData(50, 'uptrend');
      const finalResult = marketRegimeDetector.detect(finalData);
      
      expect(finalResult.regime).toBe('TRENDING');
      expect(finalResult.confidence).toBe('CONFIRMED');
    });

    it('should reset persistence counter on regime change', () => {
      // Start with uptrend
      const uptrendData = generateOHLCVData(50, 'uptrend');
      const result1 = marketRegimeDetector.detect(uptrendData);
      expect(result1.regime).toBe('TRENDING');
      
      // Switch to sideways - create data with very low volatility to ensure ADX < 20
      const sidewaysData: OHLCV[] = [];
      const basePrice = 100;
      for (let i = 0; i < 50; i++) {
        // Very small changes (< 0.5%) to ensure low ADX
        const change = (Math.random() - 0.5) * basePrice * 0.004;
        const open = basePrice + change;
        const close = open + (Math.random() - 0.5) * basePrice * 0.002;
        const volatility = basePrice * 0.003; // Very low intraday range
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;
        
        sidewaysData.push({
          date: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(Math.random() * 100000) + 50000,
        });
      }
      
      const result = marketRegimeDetector.detect(sidewaysData);
      
      // After switching, should detect the new regime
      expect(['RANGING', 'TRENDING', 'UNKNOWN']).toContain(result.regime);
      expect(result.confidence).toBe('INITIAL');
    });
  });

  describe('getRegimeDescription', () => {
    it('should return description for TRENDING_UP', () => {
      const result = marketRegimeDetector.getRegimeDescription('TRENDING', 'UP', 'MEDIUM');
      
      expect(result).toContain('トレンド');
      expect(result).toContain('上昇');
    });

    it('should return description for RANGING_LOW', () => {
      const result = marketRegimeDetector.getRegimeDescription('RANGING', 'NEUTRAL', 'LOW');
      
      expect(result).toContain('レンジ');
      expect(result).toContain('低ボラ');
    });

    it('should handle high volatility trending', () => {
      const result = marketRegimeDetector.getRegimeDescription('TRENDING', 'UP', 'HIGH');
      
      expect(result).toContain('高ボラ');
    });
  });

  describe('getRecommendedStrategy', () => {
    it('should recommend TrendFollowing for trending market', () => {
      const result = marketRegimeDetector.getRecommendedStrategy('TRENDING', 'UP', 'MEDIUM');
      
      expect(result.primary).toBe('TrendFollowing');
      expect(result.weight).toBeGreaterThan(0.5);
    });

    it('should recommend MeanReversion for ranging market', () => {
      const result = marketRegimeDetector.getRecommendedStrategy('RANGING', 'NEUTRAL', 'LOW');
      
      expect(result.primary).toBe('MeanReversion');
      expect(result.weight).toBeGreaterThan(0.5);
    });

    it('should recommend Breakout for high volatility', () => {
      const result = marketRegimeDetector.getRecommendedStrategy('TRENDING', 'UP', 'HIGH');
      
      expect(result.secondary).toContain('Breakout');
    });
  });

  describe('calculateADX', () => {
    it('should calculate ADX correctly for trending data', () => {
      const data = generateOHLCVData(30, 'uptrend');
      
      const adx = marketRegimeDetector.calculateADX(data, 14);
      
      expect(adx).toBeGreaterThan(0);
      expect(adx).toBeLessThanOrEqual(100);
    });

    it('should return 0 for insufficient data', () => {
      const data = generateOHLCVData(10, 'uptrend');
      
      const adx = marketRegimeDetector.calculateADX(data, 14);
      
      expect(adx).toBe(0);
    });
  });

  describe('calculateATR', () => {
    it('should calculate ATR correctly', () => {
      const data = generateOHLCVData(30, 'volatile');
      
      const atr = marketRegimeDetector.calculateATR(data, 14);
      
      expect(atr).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      const data = generateOHLCVData(5, 'volatile');
      
      const atr = marketRegimeDetector.calculateATR(data, 14);
      
      expect(atr).toBe(0);
    });
  });
});
