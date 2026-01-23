import { useTradingStore } from '../store/tradingStore';
import { Stock } from '../types';

const mockStock: Stock = {
  symbol: 'TEST',
  name: 'Test Stock',
  market: 'japan',
  sector: 'Technology',
  price: 1000,
  change: 0,
  changePercent: 0,
  volume: 10000,
};

describe('TradingStore - Watchlist Logic', () => {
  beforeEach(() => {
    // Storeの状態をリセット（永続化されているため手動でクリア）
    useTradingStore.setState({
      watchlist: [],
      selectedStock: null,
    });
  });

  it('should add a stock to the watchlist', () => {
    const { addToWatchlist } = useTradingStore.getState();
    
    addToWatchlist(mockStock);
    
    const { watchlist } = useTradingStore.getState();
    expect(watchlist).toHaveLength(1);
    expect(watchlist[0].symbol).toBe('TEST');
  });

  it('should not add duplicate stocks to the watchlist', () => {
    const { addToWatchlist } = useTradingStore.getState();
    
    addToWatchlist(mockStock);
    addToWatchlist(mockStock);
    
    const { watchlist } = useTradingStore.getState();
    expect(watchlist).toHaveLength(1);
  });

  it('should remove a stock from the watchlist', () => {
    const { addToWatchlist, removeFromWatchlist } = useTradingStore.getState();
    
    addToWatchlist(mockStock);
    removeFromWatchlist('TEST');
    
    const { watchlist } = useTradingStore.getState();
    expect(watchlist).toHaveLength(0);
  });

  it('should set the selected stock', () => {
    const { setSelectedStock } = useTradingStore.getState();
    
    setSelectedStock(mockStock);
    
    const { selectedStock } = useTradingStore.getState();
    expect(selectedStock?.symbol).toBe('TEST');
  });
});
