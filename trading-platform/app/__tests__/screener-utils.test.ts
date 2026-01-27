import { filterByTechnicals } from '../lib/screener-utils';
import { calculateRSI, calculateSMA } from '../lib/utils';
import { Stock, OHLCV } from '../types';

jest.mock('../lib/utils', () => ({
    calculateRSI: jest.fn(),
    calculateSMA: jest.fn(),
}));

describe('screener-utils', () => {
    const mockStock: Stock = { symbol: 'TEST', name: 'Test', market: 'japan', price: 100, change: 0, changePercent: 0, volume: 1000 };
    const mockOHLCV: OHLCV[] = Array(60).fill({ close: 100, high: 105, low: 95, open: 100, volume: 1000, date: '2026-01-01' });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns false if ohlcv data is insufficient', () => {
        const result = filterByTechnicals(mockStock, Array(10).fill({ close: 100 }), {});
        expect(result).toBe(false);
    });

    it('filters by RSI Max', () => {
        (calculateRSI as jest.Mock).mockReturnValue([0, 0, 70]); // last RSI is 70

        // Pass if RSI <= 80
        expect(filterByTechnicals(mockStock, mockOHLCV, { rsiMax: '80' })).toBe(true);
        // Fail if RSI > 60
        expect(filterByTechnicals(mockStock, mockOHLCV, { rsiMax: '60' })).toBe(false);
    });

    it('filters by RSI Min', () => {
        (calculateRSI as jest.Mock).mockReturnValue([0, 0, 30]); // last RSI is 30

        // Pass if RSI >= 20
        expect(filterByTechnicals(mockStock, mockOHLCV, { rsiMin: '20' })).toBe(true);
        // Fail if RSI < 40
        expect(filterByTechnicals(mockStock, mockOHLCV, { rsiMin: '40' })).toBe(false);
    });

    it('filters by uptrend', () => {
        (calculateSMA as jest.Mock).mockReturnValue([0, 0, 90]); // SMA50 is 90, Price is 100

        // Pass if price > SMA50
        expect(filterByTechnicals(mockStock, mockOHLCV, { trend: 'uptrend' })).toBe(true);

        // Fail if price <= SMA50 (SMA is 110)
        (calculateSMA as jest.Mock).mockReturnValue([0, 0, 110]);
        expect(filterByTechnicals(mockStock, mockOHLCV, { trend: 'uptrend' })).toBe(false);
    });

    it('filters by downtrend', () => {
        (calculateSMA as jest.Mock).mockReturnValue([0, 0, 110]); // SMA50 is 110, Price is 100

        // Pass if price < SMA50
        expect(filterByTechnicals(mockStock, mockOHLCV, { trend: 'downtrend' })).toBe(true);

        // Fail if price >= SMA50 (SMA is 90)
        (calculateSMA as jest.Mock).mockReturnValue([0, 0, 90]);
        expect(filterByTechnicals(mockStock, mockOHLCV, { trend: 'downtrend' })).toBe(false);
    });

    it('ignores trend when set to all', () => {
        expect(filterByTechnicals(mockStock, mockOHLCV, { trend: 'all' })).toBe(true);
        expect(calculateSMA).not.toHaveBeenCalled();
    });

    it('handles missing OHLCV elegantly', () => {
        expect(filterByTechnicals(mockStock, null as any, {})).toBe(false);
    });
});
