import { MarketDataHub } from '../MarketDataHub';
import { fetchOHLCV } from '@/app/data/stocks';

// Mock fetchOHLCV
jest.mock('@/app/data/stocks', () => ({
  fetchOHLCV: jest.fn(),
}));

describe('MarketDataHub', () => {
  let hub: MarketDataHub;

  beforeEach(() => {
    jest.clearAllMocks();
    hub = new MarketDataHub();
  });

  it('should fetch data once even if requested multiple times simultaneously', async () => {
    const mockData = [{ date: '2023-01-01', close: 100 } as any];
    (fetchOHLCV as jest.Mock).mockResolvedValue(mockData);

    // Call multiple times at once
    const [res1, res2] = await Promise.all([
      hub.getData('7203', 'japan'),
      hub.getData('7203', 'japan')
    ]);

    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(fetchOHLCV).toHaveBeenCalledTimes(1); // One API call only
  });

  it('should update the last candle when updateLatestPrice is called', async () => {
    const initialData = [{ date: '2023-01-01', close: 100, high: 100, low: 100 } as any];
    (fetchOHLCV as jest.Mock).mockResolvedValue(initialData);

    await hub.getData('7203', 'japan');
    
    hub.updateLatestPrice('7203', 105, '2023-01-01T10:00:00Z');
    
    const updatedData = await hub.getData('7203', 'japan');
    const lastCandle = updatedData[updatedData.length - 1];
    
    expect(lastCandle.close).toBe(105);
    expect(lastCandle.high).toBe(105);
  });
});
