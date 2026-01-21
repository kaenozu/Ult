import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncData } from '@/components/shared/hooks/useAsyncData';
import { logger } from '@/lib/logger';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useAsyncData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle successful data fetching', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockAsyncFn = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useAsyncData(mockAsyncFn, [], {
        onSuccess: jest.fn(),
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(result.current.isError).toBe(false);
  });

  it('should handle errors and retry logic', async () => {
    const mockError = new Error('Network error');
    const mockAsyncFn = jest
      .fn()
      .mockRejectedValueOnce(mockError)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValue({ success: true });

    const onError = jest.fn();

    const { result } = renderHook(() =>
      useAsyncData(mockAsyncFn, [], {
        onError,
        retryCount: 2,
        retryDelay: 100,
      })
    );

    // Initial failure
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // First retry
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Second retry
    act(() => {
      jest.advanceTimersByTime(200); // Exponential backoff: 100 * 2^1
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ success: true });
    expect(result.current.error).toBe(null);
    expect(mockAsyncFn).toHaveBeenCalledTimes(3);
  });

  it('should call onSuccess callback on successful fetch', async () => {
    const mockData = { result: 'success' };
    const mockAsyncFn = jest.fn().mockResolvedValue(mockData);
    const onSuccess = jest.fn();

    renderHook(() => useAsyncData(mockAsyncFn, [], { onSuccess }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('should call onError callback on failure', async () => {
    const mockError = new Error('Failed');
    const mockAsyncFn = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();

    renderHook(() =>
      useAsyncData(mockAsyncFn, [], {
        onError,
        retryCount: 0, // No retries
      })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('should allow manual refetch', async () => {
    const mockData1 = { count: 1 };
    const mockData2 = { count: 2 };
    const mockAsyncFn = jest
      .fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() => useAsyncData(mockAsyncFn, []));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
  });

  it('should reset state', async () => {
    const mockData = { test: true };
    const mockAsyncFn = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsyncData(mockAsyncFn, []));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it('should re-execute when dependencies change', async () => {
    const mockAsyncFn = jest.fn().mockResolvedValue({ value: 'test' });

    let dep = 'initial';
    const { rerender } = renderHook(() => useAsyncData(mockAsyncFn, [dep]));

    await waitFor(() => {
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    });

    dep = 'changed';
    rerender();

    await waitFor(() => {
      expect(mockAsyncFn).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle non-Error exceptions', async () => {
    const mockAsyncFn = jest.fn().mockRejectedValue('String error');

    const { result } = renderHook(() =>
      useAsyncData(mockAsyncFn, [], { retryCount: 0 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('String error');
  });
});
