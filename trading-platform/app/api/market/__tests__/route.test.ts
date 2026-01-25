/**
 * @jest-environment node
 */
import { GET } from '../route';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chart: jest.fn().mockResolvedValue({ quotes: [] }),
      quote: jest.fn().mockResolvedValue({ regularMarketPrice: 100 }),
    };
  });
});

describe('Market API Security Tests', () => {
  const createRequest = (url: string) => new Request(`http://localhost${url}`);

  it('should reject extremely long symbols (single)', async () => {
    const longSymbol = 'A'.repeat(21);
    const req = createRequest(`/api/market?symbol=${longSymbol}&type=quote`);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Symbol too long');
  });

  it('should reject extremely long symbols (batch)', async () => {
    const longBatch = 'A,'.repeat(501); // > 1000 chars
    const req = createRequest(`/api/market?symbol=${longBatch}&type=quote`);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Symbol too long');
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
});
