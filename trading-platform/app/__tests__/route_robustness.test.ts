/**
 * @jest-environment node
 */
describe('Market API Robustness Tests', () => {
  let GET: (req: Request) => Promise<Response>;
  let mockChart: jest.Mock;
  let mockQuote: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockChart = jest.fn().mockResolvedValue({ quotes: [] });
    mockQuote = jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      regularMarketPrice: 150,
      regularMarketChange: 1,
      regularMarketChangePercent: 0.6,
      regularMarketVolume: 1000000,
      marketState: 'OPEN'
    });

    jest.doMock('yahoo-finance2', () => {
      return jest.fn(() => ({
        chart: mockChart,
        quote: mockQuote,
      }));
    });

    const route = require('../api/market/route');
    GET = route.GET;
  });

  it('should reject invalid symbol formats', async () => {
    const req = new Request('http://localhost/api/market?symbol=INVALID!@#');
    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid symbol format');
  });

  it('should accept indices with caret (^) and NOT append .T', async () => {
    const req = new Request('http://localhost/api/market?type=history&symbol=^N225&market=japan');
    await GET(req);
    expect(mockChart).toHaveBeenCalledWith('^N225', expect.anything());
  });

  it('should append .T for 4-digit Japanese symbols', async () => {
    const req = new Request('http://localhost/api/market?type=history&symbol=7974&market=japan');
    await GET(req);
    expect(mockChart).toHaveBeenCalledWith('7974.T', expect.anything());
  });

  it('should return 404 when single quote is not found', async () => {
    mockQuote.mockResolvedValue(null);
    const req = new Request('http://localhost/api/market?type=quote&symbol=NONEXISTENT');
    const response = await GET(req);
    expect(response.status).toBe(404);
  });

  it('should handle batch quote requests', async () => {
    mockQuote.mockResolvedValue([
      { symbol: 'AAPL.T', regularMarketPrice: 150 },
      { symbol: 'MSFT.T', regularMarketPrice: 300 }
    ]);
    const req = new Request('http://localhost/api/market?type=quote&symbol=AAPL,MSFT');
    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.length).toBe(2);
  });
});