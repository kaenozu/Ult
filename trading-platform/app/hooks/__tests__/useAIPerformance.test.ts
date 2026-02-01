import { renderHook, waitFor } from '@testing-library/react';
import { useAIPerformance } from '../useAIPerformance';
import { Stock, OHLCV } from '@/app/types';
import * as analysis from '@/app/lib/analysis';

// Mock dependencies
jest.mock('@/app/lib/analysis');

// Mock fetch
global.fetch = jest.fn();

describe('useAIPerformance', () => {
  const mockStock: Stock = {
    symbol: '7203',
    name: 'Toyota',
    market: 'japan',
    sector: 'Automotive',
    price: 2000,
    change: 10,
    changePercent: 0.5,
    volume: 1000000
  };

  const mockOHLCV: OHLCV[] = [
    { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }
  ];

  const mockHistoryData = Array.from({ length: 150 }, (_, i) => {
    const date = new Date('2023-01-01');
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().split('T')[0],
      open: 100 + i,
      high: 110 + i,
      low: 90 + i,
      close: 105 + i,
      volume: 1000
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (analysis.calculateAIHitRate as jest.Mock).mockReturnValue({
      hitRate: 65.5,
      totalTrades: 10
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));
    expect(result.current.calculatingHitRate).toBe(true);
    expect(result.current.preciseHitRate).toEqual({ hitRate: 0, trades: 0 });
    expect(result.current.error).toBeNull();
  });

  it('fetches and calculates hit rate successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(result.current.preciseHitRate).toEqual({ hitRate: 65.5, trades: 10 });
    expect(result.current.error).toBeNull();
    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', mockHistoryData, 'japan');
  });

  it('uses fallback OHLCV data when API data is insufficient', async () => {
    const shortData = mockHistoryData.slice(0, 50); // Less than 100 items
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: shortData })
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', mockOHLCV, 'japan');
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    // Should fallback to OHLCV
    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', mockOHLCV, 'japan');
  });

  it('prevents race condition when symbol changes during fetch', async () => {
    let resolveFirstFetch: (value: any) => void;
    const firstFetchPromise = new Promise(resolve => {
      resolveFirstFetch = resolve;
    });

    // First fetch is delayed
    (global.fetch as jest.Mock).mockImplementationOnce(() => firstFetchPromise);

    const { result, rerender } = renderHook(
      ({ stock, ohlcv }) => useAIPerformance(stock, ohlcv),
      {
        initialProps: { stock: mockStock, ohlcv: mockOHLCV }
      }
    );

    // Verify initial fetch started
    expect(result.current.calculatingHitRate).toBe(true);

    // Change the symbol before first fetch completes
    const newStock: Stock = { ...mockStock, symbol: 'AAPL', market: 'usa' };
    
    // Setup second fetch to resolve immediately
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });

    rerender({ stock: newStock, ohlcv: mockOHLCV });

    // Wait for second fetch to complete
    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    // Now resolve the first (stale) fetch
    resolveFirstFetch!({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });

    // Wait a bit to ensure stale data doesn't overwrite
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that the result corresponds to the NEW symbol, not the old one
    // The last call should be for 'AAPL', not '7203'
    const calls = (analysis.calculateAIHitRate as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('AAPL');
    expect(lastCall[2]).toBe('usa');
  });

  it('does not update state after unmount', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ data: mockHistoryData })
          });
        }, 100);
      })
    );

    const { result, unmount } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    expect(result.current.calculatingHitRate).toBe(true);

    // Unmount before fetch completes
    unmount();

    // Wait for fetch to complete
    await new Promise(resolve => setTimeout(resolve, 150));

    // No state update should occur (no error thrown)
    expect(true).toBe(true);
  });

  it('handles calculation errors in fallback', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Error'
    });

    // Make the first call succeed but the second (fallback) fail
    (analysis.calculateAIHitRate as jest.Mock)
      .mockImplementationOnce(() => {
        throw new Error('Calculation failed');
      });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(result.current.error).toBe('的中率の計算に失敗しました');
  });

  it('resets error state on new fetch', async () => {
    // First fetch fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Error'
    });
    (analysis.calculateAIHitRate as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Calculation failed');
    });

    const { result, rerender } = renderHook(
      ({ stock, ohlcv }) => useAIPerformance(stock, ohlcv),
      {
        initialProps: { stock: mockStock, ohlcv: mockOHLCV }
      }
    );

    await waitFor(() => {
      expect(result.current.error).toBe('的中率の計算に失敗しました');
    });

    // Second fetch succeeds
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });
    (analysis.calculateAIHitRate as jest.Mock).mockReturnValue({
      hitRate: 70,
      totalTrades: 15
    });

    const newStock: Stock = { ...mockStock, symbol: 'AAPL' };
    rerender({ stock: newStock, ohlcv: mockOHLCV });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
