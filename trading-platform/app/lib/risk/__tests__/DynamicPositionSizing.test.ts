/**
 * DynamicPositionSizing Tests
 * 
 * Tests for dynamic position sizing functionality
 */

import { DynamicPositionSizing, createDynamicPositionSizing } from '../DynamicPositionSizing';
import { PositionSizingConfig, SizingResult } from '@/app/types/risk';
import { Portfolio, MarketData } from '@/app/types';

describe('DynamicPositionSizing', () => {
  let positionSizing: DynamicPositionSizing;
  let config: PositionSizingConfig;
  let portfolio: Portfolio;

  beforeEach(() => {
    config = {
      maxPositionSize: 100000,
      maxPositionPercent: 10,
      riskPerTrade: 2,
      maxRisk: 5000,
      volatilityAdjustment: true,
      correlationAdjustment: true
    };

    portfolio = {
      positions: [],
      orders: [],
      totalValue: 100000,
      totalProfit: 0,
      dailyPnL: 0,
      cash: 100000
    };

    positionSizing = new DynamicPositionSizing(config, portfolio);
  });

  describe('calculatePositionSize', () => {
    it('should calculate basic position size correctly', () => {
      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 150,
        volume: 1000000,
        timestamp: new Date()
      };

      const result = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        75
      );

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBeGreaterThan(0);
      expect(result.stopLossDistance).toBe(5);
      expect(result.confidence).toBe(75);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should respect maxPositionPercent limit', () => {
      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 100,
        volume: 1000000,
        timestamp: new Date()
      };

      const result = positionSizing.calculatePositionSize(
        'AAPL',
        100,
        90,
        marketData,
        90
      );

      const positionValue = result.recommendedSize * 100;
      expect(positionValue).toBeLessThanOrEqual(config.maxPositionSize);
    });

    it('should apply volatility adjustment when enabled', () => {
      positionSizing.updateVolatility('AAPL', 0.04); // High volatility

      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 150,
        volume: 1000000,
        timestamp: new Date()
      };

      const result = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        75
      );

      expect(result.reasons.some(r => r.includes('Volatility'))).toBe(true);
    });

    it('should apply confidence adjustment', () => {
      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 150,
        volume: 1000000,
        timestamp: new Date()
      };

      const lowConfidenceResult = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        40
      );

      const highConfidenceResult = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        90
      );

      expect(lowConfidenceResult.recommendedSize).toBeLessThanOrEqual(
        highConfidenceResult.recommendedSize
      );
      expect(lowConfidenceResult.confidence).toBeLessThan(
        highConfidenceResult.confidence
      );
    });
  });

  describe('calculateKellyCriterion', () => {
    it('should calculate Kelly criterion correctly', () => {
      const result = positionSizing.calculateKellyCriterion(
        0.6,  // 60% win rate
        0.02, // 2% average win
        0.01, // 1% average loss
        150
      );

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.confidence).toBe(75);
      expect(result.reasons.some(r => r.includes('Kelly'))).toBe(true);
    });

    it('should return zero for negative Kelly criterion', () => {
      const result = positionSizing.calculateKellyCriterion(
        0.3,  // 30% win rate (poor)
        0.01, // 1% average win
        0.02, // 2% average loss (larger than win)
        150
      );

      expect(result.recommendedSize).toBe(0);
    });
  });

  describe('calculateRiskParitySizing', () => {
    it('should calculate risk parity sizing correctly', () => {
      const result = positionSizing.calculateRiskParitySizing(
        'AAPL',
        150,
        0.02
      );

      expect(result.recommendedSize).toBeGreaterThan(0);
      expect(result.confidence).toBe(80);
      expect(result.reasons.some(r => r.includes('Risk parity'))).toBe(true);
    });

    it('should inversely scale with volatility', () => {
      const lowVolResult = positionSizing.calculateRiskParitySizing(
        'AAPL',
        150,
        0.01
      );

      const highVolResult = positionSizing.calculateRiskParitySizing(
        'AAPL',
        150,
        0.04
      );

      expect(lowVolResult.recommendedSize).toBeGreaterThan(
        highVolResult.recommendedSize
      );
    });
  });

  describe('updateVolatility', () => {
    it('should update volatility for symbol', () => {
      positionSizing.updateVolatility('AAPL', 0.03);
      
      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 150,
        volume: 1000000,
        timestamp: new Date()
      };

      const result = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        75
      );

      expect(result.reasons.some(r => r.includes('vol: 3.00%'))).toBe(true);
    });
  });

  describe('updateCorrelation', () => {
    it('should update correlation between symbols', () => {
      positionSizing.updateCorrelation('AAPL', 'MSFT', 0.7);
      
      // Add MSFT to portfolio
      portfolio.positions.push({
        symbol: 'MSFT',
        name: 'Microsoft',
        market: 'usa',
        side: 'LONG',
        quantity: 100,
        avgPrice: 300,
        currentPrice: 310,
        change: 10,
        entryDate: '2024-01-01'
      });

      const marketData: MarketData = {
        symbol: 'AAPL',
        price: 150,
        volume: 1000000,
        timestamp: new Date()
      };

      const result = positionSizing.calculatePositionSize(
        'AAPL',
        150,
        145,
        marketData,
        75
      );

      // High correlation should reduce position size
      expect(result.reasons.some(r => r.includes('Correlation'))).toBe(true);
    });
  });

  describe('createDynamicPositionSizing', () => {
    it('should create instance using factory function', () => {
      const instance = createDynamicPositionSizing(config, portfolio);
      expect(instance).toBeInstanceOf(DynamicPositionSizing);
    });
  });
});
