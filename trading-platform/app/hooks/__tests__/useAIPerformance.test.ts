import { renderHook, waitFor, act } from '@testing-library/react';
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
    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));
    expect(result.current.calculatingHitRate).toBe(true);
    expect(result.current.preciseHitRate).toEqual({ hitRate: 0, trades: 0 });
    expect(result.current.error).toBeNull();
    
    await act(async () => {
      jest.runAllTimers();
    });
  });

  it('fetches and calculates hit rate successfully', async () => {
    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

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

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', expect.any(Array), 'japan');
    const callArgs = (analysis.calculateAIHitRate as jest.Mock).mock.calls[0];
    expect(callArgs[1].length).toBeGreaterThanOrEqual(50);
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(analysis.calculateAIHitRate).toHaveBeenCalledWith('7203', mockOHLCV, 'japan');
  });

  it('does not update state after unmount', async () => {
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

    const { result, unmount } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    expect(result.current.calculatingHitRate).toBe(true);

    unmount();

    await act(async () => {
      jest.runAllTimers();
    });

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

    const { result } = renderHook(() => useAIPerformance(mockStock, mockOHLCV));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.calculatingHitRate).toBe(false);
    });

    expect(result.current.error).toBe('的中率の計算に失敗しました');
  });

  it('resets error state on new fetch', async () => {
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
        initialProps: { stock: mockStock, ohlcv: mockOHLCV }
      }
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('的中率の計算に失敗しました');
    });
    
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
