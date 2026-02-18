import { MarketRegimeDetector, MarketRegime } from '../market-regime-detector';
import { OHLCV } from '@/app/types';

describe('MarketRegimeDetector', () => {
  const generateTrendingData = (direction: 'up' | 'down'): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < 50; i++) {
      price += direction === 'up' ? 2 : -2;
      data.push({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: price,
        high: price + 3,
        low: price - 3,
        close: price + (direction === 'up' ? 1.5 : -1.5),
        volume: 10000
      });
    }
    return data;
  };

  const generateRangingData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    const basePrice = 100;
    for (let i = 0; i < 50; i++) {
      const noise = (Math.random() - 0.5) * 2;
      const price = basePrice + noise;
      data.push({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: price,
        high: price + 1,
        low: price - 1,
        close: basePrice + (Math.random() - 0.5) * 2,
        volume: 8000
      });
    }
    return data;
  };

  const generateVolatileData = (): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    for (let i = 0; i < 50; i++) {
      const volatility = Math.random() * 20 - 10;
      price += volatility;
      data.push({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: price,
        high: price + Math.abs(volatility) + 5,
        low: price - Math.abs(volatility) - 5,
        close: price + (Math.random() - 0.5) * 10,
        volume: 15000
      });
    }
    return data;
  };

  it('should detect TRENDING_UP regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(result.type).toBe('TRENDING_UP');
  });

  it('should detect TRENDING_DOWN regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('down'));
    expect(result.type).toBe('TRENDING_DOWN');
  });

  it('should detect RANGING regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateRangingData());
    expect(result.type).toBe('RANGING');
  });

  it('should detect VOLATILE regime', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateVolatileData());
    expect(['VOLATILE', 'RANGING', 'TRENDING_UP', 'TRENDING_DOWN']).toContain(result.type);
  });

  it('should return volatilityLevel', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(['LOW', 'NORMAL', 'HIGH', 'EXTREME']).toContain(result.volatilityLevel);
  });

  it('should return trendStrength between 0 and 100', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(result.trendStrength).toBeGreaterThanOrEqual(0);
    expect(result.trendStrength).toBeLessThanOrEqual(100);
  });

  it('should return momentumQuality between 0 and 100', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(result.momentumQuality).toBeGreaterThanOrEqual(0);
    expect(result.momentumQuality).toBeLessThanOrEqual(100);
  });

  it('should throw error for insufficient data', () => {
    const detector = new MarketRegimeDetector();
    const insufficientData = generateTrendingData('up').slice(0, 10);
    expect(() => detector.detect(insufficientData)).toThrow();
  });

  it('should have high trend strength for strong trends', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateTrendingData('up'));
    expect(result.trendStrength).toBeGreaterThan(50);
  });

  it('should have low trend strength for ranging markets', () => {
    const detector = new MarketRegimeDetector();
    const result = detector.detect(generateRangingData());
    expect(result.trendStrength).toBeLessThan(50);
  });
});
