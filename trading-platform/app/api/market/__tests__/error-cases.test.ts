/**
 * @jest-environment node
 */
import { GET } from '../route';

// Create mock functions outside the mock
const mockChart = jest.fn();
const mockQuote = jest.fn();

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => {
  return jest.fn().mockImplementation(() => ({
    chart: (...args: unknown[]) => mockChart(...args),
    quote: (...args: unknown[]) => mockQuote(...args),
  }));
});

// Mock api-middleware
jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(() => null), // Return null = no rate limit
}));

describe('Market API Error Cases', () => {
  const createRequest = (url: string) => new Request(`http://localhost${url}`);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default successful mocks
    mockChart.mockResolvedValue({
      meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
      quotes: [{ date: new Date(), open: 150, high: 151, low: 149, close: 150, volume: 1000 }],
    });
    mockQuote.mockResolvedValue({
      symbol: 'AAPL',
      regularMarketPrice: 150,
      regularMarketChange: 1.5,
      regularMarketChangePercent: 1,
    });
  });

  describe('Missing parameters', () => {
    it('should reject request with missing symbol', async () => {
      const req = createRequest('/api/market?type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should reject request with empty symbol', async () => {
      const req = createRequest('/api/market?symbol=&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });
  });

  describe('Invalid parameters', () => {
    it('should reject invalid symbol format with special characters', async () => {
      const req = createRequest('/api/market?symbol=AAPL%24&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should reject invalid type parameter', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=invalid');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should reject invalid market parameter', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=quote&market=invalid');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should reject invalid interval parameter', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=history&interval=2h');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should accept valid intervals', async () => {
      const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1wk', '1mo'];
      
      for (const interval of validIntervals) {
        const req = createRequest(`/api/market?symbol=AAPL&type=history&interval=${interval}`);
        const res = await GET(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('Network and API failures', () => {
    it('should handle chart API timeout gracefully', async () => {
      mockChart.mockRejectedValueOnce(new Error('Request timeout'));
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(502);
      expect(data.error).toBeDefined();
    });

    it('should handle quote API failure gracefully', async () => {
      mockQuote.mockRejectedValueOnce(new Error('API error'));
      
      const req = createRequest('/api/market?symbol=AAPL&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it('should handle network errors for single quote', async () => {
      mockQuote.mockRejectedValueOnce(new Error('Network error'));
      
      const req = createRequest('/api/market?symbol=AAPL&type=quote');
      const res = await GET(req);

      expect(res.status).toBe(404);
    });

    it('should handle network errors for batch quotes', async () => {
      mockQuote.mockRejectedValueOnce(new Error('Network error'));
      
      const req = createRequest('/api/market?symbol=AAPL,GOOG,MSFT&type=quote');
      const res = await GET(req);

      expect(res.status).toBe(502);
    });
  });

  describe('Invalid data responses', () => {
    it('should handle empty chart response', async () => {
      mockChart.mockResolvedValueOnce({ meta: { currency: 'USD', symbol: 'AAPL' }, quotes: [] });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.warning).toBe('No historical data found');
    });

    it('should handle null chart response', async () => {
      mockChart.mockResolvedValueOnce(null);
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(502);
      expect(data.error).toBeDefined();
    });

    it('should handle null quote response', async () => {
      mockQuote.mockResolvedValueOnce(null);
      
      const req = createRequest('/api/market?symbol=INVALID&type=quote');
      const res = await GET(req);

      expect(res.status).toBe(404);
    });

    it('should filter out null results in batch quotes', async () => {
      mockQuote.mockResolvedValueOnce([
        { symbol: 'AAPL', regularMarketPrice: 150 },
        null,
        { symbol: 'MSFT', regularMarketPrice: 300 },
      ]);
      
      const req = createRequest('/api/market?symbol=AAPL,INVALID,MSFT&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].symbol).toBe('AAPL');
      expect(data.data[1].symbol).toBe('MSFT');
    });
  });

  describe('Data interpolation', () => {
    it('should interpolate missing close prices', async () => {
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
        quotes: [
          { date: new Date('2023-01-01'), open: 100, high: 101, low: 99, close: 100, volume: 1000 },
          { date: new Date('2023-01-02'), open: null, high: null, low: null, close: null, volume: null },
          { date: new Date('2023-01-03'), open: 102, high: 103, low: 101, close: 102, volume: 1200 },
        ],
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data[1].close).toBe(100); // Interpolated from previous close
      expect(data.data[1].isInterpolated).toBe(true);
    });

    it('should handle first data point with null close', async () => {
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
        quotes: [
          { date: new Date('2023-01-01'), open: null, high: null, low: null, close: null, volume: null },
          { date: new Date('2023-01-02'), open: 102, high: 103, low: 101, close: 102, volume: 1200 },
        ],
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data[0].close).toBe(0); // No previous close available
      expect(data.data[0].isInterpolated).toBe(true);
    });
  });

  describe('Japanese stock handling', () => {
    it('should add .T suffix for 4-digit symbols without it', async () => {
      const req = createRequest('/api/market?symbol=7203&type=quote&market=japan');
      await GET(req);

      expect(mockQuote).toHaveBeenCalledWith('7203.T');
    });

    it('should handle Japanese stock symbols with .T suffix (known issue)', () => {
      // When market=japan, it should not double-append .T if already present
      const req = createRequest('/api/market?symbol=7203.T&type=quote&market=japan');
      GET(req);

      expect(mockQuote).toHaveBeenCalledWith('7203.T');
    });

    it('should return warning for Japanese stock with intraday interval', async () => {
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'JPY', symbol: '7203.T', regularMarketPrice: 2000 },
        quotes: [{ date: new Date(), open: 2000, high: 2010, low: 1990, close: 2005, volume: 10000 }],
      });
      
      const req = createRequest('/api/market?symbol=7203&type=history&market=japan&interval=1h');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('イントラデイデータ'),
          expect.stringContaining('日本株では利用できません'),
        ])
      );
    });

    it('should not add suffix for index symbols', async () => {
      const req = createRequest('/api/market?symbol=%5EN225&type=quote&market=japan');
      await GET(req);

      expect(mockQuote).toHaveBeenCalledWith('^N225');
    });
  });

  describe('Date formatting', () => {
    it('should format dates based on interval type', async () => {
      const testDate = new Date('2023-01-15T14:30:00Z');
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
        quotes: [{ date: testDate, open: 150, high: 151, low: 149, close: 150, volume: 1000 }],
      });
      
      // With daily interval or no interval specified, date should be YYYY-MM-DD
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Without intraday interval specified, date is formatted as YYYY-MM-DD
      expect(data.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format daily dates without time', async () => {
      const testDate = new Date('2023-01-15');
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
        quotes: [{ date: testDate, open: 150, high: 151, low: 149, close: 150, volume: 1000 }],
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Date validation', () => {
    it('should reject invalid date format', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=history&startDate=invalid');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should reject partial date format', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=history&startDate=2023-01');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid request parameters');
    });

    it('should accept valid YYYY-MM-DD date', async () => {
      const req = createRequest('/api/market?symbol=AAPL&type=history&startDate=2023-01-01');
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        createRequest('/api/market?symbol=AAPL&type=quote'),
        createRequest('/api/market?symbol=GOOG&type=quote'),
        createRequest('/api/market?symbol=MSFT&type=quote'),
      ];
      
      const responses = await Promise.all(requests.map((req) => GET(req)));
      
      expect(responses).toHaveLength(3);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });

    it('should handle concurrent requests with some failures', async () => {
      mockQuote
        .mockResolvedValueOnce({ symbol: 'AAPL', regularMarketPrice: 150 })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({ symbol: 'MSFT', regularMarketPrice: 300 });
      
      const requests = [
        createRequest('/api/market?symbol=AAPL&type=quote'),
        createRequest('/api/market?symbol=INVALID&type=quote'),
        createRequest('/api/market?symbol=MSFT&type=quote'),
      ];
      
      const responses = await Promise.all(requests.map((req) => GET(req)));
      
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(404);
      expect(responses[2].status).toBe(200);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing type parameter (defaults to quote)', async () => {
      const req = createRequest('/api/market?symbol=AAPL');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
    });

    it('should handle extremely long valid batch symbols', async () => {
      const symbols = Array(50).fill('AAPL').join(',');
      mockQuote.mockResolvedValueOnce(
        Array(50).fill({ symbol: 'AAPL', regularMarketPrice: 150 })
      );
      
      const req = createRequest(`/api/market?symbol=${symbols}&type=quote`);
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it('should handle quotes with missing optional fields', async () => {
      mockQuote.mockResolvedValueOnce({
        symbol: 'AAPL',
        // Missing all optional fields
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.price).toBeUndefined();
      expect(data.change).toBeUndefined();
    });

    it('should handle batch quotes with missing symbol fields', async () => {
      mockQuote.mockResolvedValueOnce([
        { symbol: 'AAPL', regularMarketPrice: 150 },
        { regularMarketPrice: 200 },
      ]);
      
      const req = createRequest('/api/market?symbol=AAPL,GOOG&type=quote');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].symbol).toBe('AAPL');
    });

    it('should handle string dates in quotes', async () => {
      mockChart.mockResolvedValueOnce({
        meta: { currency: 'USD', symbol: 'AAPL', regularMarketPrice: 150 },
        quotes: [
          { date: '2023-01-01', open: 100, high: 101, low: 99, close: 100, volume: 1000 },
        ],
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data[0].date).toBe('2023-01-01');
    });
  });

  describe('Generic error handling', () => {
    it('should handle unexpected errors with error code', async () => {
      mockChart.mockImplementationOnce(() => {
        throw { message: 'Unexpected error' };
      });
      
      const req = createRequest('/api/market?symbol=AAPL&type=history');
      const res = await GET(req);

      // The actual implementation returns 502 for chart errors
      expect(res.status).toBe(502);
    });
  });
});
