import {
    formatCurrency, formatVolume, getChangeColor, getSignalColor, getSignalBgColor, getConfidenceColor, truncate,
    generateDateRange, roundToTickSize, getPriceLimit
} from '../utils';
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import {
    calculatePredictionError, optimizeParameters, calculateVolumeProfile
} from '../analysis';
import { RSI_CONFIG, SMA_CONFIG } from '../../constants';

describe('Utils Logic Coverage', () => {
    describe('formatCurrency', () => {
        it('formats JPY correctly', () => {
            expect(formatCurrency(1000, 'JPY')).toContain('1,000');
        });
        it('formats USD correctly', () => {
            expect(formatCurrency(1000, 'USD')).toContain('1,000.00');
        });
    });

    describe('formatVolume', () => {
        it('formats millions', () => {
            expect(formatVolume(1500000)).toBe('1.5M');
        });
        it('formats thousands', () => {
            expect(formatVolume(1500)).toBe('1.5K');
        });
        it('formats small numbers', () => {
            expect(formatVolume(500)).toBe('500');
        });
    });

    describe('getChangeColor', () => {
        it('returns green for positive', () => expect(getChangeColor(1)).toContain('green'));
        it('returns red for negative', () => expect(getChangeColor(-1)).toContain('red'));
        it('returns gray for zero', () => expect(getChangeColor(0)).toContain('gray'));
    });

    describe('getSignalColor & Bg', () => {
        it('handles BUY', () => {
            expect(getSignalColor('BUY')).toContain('green');
            expect(getSignalBgColor('BUY')).toContain('green');
        });
        it('handles SELL', () => {
            expect(getSignalColor('SELL')).toContain('red');
            expect(getSignalBgColor('SELL')).toContain('red');
        });
        it('handles HOLD', () => {
            expect(getSignalColor('HOLD')).toContain('gray');
            expect(getSignalBgColor('HOLD')).toContain('gray');
        });
    });

    describe('getConfidenceColor', () => {
        it('high confidence', () => expect(getConfidenceColor(80)).toContain('green'));
        it('med confidence', () => expect(getConfidenceColor(60)).toContain('yellow'));
        it('low confidence', () => expect(getConfidenceColor(50)).toContain('red'));
    });

    describe('truncate', () => {
        it('truncates long string', () => expect(truncate('hello world', 5)).toBe('hello...'));
        it('keeps short string', () => expect(truncate('hi', 5)).toBe('hi'));
    });

    describe('calculateATR', () => {
        it('returns empty array for empty data', () => {
            expect(technicalIndicatorService.calculateATR([])).toEqual([]);
        });
        it('calculates ATR correctly', () => {
            const data = Array(20).fill({ high: 110, low: 90, close: 100 });
            const atr = technicalIndicatorService.calculateATR(data, 14);
            expect(atr.length).toBe(20);
            expect(atr[13]).toBe(20); // First ATR calculation match TR
        });
    });

    describe('roundToTickSize', () => {
        it('rounds USD', () => expect(roundToTickSize(10.123, 'usa')).toBeCloseTo(10.12, 2));
        it('rounds JPY small', () => expect(roundToTickSize(2000, 'japan')).toBe(2000));
        it('rounds JPY large', () => expect(roundToTickSize(5000000, 'japan')).toBe(5000000));
        it('rounds JPY 500k range', () => expect(roundToTickSize(400000, 'japan')).toBe(400000)); // 1000 tick
    });

    describe('getPriceLimit', () => {
        it('returns correct limits', () => {
            expect(getPriceLimit(90)).toBe(30);
            expect(getPriceLimit(2500000)).toBe(300000); // max
        });
    });

    describe('calculateMACD', () => {
        it('handles NaN results gracefully', () => {
            // Not enough data
            const prices = [100, 101];
            const result = technicalIndicatorService.calculateMACD(prices);
            expect(result.macd[0]).toBeNaN();
        });
    });
});

describe('Analysis Logic Coverage', () => {
    // Mock data for analysis
    const mockData = Array.from({ length: 100 }, (_, i) => ({
        date: `2023-01-${i}`,
        open: 100 + i, high: 110 + i, low: 90 + i, close: 100 + i + (Math.sin(i) * 10), volume: 1000
    }));

    describe('calculatePredictionError', () => {
        it('returns default for short data', () => {
            expect(calculatePredictionError([])).toBe(1.0);
        });
        it('calculates error for sufficient data', () => {
            const err = calculatePredictionError(mockData);
            expect(err).toBeGreaterThan(0);
        });
    });

    describe('optimizeParameters', () => {
        it('returns default if not enough data', () => {
            const res = optimizeParameters([], 'japan');
            expect(res.accuracy).toBe(0);
        });

        it('optimizes for valid data', () => {
            const res = optimizeParameters(mockData, 'japan');
            expect(res.rsiPeriod).toBeGreaterThan(0);
        });
    });

    describe('calculateVolumeProfile', () => {
        it('returns empty if no data', () => {
            expect(calculateVolumeProfile([])).toEqual([]);
        });
        it('returns empty if no volume', () => {
            const noVol = mockData.map(d => ({ ...d, volume: 0 }));
            expect(calculateVolumeProfile(noVol)).toEqual([]);
        });
        it('returns empty if price flat', () => {
            const flat = mockData.map(d => ({ ...d, close: 100, volume: 100 }));
            expect(calculateVolumeProfile(flat)).toEqual([]);
        });
        it('calculates profile correctly', () => {
            const res = calculateVolumeProfile(mockData);
            expect(res.length).toBeGreaterThan(0);
            expect(res[0]).toHaveProperty('strength');
        });
    });
});