import { RealTimeDataService } from '../RealTimeDataService';

jest.mock('yahoo-finance2', () => ({
  default: jest.fn().mockImplementation(() => ({
    quote: jest.fn().mockResolvedValue({
      regularMarketPrice: 3500.5,
      bid: 3500,
      ask: 3501,
    }),
  })),
}));

describe('RealTimeDataService', () => {
  let service: RealTimeDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RealTimeDataService();
    (service as any).cache.clear();
  });

  it.skip('should fetch quote from Yahoo Finance when not in cache', async () => {
    const result = await service.fetchQuote('7203');

    expect(result).toMatchObject({
      symbol: '7203',
      price: 3500.5,
    });
  });

  it.skip('should return cached value if available', async () => {
    await service.fetchQuote('7203');
    const result = await service.fetchQuote('7203');

    expect(result).toMatchObject({
      symbol: '7203',
      price: 3500.5,
    });
  });

  it.skip('should return null when Yahoo Finance fails', async () => {
    const YahooFinance = require('yahoo-finance2').default;
    YahooFinance.mockImplementationOnce(() => ({
      quote: jest.fn().mockRejectedValue(new Error('API error')),
    }));

    const freshService = new RealTimeDataService();
    const result = await freshService.fetchQuote('7203');

    expect(result).toBeNull();
  });
});
