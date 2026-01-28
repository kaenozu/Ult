import { fetchStockMetadata } from '../data/stocks';
import { marketClient } from '../lib/api/data-aggregator';

// APIクライアントをモック
jest.mock('../lib/api/data-aggregator', () => ({
  marketClient: {
    fetchQuote: jest.fn()
  }
}));

describe('Stock Universe Expansion (On-demand Analysis)', () => {
  it('should create a valid Stock object for a new US symbol', async () => {
    (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
      symbol: 'TSM',
      price: 140.5,
      change: 2.5,
      changePercent: 1.8,
      volume: 5000000
    });

    const stock = await fetchStockMetadata('TSM');
    
    expect(stock).not.toBeNull();
    expect(stock?.symbol).toBe('TSM');
    expect(stock?.market).toBe('usa');
    expect(stock?.price).toBe(140.5);
  });

  it('should create a valid Stock object for a new Japan symbol', async () => {
    (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
      symbol: '9101',
      price: 5000,
      change: 100,
      changePercent: 2.0,
      volume: 1000000
    });

    const stock = await fetchStockMetadata('9101');
    
    expect(stock?.market).toBe('japan');
    expect(stock?.symbol).toBe('9101');
  });

  it('should return null if the symbol does not exist', async () => {
    (marketClient.fetchQuote as jest.Mock).mockResolvedValue(null);
    const stock = await fetchStockMetadata('INVALID');
    expect(stock).toBeNull();
  });
});
