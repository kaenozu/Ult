/** @jest-environment node */
import { AlphaVantageClient, getAlphaVantageClient, validateAlphaVantageResponse, extractTechnicalIndicatorData, extractTimeSeriesData } from '../lib/api/alpha-vantage';
import { APIError, NetworkError, RateLimitError } from '../types';

// Mock fetch
global.fetch = jest.fn() as any;

describe('AlphaVantageClient', () => {
    const config = { apiKey: 'TEST_API_KEY' };
    let client: AlphaVantageClient;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new AlphaVantageClient(config);
    });

    describe('getDailyBars', () => {
        it('fetches and parses daily data successfully', async () => {
            const mockData = {
                'Meta Data': { '2. Symbol': 'AAPL' },
                'Time Series (Daily)': {
                    '2026-01-01': { '1. open': '100', '2. high': '105', '3. low': '95', '4. close': '102', '5. volume': '1000' },
                    '2026-01-02': { '1. open': '102', '2. high': '110', '3. low': '101', '4. close': '108', '5. volume': '2000' },
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getDailyBars('AAPL');
            expect(result.symbol).toBe('AAPL');
            expect(result.data).toHaveLength(2);
            expect(result.data[0].close).toBe(102);
            expect(result.data[1].timestamp).toBe('2026-01-02');
        });

        it('throws NetworkError when response is not ok', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });

            await expect(client.getDailyBars('AAPL')).rejects.toThrow(NetworkError);
        });

        it('throws Error when API returns error response', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ 'Error Message': 'Invalid API Call' }),
            });
            await expect(client.getDailyBars('AAPL')).rejects.toThrow(APIError);
        });

        it('returns empty data if time series is missing', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ 'Meta Data': {} }),
            });
            const result = await client.getDailyBars('TEST');
            expect(result.data).toEqual([]);
        });
    });

    describe('getIntraday', () => {
        it('fetches intraday data successfully', async () => {
            const mockData = {
                'Meta Data': { '2. Symbol': 'AAPL' },
                'Time Series (5min)': {
                    '2026-01-01 10:00:00': { '1. open': '100', '2. high': '101', '3. low': '99', '4. close': '100.5', '5. volume': '500' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getIntraday('AAPL', '5min');
            expect(result.interval).toBe('5min');
            expect(result.data[0].close).toBe(100.5);
        });
    });

    describe('Indicators', () => {
        it('fetches RSI successfully', async () => {
            const mockData = {
                'Technical Analysis: RSI': {
                    '2026-01-01': { 'RSI': '70.5' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getRSI('AAPL');
            expect(result.name).toBe('RSI');
            expect(result.data[0].rsi).toBe(70.5);
        });

        it('fetches SMA successfully', async () => {
            const mockData = {
                'Technical Analysis: SMA': {
                    '2026-01-01': { 'SMA': '150.2' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getSMA('AAPL');
            expect(result.data[0].sma).toBe(150.2);
        });

        it('fetches EMA successfully', async () => {
            const mockData = {
                'Technical Analysis: EMA': {
                    '2026-01-01': { 'EMA': '155.5' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getEMA('AAPL');
            expect(result.data[0].ema).toBe(155.5);
        });

        it('fetches MACD successfully', async () => {
            const mockData = {
                'Technical Analysis: MACD': {
                    '2026-01-01': { 'MACD': '1.2', 'MACD_Signal': '0.8', 'MACD_Hist': '0.4' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getMACD('AAPL');
            expect(result.data[0].macd).toBe(1.2);
            expect(result.data[0].macd_Signal).toBe(0.8);
        });

        it('fetches Bollinger Bands successfully', async () => {
            const mockData = {
                'Technical Analysis: BBANDS': {
                    '2026-01-01': { 'Real Middle Band': '100', 'Real Upper Band': '110', 'Real Lower Band': '90' }
                }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getBollingerBands('AAPL');
            expect(result.data[0].upperBand).toBe(110);
        });
    });

    describe('searchSymbols', () => {
        it('returns best matches', async () => {
            const mockData = {
                'bestMatches': [
                    { '1. symbol': 'AAPL', '2. name': 'Apple Inc', '3. type': 'Equity', '4. region': 'United States', '5. marketOpen': '09:30', '6. marketClose': '16:00', '7. timezone': 'UTC-05', '8. currency': 'USD', '9. matchScore': '1.0' }
                ]
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.searchSymbols('apple');
            expect(result[0].symbol).toBe('AAPL');
        });

        it('returns empty array if no matches', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const result = await client.searchSymbols('nonexistent');
            expect(result).toEqual([]);
        });
    });

    describe('getGlobalQuote', () => {
        it('returns global quote successfully', async () => {
            const mockData = {
                'Global Quote': { '01. symbol': 'AAPL', '05. price': '185.00' }
            };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await client.getGlobalQuote('AAPL');
            expect(result['01. symbol']).toBe('AAPL');
            expect(result['05. price']).toBe('185.00');
        });

        it('throws if quote is missing', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });
            await expect(client.getGlobalQuote('AAPL')).rejects.toThrow('No quote data returned');
        });
    });

    describe('Helpers', () => {
        it('validateAlphaVantageResponse throws RateLimitError for Note', () => {
            expect(() => validateAlphaVantageResponse({ 'Note': 'Rate limit reached' }))
                .toThrow(RateLimitError);
        });

        it('validateAlphaVantageResponse throws APIError for Information', () => {
            expect(() => validateAlphaVantageResponse({ 'Information': 'API Info' }))
                .toThrow(APIError);
        });

        it('extractTechnicalIndicatorData returns undefined for non-matches', () => {
            expect(extractTechnicalIndicatorData({}, 'NonExistent')).toBeUndefined();
        });

        it('extractTimeSeriesData returns undefined for non-matches or invalid structure', () => {
            expect(extractTimeSeriesData({}, 'NonExistent')).toBeUndefined();
            expect(extractTimeSeriesData({ 'Test': { '2026': {} } }, 'Test')).toBeUndefined();
        });
    });

    describe.skip('getAlphaVantageClient', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            process.env = originalEnv;
        });

        it('throws if window is defined', () => {
            // In node, we can temporarily set global.window
            (global as any).window = {};
            expect(() => getAlphaVantageClient()).toThrow('AlphaVantageClient must be used on server side only');
            delete (global as any).window;
        });

        it('throws if API key is missing', () => {
            delete process.env.ALPHA_VANTAGE_API_KEY;
            expect(() => getAlphaVantageClient()).toThrow('ALPHA_VANTAGE_API_KEY is not defined');
        });

        it('throws if API key is insecure', () => {
            process.env.ALPHA_VANTAGE_API_KEY = 'your_api_key_here';
            expect(() => getAlphaVantageClient()).toThrow(APIError);
        });

        it('returns singleton instance', () => {
            process.env.ALPHA_VANTAGE_API_KEY = 'demo'; // Use demo key which is valid for testing
            const client1 = getAlphaVantageClient();
            const client2 = getAlphaVantageClient();
            expect(client1).toBe(client2);
        });
    });
});
