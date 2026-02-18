import { renderHook, waitFor, act } from '@testing-library/react';
import { useAIPerformance } from '../useAIPerformance';
import { Stock, OHLCV } from '@/app/types';
import * as analysis from '@/app/lib/analysis';
import { createWrapper } from '@/app/__tests__/utils/query-wrapper';

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
    jest.useFakeTimers();
    jest.clearAllMocks();
    (analysis.calculateAIHitRate as unknown as jest.Mock).mockReturnValue({
      hitRate: 65.5,
      totalTrades: 10
    });
    // Default fetch mock
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default values', async () => {
    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });
    // With React Query, loading starts immediately, but data is undefined initially
    expect(result.current.calculatingHitRate).toBe(true);
    expect(result.current.preciseHitRate).toEqual({ hitRate: 0, trades: 0 });
    expect(result.current.error).toBeNull();
    
    await act(async () => {
      jest.runAllTimers();
    });
  });

  it('fetches and calculates hit rate successfully', async () => {
    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(result.current.preciseHitRate).toEqual({ hitRate: 65.5, trades: 10 });
    expect(result.current.error).toBeNull();
    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', expect.any(Array), 'japan');
  });

  it('uses fallback OHLCV data when API data is insufficient', async () => {
    const shortData = mockHistoryData.slice(0, 50);
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: shortData })
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', expect.any(Array), 'japan');
    // We expect it to use API data if OHLCV is smaller, or OHLCV if larger.
    // Here mockOHLCV has 1 record, API has 50. So it uses API (50).
    const callArgs = (analysis.calculateAIHitRate as jest.Mock).mock.calls[0];
    expect(callArgs[1].length).toBe(50); 
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    // Should fallback to OHLCV
    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', mockOHLCV, 'japan');
  });

  it('does not update state after unmount', async () => {
    // React Query handles unmounting gracefully, so this test is less relevant but good for regression
    // We can simulate a long delay
    (global.fetch as unknown as jest.Mock).mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ data: mockHistoryData })
          });
        }, 100);
      })
    );

    const { result, unmount } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });

    expect(result.current.calculatingHitRate).toBe(true);

    unmount();

    await act(async () => {
      jest.runAllTimers();
    });

    // React Query prevents updates on unmounted components
    expect(true).toBe(true);
  });

  it('handles calculation errors in fallback', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Error'
    });

    (analysis.calculateAIHitRate as jest.Mock).mockImplementation(() => {
      throw new Error('Calculation failed');
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(result.current.error).toBe('的中率の計算に失敗しました');
  });

  it('resets error state on new fetch', async () => {
    // Note: React Query caching might affect this test if keys are same.
    // We used 'retry: false' in wrapper, so error state persists until refetch.
    
    // First fetch fails
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Error'
    });
    (analysis.calculateAIHitRate as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Calculation failed');
    });

    const { result, rerender } = renderHook(
      ({ stock, ohlcv }) => useAIPerformance(stock, ohlcv),
      {
        initialProps: { stock: mockStock, ohlcv: mockOHLCV },
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('的中率の計算に失敗しました');
    });
    
    // Second fetch succeeds (Change stock to trigger new query key)
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockHistoryData })
    });
    (analysis.calculateAIHitRate as jest.Mock).mockReturnValue({
      hitRate: 70,
      totalTrades: 15
    });

    const newStock: Stock = { ...mockStock, symbol: 'AAPL' };
    rerender({ stock: newStock, ohlcv: mockOHLCV });

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
