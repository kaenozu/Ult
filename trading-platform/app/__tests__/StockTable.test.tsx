import { render, screen, fireEvent } from '@testing-library/react';
import { StockTable } from '../components/StockTable';
import { useTradingStore } from '../store/tradingStore';
import { Stock } from '../types';
import '@testing-library/jest-dom';

const mockStocks: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3000, change: 0, changePercent: 0, volume: 0 },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'usa', sector: 'テクノロジー', price: 180, change: 0, changePercent: 0, volume: 0 },
];

describe('StockTable Component - Watchlist Actions', () => {
  beforeEach(() => {
    useTradingStore.setState({
      watchlist: mockStocks,
    });
  });

  it('renders stock symbols and names correctly', () => {
    render(<StockTable stocks={mockStocks} />);
    expect(screen.getByText('7203')).toBeInTheDocument();
    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('shows the delete button when hovering over a row and calls removal', () => {
    //removeFromWatchlistをスパイ
    const removeFromWatchlistSpy = jest.fn();
    useTradingStore.setState({ removeFromWatchlist: removeFromWatchlistSpy });

    render(<StockTable stocks={mockStocks} />);
    
    // トヨタの行を見つける（symbolを表示しているセルを基準に）
    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');
    
    if (!row) throw new Error('Row not found');

    // 削除ボタンを見つける（svgを含むボタン）
    const deleteButton = row.querySelector('button');
    if (!deleteButton) throw new Error('Delete button not found in row');

    // クリック実行
    fireEvent.click(deleteButton);

    // ストアのアクションが呼ばれたことを確認
    expect(removeFromWatchlistSpy).toHaveBeenCalledWith('7203');
  });
});
