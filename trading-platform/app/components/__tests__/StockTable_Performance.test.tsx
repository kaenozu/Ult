import { render, screen, act } from '@testing-library/react';
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

// Create a stable mock function for measureAsync
const mockMeasureAsync = jest.fn((_name, fn) => fn());

jest.mock('@/app/lib/performance', () => ({
    usePerformanceMonitor: () => ({
        measureAsync: mockMeasureAsync,
    }),
}));

describe('StockTable Performance', () => {
    const mockStocks = [
        { symbol: '7203', name: 'Toyota', price: 2000, change: 10, changePercent: 0.5, market: 'japan' },
    ];

    const mockSetSelectedStock = jest.fn();
    const mockBatchUpdateStockData = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        (useUIStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = { setSelectedStock: mockSetSelectedStock };
            return selector ? selector(state) : state;
        });

        // Ensure batchUpdateStockData is stable across renders
        // We do this by returning the SAME function instance
        (useWatchlistStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
            const state = {
                batchUpdateStockData: mockBatchUpdateStockData,
                removeFromWatchlist: jest.fn()
            };
            return selector ? selector(state) : state;
        });

        (marketClient.fetchQuotes as unknown as jest.Mock).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should not re-fetch immediately when props update', async () => {
        const { rerender } = render(<StockTable stocks={mockStocks as unknown[]} />);

        // Initial fetch on mount
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(1);

        // Advance time partially (e.g., 10s), should not fetch yet (default 60s)
        act(() => {
            jest.advanceTimersByTime(10000);
        });
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(1);

        // Simulate a prop update (e.g., price changed due to polling)
        const updatedStocks = [
            { ...mockStocks[0], price: 2005 }
        ];

        rerender(<StockTable stocks={updatedStocks as unknown[]} />);

        // If the bug exists, this will now be 2
        // If fixed, it should still be 1
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(1);
    });
});
