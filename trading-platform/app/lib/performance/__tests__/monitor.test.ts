import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor } from '../monitor';

describe('usePerformanceMonitor', () => {
  it('returns an object with measureAsync', () => {
    const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

    expect(result.current).toHaveProperty('measure');
    expect(result.current).toHaveProperty('measureApi');
    expect(result.current).toHaveProperty('measureAsync'); // Currently fails
  });

  it('returns a stable object reference', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent'));

    const initialResult = result.current;
    rerender();

    expect(result.current).toBe(initialResult); // Currently fails
  });
});
