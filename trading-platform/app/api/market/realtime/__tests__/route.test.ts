import { GET } from '../route';
import { realTimeDataService } from '@/app/lib/services/RealTimeDataService';
import { checkRateLimit } from '@/app/lib/api-middleware';

// Mock dependencies
jest.mock('@/app/lib/services/RealTimeDataService', () => ({
  realTimeDataService: {
    fetchQuote: jest.fn(),
  },
}));

jest.mock('@/app/lib/api-middleware', () => ({
  checkRateLimit: jest.fn(),
}));

describe('GET /api/market/realtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockReturnValue(null); // Default to not rate limited
  });

  it('should return 400 if symbol is missing', async () => {
    const req = {
      url: 'http://localhost:3000/api/market/realtime',
      nextUrl: new URL('http://localhost:3000/api/market/realtime'),
    } as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Symbol required');
  });

  it('should return 400 if symbol format is invalid', async () => {
    const req = {
      url: 'http://localhost:3000/api/market/realtime?symbol=INVALID',
      nextUrl: new URL('http://localhost:3000/api/market/realtime?symbol=INVALID'),
    } as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid symbol format');
  });

  it('should return 400 for non-Japanese markets if requested', async () => {
    const req = {
      url: 'http://localhost:3000/api/market/realtime?symbol=7203&market=usa',
      nextUrl: new URL('http://localhost:3000/api/market/realtime?symbol=7203&market=usa'),
    } as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Japanese market');
  });

  it('should return quote data for valid Japanese symbol', async () => {
    const mockQuote = {
      symbol: '7203',
      price: 3500,
      bid: 3499,
      ask: 3501,
      timestamp: new Date().toISOString(),
    };
    (realTimeDataService.fetchQuote as jest.Mock).mockResolvedValue(mockQuote);

    const req = {
      url: 'http://localhost:3000/api/market/realtime?symbol=7203&market=japan',
      nextUrl: new URL('http://localhost:3000/api/market/realtime?symbol=7203&market=japan'),
    } as any;
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockQuote);
  });

  it('should return 502 if scraper fails', async () => {
    (realTimeDataService.fetchQuote as jest.Mock).mockRejectedValue(new Error('Scraper error'));

    const req = {
      url: 'http://localhost:3000/api/market/realtime?symbol=7203&market=japan',
      nextUrl: new URL('http://localhost:3000/api/market/realtime?symbol=7203&market=japan'),
    } as any;
    const res = await GET(req);
    
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch real-time data');
  });
});
