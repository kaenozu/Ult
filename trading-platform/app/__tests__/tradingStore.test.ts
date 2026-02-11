import { useUIStore } from '../store/uiStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { Stock } from '../types';

describe('tradingStore (split stores)', () => {
  beforeEach(() => {
    // Reset stores
    useUIStore.setState({ theme: 'dark' });
    useWatchlistStore.setState({ watchlist: [], selectedStock: null });
    usePortfolioStore.setState({
        portfolio: { positions: [], orders: [], totalValue: 0, totalProfit: 0, dailyPnL: 0, cash: 1000000 },
        aiStatus: 'active',
    });
  });

  it('toggles theme', () => {
    const { toggleTheme } = useUIStore.getState();
    expect(useUIStore.getState().theme).toBe('dark');
    toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('manages watchlist', () => {
    const stock: Stock = { symbol: 'AAPL', name: 'Apple', price: 150, market: 'usa', sector: 'tech', change: 0, changePercent: 0, volume: 0 };
    const { addToWatchlist, removeFromWatchlist, updateStockData, clearWatchlist } = useWatchlistStore.getState();

    addToWatchlist(stock);
    expect(useWatchlistStore.getState().watchlist).toHaveLength(1);

    // Update stock data
    updateStockData('AAPL', { price: 155 });
    expect(useWatchlistStore.getState().watchlist[0].price).toBe(155);

    removeFromWatchlist('AAPL');
    expect(useWatchlistStore.getState().watchlist).toHaveLength(0);

    // Add multiple and clear
    addToWatchlist(stock);
    addToWatchlist({ symbol: 'GOOGL', name: 'Google', price: 2800, market: 'usa', sector: 'tech', change: 0, changePercent: 0, volume: 0 });
    expect(useWatchlistStore.getState().watchlist).toHaveLength(2);

    clearWatchlist();
    expect(useWatchlistStore.getState().watchlist).toHaveLength(0);
    expect(useWatchlistStore.getState().selectedStock).toBeNull();
  });

  it('batch updates stock data', () => {
    const { addToWatchlist, batchUpdateStockData } = useWatchlistStore.getState();
    addToWatchlist({ symbol: 'S1', name: 'S1', price: 100, market: 'japan', sector: 'test', change: 0, changePercent: 0, volume: 0 });
    addToWatchlist({ symbol: 'S2', name: 'S2', price: 200, market: 'japan', sector: 'test', change: 0, changePercent: 0, volume: 0 });

    batchUpdateStockData([
      { symbol: 'S1', data: { price: 110 } },
      { symbol: 'S2', data: { price: 210 } }
    ]);

    const state = useWatchlistStore.getState();
    expect(state.watchlist.find(s => s.symbol === 'S1')?.price).toBe(110);
    expect(state.watchlist.find(s => s.symbol === 'S2')?.price).toBe(210);
  });

  it('sets cash amount', () => {
    const { setCash } = usePortfolioStore.getState();
    setCash(5000000);
    expect(usePortfolioStore.getState().portfolio.cash).toBe(5000000);
  });
});
