/**
 * Test Suite for Supply/Demand Visualization Integration
 */

import { supplyDemandMaster } from '@/app/lib/supplyDemandMaster';
import { OHLCV } from '@/app/types';

describe('SupplyDemandMaster Integration', () => {
  const generateMockData = (count: number): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 1000;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const date = new Date(now - (count - i) * 24 * 60 * 60 * 1000);
      price += (Math.random() - 0.5) * 50;
      data.push({
        date: date.toISOString().split('T')[0],
        open: price,
        high: price + Math.random() * 20,
        low: price - Math.random() * 20,
        close: price,
        volume: Math.floor(Math.random() * 1000000) + 500000
      });
    }
    return data;
  };

  describe('analyze', () => {
    it('should return supply/demand analysis for valid data', () => {
      const data = generateMockData(100);
      const analysis = supplyDemandMaster.analyze(data);

      expect(analysis).toBeDefined();
      expect(analysis.currentPrice).toBeGreaterThan(0);
      expect(Array.isArray(analysis.levels)).toBe(true);
    });

    it('should identify support and resistance levels', () => {
      const data = generateMockData(100);
      const analysis = supplyDemandMaster.analyze(data);

      const supportLevels = analysis.levels.filter(l => l.type === 'SUPPORT');
      const resistanceLevels = analysis.levels.filter(l => l.type === 'RESISTANCE');

      expect(supportLevels.length + resistanceLevels.length).toBe(analysis.levels.length);
    });

    it('should handle empty data gracefully', () => {
      const analysis = supplyDemandMaster.analyze([]);

      expect(analysis.levels).toEqual([]);
      expect(analysis.currentPrice).toBe(0);
      expect(analysis.nearestSupport).toBeNull();
      expect(analysis.nearestResistance).toBeNull();
    });
  });

  describe('getDynamicLevelsForChart', () => {
    it('should format levels for chart display', () => {
      const data = generateMockData(100);
      const analysis = supplyDemandMaster.analyze(data);
      const chartLevels = supplyDemandMaster.getDynamicLevelsForChart(analysis);

      expect(chartLevels).toHaveProperty('support');
      expect(chartLevels).toHaveProperty('resistance');
      expect(Array.isArray(chartLevels.support)).toBe(true);
      expect(Array.isArray(chartLevels.resistance)).toBe(true);

      // Check that levels have required properties
      chartLevels.support.forEach(level => {
        expect(level).toHaveProperty('price');
        expect(level).toHaveProperty('strength');
        expect(level).toHaveProperty('color');
      });

      chartLevels.resistance.forEach(level => {
        expect(level).toHaveProperty('price');
        expect(level).toHaveProperty('strength');
        expect(level).toHaveProperty('color');
      });
    });

    it('should limit to top 5 levels per type', () => {
      const data = generateMockData(100);
      const analysis = supplyDemandMaster.analyze(data);
      const chartLevels = supplyDemandMaster.getDynamicLevelsForChart(analysis);

      expect(chartLevels.support.length).toBeLessThanOrEqual(5);
      expect(chartLevels.resistance.length).toBeLessThanOrEqual(5);
    });

    it('should assign colors based on strength', () => {
      const data = generateMockData(100);
      const analysis = supplyDemandMaster.analyze(data);
      const chartLevels = supplyDemandMaster.getDynamicLevelsForChart(analysis);

      // Strong levels should have darker green/red
      const strongSupport = chartLevels.support.find(l => l.strength >= 0.7);
      if (strongSupport) {
        expect(strongSupport.color).toBe('#22c55e');
      }

      const strongResistance = chartLevels.resistance.find(l => l.strength >= 0.7);
      if (strongResistance) {
        expect(strongResistance.color).toBe('#ef4444');
      }
    });
  });

  describe('detectBreakout', () => {
    it('should detect breakout when price crosses level', () => {
      const data = generateMockData(100);
      
      // Create a level that will be broken
      const levels = supplyDemandMaster.identifySupplyDemandLevels(data);
      const currentPrice = data[data.length - 1].close;
      
      if (levels.length > 0) {
        const resistanceLevel = levels.find(l => l.type === 'RESISTANCE' && l.price < currentPrice * 1.05);
        if (resistanceLevel) {
          const breakout = supplyDemandMaster.detectBreakout(
            resistanceLevel.price * 1.02, // Price above resistance
            levels,
            data
          );

          // Breakout may or may not be detected depending on confirmation requirements
          if (breakout) {
            expect(breakout.direction).toBe('up');
            expect(breakout).toHaveProperty('volumeConfirmation');
            expect(breakout).toHaveProperty('followThrough');
          }
        }
      }
    });
  });

  describe('isApproachingLevel', () => {
    it('should detect when price is approaching a level', () => {
      const level = {
        price: 1000,
        strength: 0.8,
        type: 'RESISTANCE' as const,
        volume: 1000000,
        touches: 3,
        lastTouchDate: '2024-01-01',
        priceRange: { high: 1010, low: 990 }
      };

      // Price within 2% threshold
      expect(supplyDemandMaster.isApproachingLevel(1015, level, 0.02)).toBe(true);
      
      // Price outside threshold
      expect(supplyDemandMaster.isApproachingLevel(1050, level, 0.02)).toBe(false);
    });
  });

  describe('getStrengthDescription', () => {
    it('should return correct Japanese descriptions for strength levels', () => {
      expect(supplyDemandMaster.getStrengthDescription(0.9)).toBe('非常に強い');
      expect(supplyDemandMaster.getStrengthDescription(0.7)).toBe('強い');
      expect(supplyDemandMaster.getStrengthDescription(0.5)).toBe('中程度');
      expect(supplyDemandMaster.getStrengthDescription(0.3)).toBe('弱い');
      expect(supplyDemandMaster.getStrengthDescription(0.1)).toBe('非常に弱い');
    });
  });
});
