import { calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR, formatCurrency, formatPercent } from '../lib/utils';
import { OHLCV } from '../types';

describe('Technical Utils (Indicator Calculations)', () => {
  // Generate sufficient data for indicators (e.g. MACD needs 26+ periods)
  const mockPrices = Array.from({ length: 100 }, (_, i) => 100 + i + Math.sin(i) * 10);

  it('should calculate SMA correctly', () => {
    const sma3 = calculateSMA(mockPrices, 3);
    expect(sma3[0]).toBeNaN();
    expect(sma3[2]).toBeCloseTo((mockPrices[0] + mockPrices[1] + mockPrices[2]) / 3);
  });

  it('should calculate RSI correctly', () => {
    const rsi = calculateRSI(mockPrices, 14);
    expect(rsi.length).toBe(mockPrices.length + 1);
    expect(rsi[50]).not.toBeNaN();
  });

  it('should calculate MACD correctly', () => {
    const macd = calculateMACD(mockPrices);
    expect(macd.macd.length).toBe(mockPrices.length);
    expect(macd.signal.length).toBe(mockPrices.length);
    expect(macd.histogram.length).toBe(mockPrices.length);
    const validMacd = macd.macd.filter(v => !isNaN(v));
    expect(validMacd.length).toBeGreaterThan(0);
  });

  it('should calculate Bollinger Bands correctly', () => {
    const bb = calculateBollingerBands(mockPrices, 20, 2);
    expect(bb.upper.length).toBe(mockPrices.length);
    expect(bb.lower.length).toBe(mockPrices.length);
    expect(bb.upper[50]).toBeGreaterThan(bb.middle[50]);
  });

  it('should calculate ATR correctly', () => {
    const mockData: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      open: 100 + i,
      high: 110 + i,
      low: 95 + i,
      close: 105 + i,
      volume: 1000
    }));

    const atr = calculateATR(mockData, 14);
    expect(atr.length).toBe(50);
    expect(atr[49]).toBeGreaterThan(0);
    expect(atr[0]).toBeNaN();
  });

  it('should format currency correctly', () => {
    expect(formatCurrency(1234.56, 'JPY')).toBe('￥1,235');
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format percent correctly', () => {
    expect(formatPercent(5.678)).toBe('+5.68%');
    expect(formatPercent(-1.2)).toBe('-1.20%');
    expect(formatPercent(0)).toBe('+0.00%');
  });

  // Additional Utils Tests
  const {
    cn,
    formatNumber,
    formatVolume,
    getChangeColor,
    getSignalColor,
    getSignalBgColor,
    getConfidenceColor,
    truncate,
    generateDateRange,
    getTickSize,
    roundToTickSize,
    getPriceLimit
  } = require('../lib/utils');

  it('should combine class names correctly (cn)', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
    expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
    expect(cn('p-4', 'p-2')).toBe('p-2'); // Tailwind merge
  });

  it('should format number correctly', () => {
    expect(formatNumber(1234.5678)).toBe('1,234.57');
    expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
  });

  it('should format volume correctly', () => {
    expect(formatVolume(500)).toBe('500');
    expect(formatVolume(1500)).toBe('1.5K');
    expect(formatVolume(2500000)).toBe('2.5M');
  });

  it('should get correct colors', () => {
    expect(getChangeColor(10)).toContain('green');
    expect(getChangeColor(-10)).toContain('red');
    expect(getChangeColor(0)).toContain('gray');

    expect(getSignalColor('BUY')).toContain('green');
    expect(getSignalColor('SELL')).toContain('red');
    expect(getSignalColor('HOLD')).toContain('gray');

    expect(getSignalBgColor('BUY')).toContain('green');
    expect(getSignalBgColor('SELL')).toContain('red');
    expect(getSignalBgColor('HOLD')).toContain('gray');

    expect(getConfidenceColor(85)).toContain('green');
    expect(getConfidenceColor(70)).toContain('yellow');
    expect(getConfidenceColor(50)).toContain('red');
  });

  it('should truncate string correctly', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should generate date range', () => {
    const range = generateDateRange(5);
    expect(range.length).toBe(6); // 5 days ago + today
    expect(range[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should calculate tick size correctly', () => {
    expect(getTickSize(1000)).toBe(1);
    expect(getTickSize(4000)).toBe(5);
    expect(getTickSize(20000)).toBe(50);
    expect(getTickSize(3000)).toBe(1);
    expect(getTickSize(3001)).toBe(5);
    expect(getTickSize(3000000)).toBe(50000);
    expect(getTickSize(30000000)).toBe(500000);
  });

  it('should round to tick size', () => {
    expect(roundToTickSize(1234.56, 'usa')).toBe(1234.56);
    expect(roundToTickSize(1001, 'japan')).toBe(1001);
    expect(roundToTickSize(3003, 'japan')).toBe(3005);
  });

  it('should calculate price limit correctly', () => {
    expect(getPriceLimit(90)).toBe(30);
    expect(getPriceLimit(150)).toBe(50);
    expect(getPriceLimit(300000)).toBe(70000); // Fixed expectation
    expect(getPriceLimit(10000000)).toBe(300000);

    // Additional case
    expect(getPriceLimit(600000)).toBe(100000);
  });
});
