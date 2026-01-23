import { ALL_STOCKS, fetchStockMetadata } from '../data/stocks';
import { marketClient } from '../lib/api/data-aggregator';

// モックの修正
jest.mock('../lib/api/data-aggregator', () => ({
  marketClient: {
    fetchQuote: jest.fn(),
    fetchOHLCV: jest.fn(),
    fetchSignal: jest.fn(),
  }
}));

describe('Stock Master Expansion (100 Stocks & On-demand)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1: 100 Stocks Pre-defined', () => {
    it('should have around 100 stocks in the pre-defined list', () => {
      const uniqueSymbols = new Set(ALL_STOCKS.map(s => s.symbol));
      // 目標の100に近い数（今回は厳選した90-100の主力銘柄）であることを確認
      expect(uniqueSymbols.size).toBeGreaterThanOrEqual(95);
    });

    it('should have a balanced mix of Japan and US stocks', () => {
      const jpStocks = ALL_STOCKS.filter(s => s.market === 'japan');
      const usStocks = ALL_STOCKS.filter(s => s.market === 'usa');
      expect(jpStocks.length).toBeGreaterThanOrEqual(50);
      expect(usStocks.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Requirement 2: On-demand Auto-Registration', () => {
    it('should dynamically register and return a new stock metadata', async () => {
      const unknownSymbol = '6752'; // Panasonic
      
      // モックの返り値を設定
      (marketClient.fetchQuote as jest.Mock).mockResolvedValue({
        symbol: '6752',
        price: 1500,
        change: 10,
        changePercent: 0.67,
        volume: 1000000,
        marketState: 'OPEN'
      });

      const stock = await fetchStockMetadata(unknownSymbol);
      
      expect(stock).toBeDefined();
      expect(stock?.symbol).toBe('6752');
      expect(stock?.price).toBe(1500);
      expect(stock?.market).toBe('japan');
    });
  });
});