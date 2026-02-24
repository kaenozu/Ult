
import { technicalIndicatorService } from '../TechnicalIndicatorService';
import { calculateSMA, calculateRSI } from '../utils/technical-analysis';

describe('TechnicalIndicatorService with Float64Array', () => {
    const prices = [10, 11, 12, 13, 14, 15, 14, 13, 12, 11];
    const floatPrices = new Float64Array(prices);

    it('calculateSMA should return identical results for number[] and Float64Array', () => {
        const sma1 = technicalIndicatorService.calculateSMA(prices, 3);
        const sma2 = technicalIndicatorService.calculateSMA(floatPrices, 3);
        expect(sma1).toEqual(sma2);
    });

    it('calculateRSI should return identical results for number[] and Float64Array', () => {
        const rsi1 = technicalIndicatorService.calculateRSI(prices, 3);
        const rsi2 = technicalIndicatorService.calculateRSI(floatPrices, 3);
        expect(rsi1).toEqual(rsi2);
    });

    it('calculateMACD should return identical results for number[] and Float64Array', () => {
        const macd1 = technicalIndicatorService.calculateMACD(prices, 3, 5, 2);
        const macd2 = technicalIndicatorService.calculateMACD(floatPrices, 3, 5, 2);
        expect(macd1).toEqual(macd2);
    });

    it('calculateBollingerBands should return identical results for number[] and Float64Array', () => {
        const bb1 = technicalIndicatorService.calculateBollingerBands(prices, 3, 2);
        const bb2 = technicalIndicatorService.calculateBollingerBands(floatPrices, 3, 2);
        expect(bb1).toEqual(bb2);
    });
});
