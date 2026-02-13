import { AutoScreener } from '../AutoScreener';
import { IMarketDataHub } from '../../interfaces/IMarketDataHub';

describe('AutoScreener', () => {
  let screener: AutoScreener;
  let mockHub: jest.Mocked<IMarketDataHub>;

  beforeEach(() => {
    mockHub = {
      getData: jest.fn(),
      updateLatestPrice: jest.fn(),
      clearCache: jest.fn(),
    } as any;
    screener = new AutoScreener(mockHub);
  });

  it('should detect trading opportunities across multiple symbols', async () => {
    // Mock data with an uptrend (RSI simple mock)
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      date: `2023-01-${i+1}`,
      close: 100 + i,
      high: 105 + i,
      low: 95 + i,
      open: 100 + i,
      volume: 1000
    }));

    mockHub.getData.mockResolvedValue(mockData as any);

    const results = await screener.scan(['7203', 'AAPL']);
    
    expect(results.length).toBe(2);
    expect(results[0].symbol).toBe('7203');
    expect(results[0].signals.length).toBeGreaterThan(0);
  });
});
