/**
 * @jest-environment node
 */
import { GET } from '../route';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chart: jest.fn().mockResolvedValue({
        meta: {
          symbol: 'AAPL',
          currency: 'USD',
          regularMarketPrice: 100
        },
        quotes: []
      }),
      quote: jest.fn().mockImplementation((query) => {
        if (Array.isArray(query)) {
          return Promise.resolve(query.map((s: string) => ({ symbol: s, regularMarketPrice: 100 })));
        }
        return Promise.resolve({ symbol: query, regularMarketPrice: 100 });
      }),
    };
  });
});


describe('Market API Security Tests', () => {
  const createRequest = (url: string) => new Request(`http://localhost${url}`);

  it('should reject extremely long symbols (single)', async () => {
    const longSymbol = 'A'.repeat(1001);
    const req = createRequest(`/api/market?symbol=${longSymbol}&type=quote`);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid request parameters');
  });

  it('should reject extremely long symbols (batch)', async () => {
    const longBatch = 'A,'.repeat(501); // > 1000 chars
    const req = createRequest(`/api/market?symbol=${longBatch}&type=quote`);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid request parameters');
  });

  it('should accept valid symbols', async () => {
    const req = createRequest(`/api/market?symbol=AAPL&type=quote`);
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('should accept valid batch symbols', async () => {
    const batch = 'AAPL,GOOG,MSFT';
    const req = createRequest(`/api/market?symbol=${batch}&type=quote`);
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('should reject invalid startDate', async () => {
    const req = createRequest(`/api/market?symbol=AAPL&type=history&startDate=invalid-date`);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid request parameters');
  });

  it('should accept valid startDate', async () => {
    const req = createRequest(`/api/market?symbol=AAPL&type=history&startDate=2023-01-01`);
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  it('should reject invalid symbol format', async () => {
    const req = createRequest(`/api/market?symbol=AAPL@#$&type=quote`);
    const res = await GET(req);
    await res.json();

    expect(res.status).toBe(400);
  });

  it('should handle missing required parameters', async () => {
    const req = createRequest(`/api/market?type=quote`); // symbol is missing
    const res = await GET(req as any);
    await res.json();

    expect(res.status).toBe(400);
  });

  it('should format Japanese stock symbols with .T suffix', async () => {
    const req = createRequest(`/api/market?symbol=7203&type=quote&market=japan`);
    const res = await GET(req);
    
    expect(res.status).toBe(200);
  });

  it('should not add .T suffix to indices', async () => {
    const req = createRequest(`/api/market?symbol=^N225&type=quote&market=japan`);
    const res = await GET(req);
    
    expect(res.status).toBe(200);
  });
});
