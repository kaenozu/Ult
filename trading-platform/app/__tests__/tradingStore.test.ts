import { useUIStore } from '../store/uiStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { Signal, Stock } from '../types';

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
    const { addToWatchlist, removeFromWatchlist, clearWatchlist } = useWatchlistStore.getState();

    addToWatchlist(stock);
    expect(useWatchlistStore.getState().watchlist).toHaveLength(1);

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

  it('sets cash amount', () => {
    const { setCash } = usePortfolioStore.getState();
    setCash(5000000);
    expect(usePortfolioStore.getState().portfolio.cash).toBe(5000000);
  });
});