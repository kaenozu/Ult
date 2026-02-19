import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockTable } from '../StockTable';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { marketClient } from '@/app/lib/api/data-aggregator';

// Mock dependencies
jest.mock('@/app/store/watchlistStore', () => ({
    useWatchlistStore: jest.fn(),
}));

jest.mock('@/app/store/uiStore', () => ({
    useUIStore: jest.fn(),
}));

jest.mock('@/app/lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuotes: jest.fn(),
    },
}));

jest.mock('@/app/lib/performance', () => ({
    usePerformanceMonitor: () => ({
        measureAsync: (_name: string, fn: () => Promise<void>) => fn(),
    }),
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
        (useUIStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = {
                setSelectedStock: mockSetSelectedStock,
            };
            return selector ? selector(state) : state;
        });
        (useWatchlistStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = {
                batchUpdateStockData: mockBatchUpdateStockData,
                removeFromWatchlist: mockRemoveFromWatchlist,
            };
            return selector ? selector(state) : state;
        });
        (marketClient.fetchQuotes as unknown as jest.Mock).mockResolvedValue([]);
    });

    it('renders list of stocks', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        expect(screen.getByText('Toyota')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('handles stock selection click', async () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        const toyotaRow = screen.getByText('Toyota').closest('tr');
        if (toyotaRow) {
            fireEvent.click(toyotaRow);
            expect(mockSetSelectedStock).toHaveBeenCalled();
        }
    });

    it('handles keyboard navigation (Enter/Space)', async () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        const toyotaRow = screen.getByText('Toyota').closest('tr');

        if (toyotaRow) {
            fireEvent.focus(toyotaRow);
            fireEvent.keyDown(toyotaRow, { key: 'Enter', bubbles: true });
            await waitFor(() => {
                expect(mockSetSelectedStock).toHaveBeenCalled();
            });
        }
    });

    it('handles stock removal', async () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        const removeButtons = screen.getAllByRole('button', { name: /ウォッチリストから削除/ });
        fireEvent.click(removeButtons[0]);

        await waitFor(() => {
            expect(mockRemoveFromWatchlist).toHaveBeenCalledWith('7203');
        });
    });

    it('fetches quotes on mount', async () => {
        const freshQuotes = [
            { symbol: '7203', price: 2005, change: 15, changePercent: 0.75, volume: 100 }
        ];
        (marketClient.fetchQuotes as unknown as jest.Mock).mockResolvedValue(freshQuotes);

        render(<StockTable stocks={mockStocks as unknown[]} />);

        await waitFor(() => {
            expect(marketClient.fetchQuotes).toHaveBeenCalledWith(
                ['7203', 'AAPL'],
                expect.any(AbortSignal)
            );
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

    it('uses CSS-only hover effects without React state', () => {
        render(<StockTable stocks={mockStocks as unknown[]} />);
        
        // Find a stock row
        const toyotaRow = screen.getByText('Toyota').closest('tr');
        expect(toyotaRow).toBeInTheDocument();
        
        // Verify the row has 'group' class for Tailwind group-hover
        expect(toyotaRow).toHaveClass('group');
        
        // Find the delete button
        const deleteButton = toyotaRow?.querySelector('button[aria-label*="削除"]');
        expect(deleteButton).toBeInTheDocument();
        
        // Verify button uses group-hover classes (CSS-only, no JS handlers)
        if (deleteButton) {
            const classes = deleteButton.className;
            expect(classes).toContain('group-hover:opacity-100');
            expect(classes).toContain('group-hover:text-red-400');
            expect(classes).toContain('opacity-0');
        }
        
        // Verify no onMouseEnter or onMouseLeave handlers on row
        // (these would indicate React state-based hover)
        // Note: These should be null or undefined, meaning no JS hover handlers
        expect(toyotaRow?.onmouseenter).toBeFalsy();
        expect(toyotaRow?.onmouseleave).toBeFalsy();
    });
});
