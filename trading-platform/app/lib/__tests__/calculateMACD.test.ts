
import { calculateMACD } from '../utils/technical-analysis';

describe('calculateMACD', () => {
    it('should return array of correct length', () => {
        const prices = new Array(50).fill(100);
        const res = calculateMACD(prices, 12, 26, 9);
        expect(res.macd).toHaveLength(50);
        expect(res.signal).toHaveLength(50);
        expect(res.histogram).toHaveLength(50);
    });

    it('should return valid MACD for positive trend', () => {
        const prices = new Array(100).fill(100).map((v, i) => v + i); // Up trend
        const res = calculateMACD(prices, 12, 26, 9);

        // After initialization period, values should be valid
        // MACD valid from index 25 (max(12, 26) - 1)
        // Signal valid from index 33 (25 + 9 - 1)

        const lastIdx = 99;
        expect(res.macd[lastIdx]).not.toBeNaN();
        expect(res.signal[lastIdx]).not.toBeNaN();
        expect(res.histogram[lastIdx]).not.toBeNaN();

        // In uptrend, MACD > Signal usually (after crossover)
        expect(res.macd[lastIdx]).toBeGreaterThan(0);
    });

    it('should handle negative MACD values correctly (Regression Test)', () => {
        // Strong downtrend produces negative MACD, but keep prices positive
        const prices = new Array(100).fill(0).map((v, i) => 200 - i);
        const res = calculateMACD(prices, 12, 26, 9);

        const lastIdx = 99;

        // MACD should be negative because Fast EMA < Slow EMA in downtrend
        // But prices are positive, so EMAs are valid.
        expect(res.macd[lastIdx]).toBeLessThan(0);

        // Signal line should be calculated even if MACD is negative
        // Currently this fails due to a bug in calculateEMA usage for Signal line
        expect(res.signal[lastIdx]).not.toBeNaN();

        // Histogram should be calculated
        expect(res.histogram[lastIdx]).not.toBeNaN();
    });

    it('should handle NaN in input prices', () => {
        const prices = new Array(50).fill(100);
        prices[20] = NaN; // Introduce a gap

        const res = calculateMACD(prices, 12, 26, 9);

        // MACD at index 20 should be NaN because input is NaN
        expect(res.macd[20]).toBeNaN();

        // Subsequent values might be affected depending on EMA logic
        // But eventually should recover if enough valid data
        // For simple EMA, one NaN breaks the chain until re-init?
        // Current implementation breaks chain.
        expect(res.macd[21]).toBeNaN();
    });
});
