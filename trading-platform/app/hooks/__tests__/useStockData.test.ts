import { renderHook, act, waitFor } from '@testing-library/react';
import { useStockData } from '../useStockData';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { ServiceContainer, TOKENS } from '@/app/lib/di/ServiceContainer';

// Mock dependencies
jest.mock('@/app/store/watchlistStore');
jest.mock('@/app/store/uiStore');
jest.mock('@/app/data/stocks');
jest.mock('@/app/lib/di/ServiceContainer', () => ({
    ServiceContainer: {
        resolve: jest.fn(),
        register: jest.fn(),
        reset: jest.fn()
    },
    TOKENS: {
        MarketDataHub: 'MarketDataHub'
    }
}));

describe('useStockData', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, market: 'japan' as const };
    const mockSetSelectedStock = jest.fn();
    const mockDataHub = {
        getData: jest.fn().mockResolvedValue([{ date: '2023-01-01', close: 100 }])
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (ServiceContainer.resolve as jest.Mock).mockReturnValue(mockDataHub);
        (useWatchlistStore as unknown as jest.Mock).mockImplementation(() => ({
            watchlist: []
        }));
        (useUIStore as unknown as jest.Mock).mockImplementation(() => ({
            selectedStock: null,
            setSelectedStock: mockSetSelectedStock
        }));
        (fetchOHLCV as unknown as jest.Mock).mockResolvedValue([{ date: '2023-01-01', close: 100 }]);
        (fetchSignal as unknown as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                symbol: mockStock.symbol,
                type: 'BUY',
                confidence: 80,
                targetPrice: 2500,
                stopLoss: 2000,
                reason: 'test reason',
                predictedChange: 10,
                predictionDate: '2023-01-01'
            },
            source: 'api'
        });
    });

    it('initializes with default values', () => {
        const { result } = renderHook(() => useStockData());
        expect(result.current.selectedStock).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('auto-selects first stock from watchlist if nothing selected', async () => {
        (useWatchlistStore as unknown as jest.Mock).mockImplementation(() => ({
            watchlist: [mockStock]
        }));
        (useUIStore as unknown as jest.Mock).mockImplementation(() => ({
            selectedStock: null,
            setSelectedStock: mockSetSelectedStock
        }));

        renderHook(() => useStockData());

        await waitFor(() => {
            expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStock);
        });
    });

    it('fetches data when stock is selected', async () => {
        (useWatchlistStore as unknown as jest.Mock).mockImplementation(() => ({
            watchlist: []
        }));
        (useUIStore as unknown as jest.Mock).mockImplementation(() => ({
            selectedStock: mockStock,
            setSelectedStock: mockSetSelectedStock
        }));

        const { result } = renderHook(() => useStockData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(result.current.chartData).toHaveLength(1);
            expect(result.current.chartSignal?.type).toBe('BUY');
        });

        expect(fetchOHLCV).toHaveBeenCalled();
    });

    it('handles manual selection', async () => {
        const { result } = renderHook(() => useStockData());

        act(() => {
            result.current.handleStockSelect(mockStock);
        });

        expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStock);
        // data fetch triggers via useEffect when store updates (mocked above) or local state?
        // In the hook: handleStockSelect updates local AND store. 
        // Then useEffect sees store update (if connected) or just relies on local?
        // The hook logic: handleStockSelect calls `fetchData` directly.
    });

    it('handles fetch errors', async () => {
        (fetchOHLCV as unknown as jest.Mock).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useStockData());

        act(() => {
            result.current.handleStockSelect(mockStock);
        });

        await waitFor(() => {
            expect(result.current.error).toContain('エラー');
            expect(result.current.loading).toBe(false);
        });
    });

    it('aborts previous requests', async () => {
        const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
        const { result, unmount } = renderHook(() => useStockData());

        act(() => {
            result.current.handleStockSelect(mockStock);
        });

        unmount();
        expect(abortSpy).toHaveBeenCalled();
    });
});
