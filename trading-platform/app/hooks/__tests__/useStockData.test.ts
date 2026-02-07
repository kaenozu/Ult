import { renderHook, act, waitFor } from '@testing-library/react';
import { useStockData } from '../useStockData';
import { useTradingStore } from '@/app/store/tradingStore';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';

// Mock dependencies
jest.mock('@/app/store/tradingStore');
jest.mock('@/app/data/stocks');

describe('useStockData', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, market: 'japan' as const };
    const mockSetSelectedStock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector: any) => selector({
            watchlist: [],
            selectedStock: null,
            setSelectedStock: mockSetSelectedStock
        }));
        (fetchOHLCV as jest.Mock).mockResolvedValue([{ date: '2023-01-01', close: 100 }]);
        (fetchSignal as jest.Mock).mockResolvedValue({
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
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector: any) => selector({
            watchlist: [mockStock],
            selectedStock: null,
            setSelectedStock: mockSetSelectedStock
        }));

        renderHook(() => useStockData());

        await waitFor(() => {
            expect(mockSetSelectedStock).toHaveBeenCalledWith(mockStock);
        });
    });

    it('fetches data when stock is selected', async () => {
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector: any) => selector({
            watchlist: [],
            selectedStock: mockStock,
            setSelectedStock: mockSetSelectedStock
        }));

        const { result } = renderHook(() => useStockData());

         await waitFor(() => {
             expect(result.current.loading).toBe(false);
             expect(result.current.chartData).toHaveLength(1);
             expect(result.current.chartSignal?.type).toBe('BUY');
         });

        expect(fetchOHLCV).toHaveBeenCalledTimes(3); // Stock + Index + Background Sync
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
        (fetchOHLCV as jest.Mock).mockRejectedValue(new Error('Network error'));

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
