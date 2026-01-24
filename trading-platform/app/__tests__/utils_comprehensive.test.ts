import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR, formatCurrency, formatPercent } from '../lib/utils';
import { OHLCV } from '../types';

describe('Technical Utils (Indicator Calculations)', () => {
  const mockPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

  it('should calculate SMA correctly', () => {
    const sma3 = calculateSMA(mockPrices, 3);
    expect(sma3[0]).toBeNaN();
    expect(sma3[2]).toBe(101); // (100+101+102)/3
  });

  it('should calculate RSI correctly', () => {
    const rsi = calculateRSI(mockPrices, 10);
    expect(rsi.length).toBe(12); // mockPrices(11) + 1 (period buffer) or similar internal logic
    expect(rsi[rsi.length-1]).toBeGreaterThan(50); 
  });

  it('should calculate MACD correctly', () => {
    const macd = calculateMACD(mockPrices);
    expect(macd.macd.length).toBe(mockPrices.length);
    expect(macd.signal.length).toBe(mockPrices.length);
    expect(macd.histogram.length).toBe(mockPrices.length);
  });

  it('should calculate Bollinger Bands correctly', () => {
    const bb = calculateBollingerBands(mockPrices, 5, 2);
    expect(bb.upper.length).toBe(mockPrices.length);
    expect(bb.lower.length).toBe(mockPrices.length);
    expect(bb.upper[10]).toBeGreaterThan(bb.lower[10]);
  });

  it('should calculate ATR correctly', () => {
    const mockData: OHLCV[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-01-${i+1}`,
      open: 100, high: 110, low: 95, close: 105, volume: 1000
    }));
    const atr = calculateATR(mockData, 14);
    expect(atr.length).toBe(20);
    expect(atr[19]).toBeGreaterThan(0);
  });

  it('should format currency correctly', () => {
    expect(formatCurrency(1234.56, 'JPY')).toBe('￥1,235');
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format percent correctly', () => {
    expect(formatPercent(5.678)).toBe('+5.68%');
    expect(formatPercent(-1.2)).toBe('-1.20%');
  });
});
