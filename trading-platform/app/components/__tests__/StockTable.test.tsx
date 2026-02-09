import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockTable } from '../StockTable';
import { useTradingStore } from '@/app/store/tradingStore';
import { marketClient } from '@/app/lib/api/data-aggregator';

// Mock dependencies
jest.mock('@/app/store/tradingStore', () => ({
    useTradingStore: jest.fn(),
}));

jest.mock('@/app/lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuotes: jest.fn(),
    },
}));

describe('StockTable', () => {
    const mockStocks = [
        { symbol: '7203', name: 'Toyota', price: 2000, change: 10, changePercent: 0.5, market: 'japan' },
        { symbol: 'AAPL', name: 'Apple', price: 150, change: -2, changePercent: -1.2, market: 'usa' }
    ];

    const mockSetSelectedStock = jest.fn();
    const mockBatchUpdateStockData = jest.fn();
    const mockRemoveFromWatchlist = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                setSelectedStock: mockSetSelectedStock,
                batchUpdateStockData: mockBatchUpdateStockData,
                removeFromWatchlist: mockRemoveFromWatchlist,
            };
            return selector(state);
        });
        (marketClient.fetchQuotes as unknown as jest.Mock).mockResolvedValue([]);
    });

    it('renders list of stocks', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        expect(screen.getByText('Toyota')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('handles stock selection click', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        fireEvent.click(screen.getByText('Toyota'));
        expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStocks[0]);
    });

    it('handles keyboard navigation (Enter/Space)', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        const row = screen.getByText('Toyota').closest('tr');

        if (row) {
            fireEvent.keyDown(row, { key: 'Enter' });
            expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStocks[0]);

            mockSetSelectedStock.mockClear();
            fireEvent.keyDown(row, { key: ' ' });
            expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStocks[0]);
        }
    });

    it('handles stock removal', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        // Find remove buttons
        const removeButtons = screen.getAllByRole('button', { name: /ウォッチリストから削除/ });
        fireEvent.click(removeButtons[0]);

        expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('7203');
        // Ensure row click didn't trigger
        expect(mockSetSelectedStock).not.toHaveBeenCalled();
    });

    it('fetches and updates quotes on mount', async () => {
        const freshQuotes = [
            { symbol: '7203', price: 2005, change: 15, changePercent: 0.75, volume: 100 }
        ];
        (marketClient.fetchQuotes as unknown as jest.Mock).mockResolvedValue(freshQuotes);

        render(<StockTable stocks={mockStocks as unknown[]} />);

        await waitFor(() => {
            expect(marketClient.fetchQuotes).toHaveBeenCalledWith(['7203', 'AAPL']);
            expect(mockBatchUpdateStockData).toHaveBeenCalled();
        });
    });

    it('gracefully handles empty stock list', () => {
        render(<StockTable stocks={[]} />);
        // Header row + Empty state row
        expect(screen.getAllByRole('row')).toHaveLength(2);
        expect(screen.getByText('ウォッチリストは空です')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '銘柄を検索' })).toBeInTheDocument();
        expect(marketClient.fetchQuotes).not.toHaveBeenCalled();
    });

    it('focuses search input when "Search Stocks" button is clicked in empty state', () => {
        const mockFocus = jest.fn();
        const mockGetElementById = jest.spyOn(document, 'getElementById').mockReturnValue({
            focus: mockFocus
        } as { focus: jest.Mock });

        render(<StockTable stocks={[]} />);

        const searchButton = screen.getByRole('button', { name: '銘柄を検索' });
        fireEvent.click(searchButton);

        expect(mockGetElementById).toHaveBeenCalledWith('stockSearch');
        expect(mockFocus).toHaveBeenCalled();

        mockGetElementById.mockRestore();
    });

    it('handles accessible sorting via column headers', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);

        const symbolHeaderButton = screen.getByRole('button', { name: /銘柄/ });
        const th = symbolHeaderButton.closest('th');

        // Initial state: symbol ascending
        expect(th).toHaveAttribute('aria-sort', 'ascending');

        // Toggle sort direction
        fireEvent.click(symbolHeaderButton);
        expect(th).toHaveAttribute('aria-sort', 'descending');

        // Switch sort field to Price
        const priceHeaderButton = screen.getByRole('button', { name: /現在値/ });
        const priceTh = priceHeaderButton.closest('th');

        fireEvent.click(priceHeaderButton);
        expect(priceTh).toHaveAttribute('aria-sort', 'ascending');
        expect(th).toHaveAttribute('aria-sort', 'none');
    });
});
