import { render, screen, fireEvent } from '@testing-library/react';
import { StockTable } from '../components/StockTable';
import { Stock } from '../types';
import '@testing-library/jest-dom';

// Mock stores used by StockTable
const mockWatchlistStore: { watchlist: Stock[]; removeFromWatchlist: jest.Mock } = {
  watchlist: [],
  removeFromWatchlist: jest.fn(),
};

const mockUIStore = {
  selectedStock: null,
  setSelectedStock: jest.fn(),
};

jest.mock('../store/watchlistStore', () => ({
  useWatchlistStore: () => mockWatchlistStore,
}));

jest.mock('../store/uiStore', () => ({
  useUIStore: () => mockUIStore,
}));

const mockStocks: Stock[] = [
  { symbol: '7203', name: 'トヨタ自動車', market: 'japan', sector: '自動車', price: 3000, change: 0, changePercent: 0, volume: 0 },
];

describe('StockTable Component - Accessibility', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockWatchlistStore.watchlist = [...mockStocks];
  });

  it('allows selecting a stock via keyboard (Enter key)', () => {
    const onSelectSpy = jest.fn();
    render(<StockTable stocks={mockStocks} onSelect={onSelectSpy} />);

    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');

    if (!row) throw new Error('Row not found');

    // Verify it is focusable
    expect(row).toHaveAttribute('tabIndex', '0');

    // Focus and press Enter
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });

    // Should call selection handler
    expect(onSelectSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '7203' }));
  });

  it('allows selecting a stock via keyboard (Space key)', () => {
    const onSelectSpy = jest.fn();
    render(<StockTable stocks={mockStocks} onSelect={onSelectSpy} />);

    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');

    if (!row) throw new Error('Row not found');

    // Focus and press Space
    row.focus();
    fireEvent.keyDown(row, { key: ' ', code: 'Space' });

    // Should call selection handler
    expect(onSelectSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: '7203' }));
  });

  it('ensures delete button is visible on focus', () => {
    render(<StockTable stocks={mockStocks} />);

    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');
    if (!row) throw new Error('Row not found');

    const deleteButton = row.querySelector('button');
    if (!deleteButton) throw new Error('Delete button not found in row');

    // Check for the class that ensures visibility on focus
    expect(deleteButton).toHaveClass('focus:opacity-100');
  });

  it('does NOT select the stock when pressing Enter on the delete button', () => {
    const onSelectSpy = jest.fn();
    render(<StockTable stocks={mockStocks} onSelect={onSelectSpy} />);

    const toyotaSymbol = screen.getByText('7203');
    const row = toyotaSymbol.closest('tr');
    if (!row) throw new Error('Row not found');

    const deleteButton = row.querySelector('button');
    if (!deleteButton) throw new Error('Delete button not found');

    deleteButton.focus();

    // Press Enter on button. This event bubbles to the row.
    fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter' });

    // Should NOT call selection handler because event originated from button
    expect(onSelectSpy).not.toHaveBeenCalled();
  });
});