import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockTable } from '../StockTable';
import { marketClient } from '@/app/lib/api/data-aggregator';

// Mock dependencies with stable references
const mockBatchUpdateStockData = jest.fn();
const mockRemoveFromWatchlist = jest.fn();
const mockSetSelectedStock = jest.fn();

jest.mock('@/app/store/watchlistStore', () => ({
    useWatchlistStore: jest.fn((selector) => {
        const state = {
            batchUpdateStockData: mockBatchUpdateStockData,
            removeFromWatchlist: mockRemoveFromWatchlist,
        };
        return selector ? selector(state) : state;
    }),
}));

jest.mock('@/app/store/uiStore', () => ({
    useUIStore: jest.fn((selector) => {
        const state = {
            setSelectedStock: mockSetSelectedStock,
        };
        return selector ? selector(state) : state;
    }),
}));

jest.mock('@/app/lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuotes: jest.fn(),
    },
}));

// Mock stable measureAsync
const mockMeasureAsync = jest.fn((_name: string, fn: () => Promise<void>) => fn());

jest.mock('@/app/lib/performance', () => ({
    usePerformanceMonitor: () => ({
        measureAsync: mockMeasureAsync,
    }),
}));

describe('StockTable Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('re-fetches immediately when props update due to getAdaptiveInterval dependency', async () => {
        // Setup initial stocks
        const initialStocks = [
            { symbol: '7203', name: 'Toyota', price: 2000, change: 10, changePercent: 0.5, market: 'japan' }
        ];

        // Mock fetchQuotes to resolve immediately
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 2000, change: 10, changePercent: 0.5, volume: 100 }
        ]);

        const { rerender } = render(<StockTable stocks={initialStocks as any} />);

        // Initial fetch should happen
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(1);

        // Now update props (simulate price update)
        const updatedStocks = [
            { symbol: '7203', name: 'Toyota', price: 2001, change: 11, changePercent: 0.55, market: 'japan' }
        ];

        // Rerender with new props
        rerender(<StockTable stocks={updatedStocks as any} />);

        // After fix: useEffect should NOT re-run, so fetchQuotes should NOT be called immediately again
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(1);

        // Flush any pending promises to ensure setTimeout is scheduled
        await act(async () => {
            await Promise.resolve();
        });

        // Advance time to verify polling still works
        await act(async () => {
             jest.advanceTimersByTime(60000); // Default interval
        });

        // Should have called fetchQuotes again after timeout
        expect(marketClient.fetchQuotes).toHaveBeenCalledTimes(2);
    });
});
