import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/Header';
import { useTradingStore } from '../store/tradingStore';
import '@testing-library/jest-dom';

// Mock Lucide icons to avoid issues in test environment
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Settings: () => <div>Settings</div>,
  User: () => <div>User</div>,
  Wifi: () => <div>Wifi</div>,
  WifiOff: () => <div>WifiOff</div>,
  Edit2: () => <div>Edit</div>,
  Plus: () => <div>Plus</div>,
}));

describe('Header Component - Search and Add', () => {
  beforeEach(() => {
    useTradingStore.setState({
      watchlist: [],
      portfolio: {
        positions: [],
        orders: [],
        totalValue: 0,
        totalProfit: 0,
        dailyPnL: 0,
        cash: 1000000,
      },
    });
  });

  it('shows search results when typing', () => {
    render(<Header />);
    const input = screen.getByPlaceholderText(/銘柄名、コードで検索/);
    
    // トヨタ(7203)を検索
    fireEvent.change(input, { target: { value: '7203' } });
    
    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    expect(screen.getByText('7203')).toBeInTheDocument();
  });

  it('adds a stock to the watchlist when selected from results', () => {
    render(<Header />);
    const input = screen.getByPlaceholderText(/銘柄名、コードで検索/);
    
    fireEvent.change(input, { target: { value: '7203' } });
    const resultItem = screen.getByText('トヨタ自動車');
    fireEvent.click(resultItem);
    
    const { watchlist, selectedStock } = useTradingStore.getState();
    expect(watchlist.some(s => s.symbol === '7203')).toBe(true);
    expect(selectedStock?.symbol).toBe('7203');
  });

  it('shows "追加済み" for stocks already in watchlist', () => {
    // 最初からウォッチリストに入れておく
    useTradingStore.setState({
      watchlist: [{ symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3000, change: 0, changePercent: 0, volume: 0 }],
    });

    render(<Header />);
    const input = screen.getByPlaceholderText(/銘柄名、コードで検索/);
    
    fireEvent.change(input, { target: { value: '7203' } });
    
    expect(screen.getByText('追加済み')).toBeInTheDocument();
  });
});
