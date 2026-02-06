/**
 * useChartData Hook - TDD Test Suite
 * Tests the data separation and optimization logic
 */

import { renderHook } from '@testing-library/react';
import { useChartData } from '@/app/components/StockChart/hooks/useChartData';
import { OHLCV, Signal } from '@/app/types';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock Chart.js to avoid canvas errors in JSDOM
jest.mock('react-chartjs-2', () => ({
  Line: () => ({ props: { 'data-testid': 'chart-line' } }),
  Bar: () => ({ props: { 'data-testid': 'chart-bar' } })
}));

// Mock constants
// Mock constants removed to use real values and avoid breaking chart-utils dependencies

function generateMockOHLCV(startPrice: number, days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let currentPrice = startPrice;
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const open = currentPrice;
    const change = (Math.random() - 0.5) * 10;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }
  return data;
}

function generateMockSignal(type: 'BUY' | 'SELL' | 'HOLD'): Signal {
  return {
    type,
    direction: type === 'BUY' ? 'LONG' : type === 'SELL' ? 'SHORT' : 'FLAT',
    strength: Math.random() * 0.5 + 0.5,
    confidence: Math.random() * 0.3 + 0.7,
    targetPrice: 1000 + Math.random() * 200,
    timeframe: '1D',
    generatedAt: new Date().toISOString(),
    indicators: {
      rsi: Math.random() * 100,
      macd: {
        macd: Math.random() * 10 - 5,
        signal: Math.random() * 10 - 5,
        histogram: Math.random() * 5 - 2.5
      },
      sma20: 1000 + Math.random() * 100,
      bollingerBands: {
        upper: 1050 + Math.random() * 50,
        middle: 1000 + Math.random() * 25,
        lower: 950 + Math.random() * 25
      }
    },
    reasoning: `Test ${type} signal`
  };
}

describe('useChartData Hook', () => {
  describe('Data Separation', () => {
    test('should separate actual data from forecast data correctly', () => {
      const mockData = generateMockOHLCV(1000, 120);
      const mockSignal = generateMockSignal('BUY');

      const { result } = renderHook(() =>
        useChartData(mockData, mockSignal, [])
      );

      expect(result.current.actualData.labels).toHaveLength(120);
      expect(result.current.actualData.prices).toHaveLength(120);
      expect(result.current.forecastExtension.forecastPrices).toHaveLength(60);
      expect(result.current.forecastExtension.extendedLabels).toHaveLength(180); // 120 actual + 60 forecast
    });

    test('should return only actual data when no signal is provided', () => {
      const mockData = generateMockOHLCV(1000, 120);

      const { result } = renderHook(() =>
        useChartData(mockData, null, [])
      );

      expect(result.current.actualData.labels).toHaveLength(120);
      expect(result.current.actualData.prices).toHaveLength(120);
      expect(result.current.forecastExtension.forecastPrices).toHaveLength(60);
      expect(result.current.forecastExtension.extendedLabels).toHaveLength(180);
    });

    test('should handle empty data gracefully', () => {
      const { result } = renderHook(() =>
        useChartData([], null, [])
      );

      expect(result.current.actualData.labels).toHaveLength(0);
      expect(result.current.actualData.prices).toHaveLength(0);
      expect(result.current.forecastExtension.forecastPrices).toHaveLength(0);
    });
  });

  describe('Data Optimization', () => {
    test('should optimize large datasets correctly', () => {
      // Generate 600 days of data (threshold is 500)
      const mockData = generateMockOHLCV(1000, 600);
      const mockSignal = generateMockSignal('BUY');

      const { result } = renderHook(() =>
        useChartData(mockData, mockSignal, [], 800) // 800px width
      );

      // Should optimize to around 400 points (800px * 0.5)
      expect(result.current.actualData.labels.length).toBeLessThanOrEqual(400);
      expect(result.current.actualData.prices.length).toBeLessThanOrEqual(400);
    });

    test('should not optimize small datasets', () => {
      // Generate only 30 days of data
      const mockData = generateMockOHLCV(1000, 30);
      const mockSignal = generateMockSignal('BUY');

      const { result } = renderHook(() =>
        useChartData(mockData, mockSignal, [], 800)
      );

      // Should keep all data when it's small
      expect(result.current.actualData.labels.length).toBe(30);
      expect(result.current.actualData.prices.length).toBe(30);
    });

    test('should handle different chart widths correctly', () => {
      const mockData = generateMockOHLCV(1000, 600);

      // Test with narrow width
      const { result: narrowResult } = renderHook(() =>
        useChartData(mockData, null, [], 400)
      );
      expect(narrowResult.current.actualData.labels.length).toBeLessThanOrEqual(200);

      // Test with wide width
      const { result: wideResult } = renderHook(() =>
        useChartData(mockData, null, [], 1200)
      );
      expect(wideResult.current.actualData.labels.length).toBeLessThanOrEqual(600);
    });
  });

  describe('Extended Data Compatibility', () => {
    test('should maintain backward compatibility with extendedData', () => {
      const mockData = generateMockOHLCV(1000, 120);
      const mockSignal = generateMockSignal('BUY');

      const { result } = renderHook(() =>
        useChartData(mockData, mockSignal, [])
      );

      // Check that extendedData has the correct structure
      expect(result.current.extendedData.labels).toBeDefined();
      expect(result.current.extendedData.prices).toBeDefined();

      // Extended data should include all labels (actual + forecast)
      expect(result.current.extendedData.labels.length).toBe(180);
      // Extended data prices should only include actual prices (null for forecast)
      expect(result.current.extendedData.prices.length).toBe(180);
      expect(result.current.extendedData.prices.slice(0, 120)).not.toContain(null);
      expect(result.current.extendedData.prices.slice(120)).toEqual(new Array(60).fill(null));
    });

    test('should handle index data correctly', () => {
      const mockData = generateMockOHLCV(1000, 120);
      const mockIndexData = generateMockOHLCV(950, 120);

      const { result } = renderHook(() =>
        useChartData(mockData, null, mockIndexData)
      );

      expect(result.current.normalizedIndexData).toBeDefined();
      expect(Array.isArray(result.current.normalizedIndexData)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle single data point', () => {
      const mockData = generateMockOHLCV(1000, 1);

      const { result } = renderHook(() =>
        useChartData(mockData, null, [])
      );

      expect(result.current.actualData.labels).toHaveLength(1);
      expect(result.current.actualData.prices).toHaveLength(1);
    });

    test('should handle very large datasets', () => {
      // Generate 1000 days of data
      const mockData = generateMockOHLCV(1000, 1000);

      const { result } = renderHook(() =>
        useChartData(mockData, null, [], 800)
      );

      // Should optimize to reasonable size (around 400 for 800px)
      expect(result.current.actualData.labels.length).toBeLessThanOrEqual(400);
      expect(result.current.actualData.prices.length).toBeLessThanOrEqual(400);
    });

    test('should handle signal changes correctly', () => {
      const mockData = generateMockOHLCV(1000, 120);
      const mockSignal1 = generateMockSignal('BUY');
      const mockSignal2 = generateMockSignal('SELL');

      const { result, rerender } = renderHook(({ data, signal, indexData }) =>
        useChartData(data, signal, indexData)
        , { initialProps: { data: mockData, signal: mockSignal1, indexData: [] } });

      const initialForecastPrices = [...result.current.forecastExtension.forecastPrices];
      expect(result.current.forecastExtension.forecastPrices).toHaveLength(60);

      // Change signal type
      rerender({ data: mockData, signal: mockSignal2, indexData: [] });

      expect(result.current.forecastExtension.forecastPrices).toHaveLength(60);
      // Forecast prices should be different (regenerated)
      expect(result.current.forecastExtension.forecastPrices).not.toEqual(initialForecastPrices);
    });
  });

  describe('Performance', () => {
    test('should not cause unnecessary re-renders', () => {
      const mockData = generateMockOHLCV(1000, 200);
      const mockSignal = generateMockSignal('BUY');

      const { result, rerender } = renderHook(
        ({ data, signal, indexData, chartWidth }) => useChartData(data, signal, indexData, chartWidth),
        { initialProps: { data: mockData, signal: mockSignal, indexData: [], chartWidth: 800 } }
      );

      const initialLabels = result.current.actualData.labels;
      const initialPrices = result.current.actualData.prices;

      // Re-render with same data
      rerender({ data: mockData, signal: mockSignal, indexData: [], chartWidth: 800 });

      // Should not change (memoized)
      expect(result.current.actualData.labels).toBe(initialLabels);
      expect(result.current.actualData.prices).toBe(initialPrices);
    });

    test('should handle rapid signal changes efficiently', () => {
      const mockData = generateMockOHLCV(1000, 200);
      const mockSignal1 = generateMockSignal('BUY');
      const mockSignal2 = generateMockSignal('SELL');

      const { result, rerender } = renderHook(({ signal }) =>
        useChartData(mockData, signal, [])
        , { initialProps: { signal: mockSignal1 } });

      const startTime = performance.now();

      // Rapid signal changes
      for (let i = 0; i < 10; i++) {
        rerender({ signal: i % 2 === 0 ? mockSignal1 : mockSignal2 });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 200ms for 10 re-renders)
      expect(duration).toBeLessThan(200);
    });
  });
});