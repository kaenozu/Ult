import { render, screen, fireEvent } from '@testing-library/react';
import { StockTable } from '../components/StockTable';
import { useWatchlistStore } from '../store/watchlistStore';
import { useUIStore } from '../store/uiStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { Stock } from '../types';
import '@testing-library/jest-dom';

const mockStocks: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3000, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 180, change: 0, changePercent: 0, volume: 0 },
];

jest.mock('../store/watchlistStore');
jest.mock('../store/uiStore');
jest.mock('../store/portfolioStore');

describe('StockTable Component - Watchlist Actions', () => {
  const mockRemoveFromWatchlist = jest.fn();
  const mockSetSelectedStock = jest.fn();
  const mockUpdatePositionPrices = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useWatchlistStore as any).mockReturnValue({
      watchlist: mockStocks,
      removeFromWatchlist: mockRemoveFromWatchlist,
      batchUpdateStockData: jest.fn(),
    });
    (useUIStore as any).mockReturnValue({
      setSelectedStock: mockSetSelectedStock,
    });
    (usePortfolioStore as any).mockReturnValue({
      updatePositionPrices: mockUpdatePositionPrices,
    });
  });

  it('renders stock symbols and names correctly', () => {
    render(<StockTable stocks={mockStocks} />);
    expect(screen.getByText('7203')).toBeInTheDocument();
    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('shows the delete button and calls removal', () => {
    render(<StockTable stocks={mockStocks} />);

    // トヨタの行を見つける
    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');

    if (!row) throw new Error('Row not found');

    // 削除ボタンを見つける
    const deleteButton = row.querySelector('button');
    if (!deleteButton) throw new Error('Delete button not found in row');

    // クリック実行
    fireEvent.click(deleteButton);

    // ストアのアクションが呼ばれたことを確認
    expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('7203');
  });
});
