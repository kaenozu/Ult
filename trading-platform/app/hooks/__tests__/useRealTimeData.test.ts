import { renderHook, waitFor } from '@testing-library/react';
import { useRealTimeData } from '../useRealTimeData';

// Mock fetch
global.fetch = jest.fn();

describe('useRealTimeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not poll if no symbol is provided', () => {
    renderHook(() => useRealTimeData(null));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should fetch data immediately when enabled', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { price: 3500 } }),
    });

    renderHook(() => useRealTimeData('7203', { enabled: true, market: 'japan' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('symbol=7203'));
    });
  });

  it('should poll data every interval', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { price: 3500 } }),
    });

    renderHook(() => useRealTimeData('7203', { enabled: true, market: 'japan', interval: 10000 }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Advance time
    jest.advanceTimersByTime(10000);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
