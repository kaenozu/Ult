/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';

// Mock next/server to avoid runtime issues in test env
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            json: () => Promise.resolve(data),
            status: init?.status || 200,
            headers: new Map(Object.entries(init?.headers || {}))
        }))
    }
}));

// Define Mock Class in factory to avoid hoisting issues and top-level crash
jest.mock('yahoo-finance2', () => {
    return jest.fn().mockImplementation(() => {
        return {
            chart: jest.fn(() => Promise.resolve({ quotes: [] })),
            quote: jest.fn(() => Promise.resolve({ symbol: 'TEST' })),
        };
    });
});

jest.mock('@/app/lib/ip-rate-limit', () => ({
    ipRateLimiter: {
        check: jest.fn(() => true)
    },
    getClientIp: jest.fn(() => '127.0.0.1')
}));

import { GET, yf } from '@/app/api/market/route';
import YahooFinance from 'yahoo-finance2';

describe('Market API Route', () => {
    let mockChart: jest.Mock;
    let mockQuote: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Attach spies to the actual exported instance
        // We cast to jest.Mock because we know it's a mock from the factory
        (yf as any).chart = jest.fn();
        (yf as any).quote = jest.fn();
        mockChart = (yf as any).chart;
        mockQuote = (yf as any).quote;
    });

    // Polyfill Request if needed (for node env)
    const createRequest = (url: string) => {
        if (typeof Request === 'undefined') {
            return {
                url: `http://localhost${url}`,
                method: 'GET'
            } as unknown as Request;
        }
        return new Request(`http://localhost${url}`);
    };

    describe('Validation', () => {
        it('returns error if symbol is missing', async () => {
            const req = createRequest('/api/market?type=quote');
            const res = await GET(req);
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toMatch(/Symbol is required/);
        });

        it('returns error if symbol format is invalid', async () => {
            const req = createRequest('/api/market?symbol=INVALID!');
            const res = await GET(req);
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json.error).toMatch(/Invalid symbol format/);
        });

        it('returns error if symbol is too long', async () => {
            const longSymbol = 'A'.repeat(21);
            const req = createRequest(`/api/market?symbol=${longSymbol}`);
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('returns error if batch symbol is too long', async () => {
            const longBatch = 'A'.repeat(1001) + ',B';
            const req = createRequest(`/api/market?symbol=${longBatch}`);
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('returns error if type is invalid', async () => {
            const req = createRequest('/api/market?symbol=7203&type=invalid');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('returns error if market is invalid', async () => {
            const req = createRequest('/api/market?symbol=7203&market=invalid');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it('returns error if type is missing', async () => {
            const req = createRequest('/api/market?symbol=7203');
            const res = await GET(req);
            expect(res.status).toBe(400);
        });
    });

    describe('History (Chart)', () => {
        it('fetches historical data with default date', async () => {
            mockChart.mockResolvedValue({
                quotes: [
                    { date: new Date('2025-01-01'), open: 100, high: 110, low: 90, close: 105, volume: 1000 }
                ]
            });

            const req = createRequest('/api/market?symbol=7203&type=history&market=japan');
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.data).toHaveLength(1);
            expect(json.data[0].close).toBe(105);
            expect(mockChart).toHaveBeenCalledWith('7203.T', expect.objectContaining({ period1: expect.stringMatching(/\d{4}-\d{2}-\d{2}/) }));
        });

        it('fetches historical data with specific start date', async () => {
            mockChart.mockResolvedValue({ quotes: [] });
            const req = createRequest('/api/market?symbol=AAPL&type=history&startDate=2020-01-01');
            await GET(req);
            expect(mockChart).toHaveBeenCalledWith('AAPL', { period1: '2020-01-01' });
        });

        it('handles empty chart result', async () => {
            mockChart.mockResolvedValue({ quotes: [] });
            const req = createRequest('/api/market?symbol=7203&type=history');
            const res = await GET(req);
            const json = await res.json();
            expect(json.data).toEqual([]);
            expect(json.warning).toBeDefined();
        });

        it('handles chart API error', async () => {
            mockChart.mockRejectedValue(new Error('API Fail'));
            const req = createRequest('/api/market?symbol=7203&type=history');
            const res = await GET(req);
            expect(res.status).toBe(502);
        });

        it('handles chart result null', async () => {
            mockChart.mockResolvedValue(null);
            const req = createRequest('/api/market?symbol=7203&type=history');
            const res = await GET(req);
            const json = await res.json();
            expect(json.warning).toBeDefined();
        });
    });

    describe('Quote', () => {
        it('fetches single quote successfully', async () => {
            mockQuote.mockResolvedValue({
                symbol: '7203.T',
                regularMarketPrice: 2000,
                regularMarketChange: 100,
                regularMarketChangePercent: 5,
                regularMarketVolume: 500000,
                marketState: 'REGULAR'
            });

            const req = createRequest('/api/market?symbol=7203&type=quote&market=japan');
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.price).toBe(2000);
            expect(mockQuote).toHaveBeenCalledWith('7203.T');
        });

        it('handles single quote API error', async () => {
            mockQuote.mockRejectedValue(new Error('Not Found'));
            const req = createRequest('/api/market?symbol=UNKNOWN&type=quote');
            const res = await GET(req);
            expect(res.status).toBe(404);
        });

        it('handles single quote null result', async () => {
            mockQuote.mockResolvedValue(null);
            const req = createRequest('/api/market?symbol=NULL&type=quote');
            const res = await GET(req);
            expect(res.status).toBe(404);
        });

        it('fetches batch quotes successfully', async () => {
            mockQuote.mockResolvedValue([
                { symbol: '7203.T', regularMarketPrice: 2000 },
                { symbol: '9984.T', regularMarketPrice: 5000 },
                undefined
            ]);

            const req = createRequest('/api/market?symbol=7203,9984,INVALID&type=quote&market=japan');
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.data).toHaveLength(2);
            expect(json.data[0].symbol).toBe('7203');
            expect(mockQuote).toHaveBeenCalledWith(['7203.T', '9984.T', 'INVALID.T']);
        });

        it('handles batch quote API error', async () => {
            mockQuote.mockRejectedValue(new Error('Batch Fail'));
            const req = createRequest('/api/market?symbol=A,B&type=quote');
            const res = await GET(req);
            expect(res.status).toBe(502);
        });
    });

    describe('Symbol Formatting', () => {
        it('preserves index symbols', async () => {
            mockQuote.mockResolvedValue({ symbol: '^N225', regularMarketPrice: 30000 });
            const req = createRequest('/api/market?symbol=^N225&type=quote');
            await GET(req);
            expect(mockQuote).toHaveBeenCalledWith('^N225');
        });
    });
});
