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
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([]);
    });

    it('renders list of stocks', () => {
        render(<StockTable stocks={mockStocks as any[]} />);
        expect(screen.getByText('Toyota')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('handles stock selection click', () => {
        render(<StockTable stocks={mockStocks as any[]} />);
        fireEvent.click(screen.getByText('Toyota'));
        expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStocks[0]);
    });

    it('handles keyboard navigation (Enter/Space)', () => {
        render(<StockTable stocks={mockStocks as any[]} />);
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
        render(<StockTable stocks={mockStocks as any[]} />);
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
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue(freshQuotes);

        render(<StockTable stocks={mockStocks as any[]} />);

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
        expect(marketClient.fetchQuotes).not.toHaveBeenCalled();
    });
});
