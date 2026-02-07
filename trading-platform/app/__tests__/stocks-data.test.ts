import {
    getStockBySymbol,
    getStocksByMarket,
    getStocksBySector,
    fetchStockMetadata,
    fetchOHLCV,
    fetchSignal,
    JAPAN_STOCKS,
    USA_STOCKS
} from '../data/stocks';
import { marketClient } from '../lib/api/data-aggregator';

// Mock marketClient
jest.mock('../lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuote: jest.fn(),
        fetchOHLCV: jest.fn(),
        fetchSignal: jest.fn()
    }
}));

describe('stocks data', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Static Data Helpers', () => {
        it('getStockBySymbol finds stock', () => {
            const stock = getStockBySymbol('7203');
            expect(stock).toBeDefined();
            expect(stock?.name).toContain('トヨタ');
        });

        it('getStockBySymbol returns undefined for invalid symbol', () => {
            expect(getStockBySymbol('INVALID')).toBeUndefined();
        });

        it('getStocksByMarket filters correctly', () => {
            const jp = getStocksByMarket('japan');
            expect(jp.length).toBeGreaterThan(0);
            expect(jp.every(s => s.market === 'japan')).toBe(true);

            const us = getStocksByMarket('usa');
            expect(us.length).toBeGreaterThan(0);
            expect(us.every(s => s.market === 'usa')).toBe(true);
        });

        it('getStocksBySector filters correctly', () => {
            const auto = getStocksBySector('自動車');
            expect(auto.length).toBeGreaterThan(0);
            expect(auto.every(s => s.sector === '自動車')).toBe(true);
        });
    });

    describe('fetchStockMetadata', () => {
        it('detects JP stock by 4 digit code', async () => {
            (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
                symbol: '1234.T',
                price: 1000,
                change: 10,
                changePercent: 1.0,
                volume: 100
            });

            const stock = await fetchStockMetadata('1234');
            expect(marketClient.fetchQuote).toHaveBeenCalledWith('1234', 'japan');
            expect(stock).toEqual(expect.objectContaining({
                symbol: '1234',
                market: 'japan',
                sector: '日本市場' // Default sector
            }));
        });

        it('detects JP stock by .T suffix', async () => {
            (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
                symbol: '9984.T',
                price: 5000
            });
            await fetchStockMetadata('9984.T');
            expect(marketClient.fetchQuote).toHaveBeenCalledWith('9984.T', 'japan');
        });

        it('detects US stock by others', async () => {
            (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
                symbol: 'NVDA',
                price: 900
            });
            const stock = await fetchStockMetadata('NVDA');
            expect(marketClient.fetchQuote).toHaveBeenCalledWith('NVDA', 'usa');
            expect(stock?.market).toBe('usa');
            expect(stock?.sector).toBe('米国市場');
        });

        it('returns null on fetch failure', async () => {
            (marketClient.fetchQuote as jest.Mock).mockRejectedValue(new Error('Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const stock = await fetchStockMetadata('FAIL');
            expect(stock).toBeNull();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('returns null if quote is null', async () => {
            (marketClient.fetchQuote as jest.Mock).mockResolvedValue(null);
            const stock = await fetchStockMetadata('NULL');
            expect(stock).toBeNull();
        });
    });

    describe('Other API Wrappers', () => {
        it('fetchOHLCV delegates to marketClient', async () => {
            (marketClient.fetchOHLCV as jest.Mock).mockResolvedValue({ data: ['ohlcv'] });
            const result = await fetchOHLCV('7203');
            expect(result).toEqual(['ohlcv']);
            expect(marketClient.fetchOHLCV).toHaveBeenCalled();
        });

        it('fetchOHLCV handles empty data', async () => {
            (marketClient.fetchOHLCV as jest.Mock).mockResolvedValue({ data: null });
            const result = await fetchOHLCV('7203');
            expect(result).toEqual([]);
        });

        it('fetchSignal delegates to marketClient', async () => {
          const mockSignal = {
            symbol: '7203',
            type: 'BUY',
            confidence: 80,
            targetPrice: 100,
            stopLoss: 90,
            reason: 'test',
            predictedChange: 10,
            predictionDate: '2023-01-01'
          } as const;
          const mockResponse = {
            success: true,
            data: mockSignal,
            source: 'api' as const
          };
          (marketClient.fetchSignal as jest.Mock).mockResolvedValue(mockResponse);
          const result = await fetchSignal({ symbol: '7203' } as any);
          expect(result).toEqual(mockResponse);
        });
    });
});
