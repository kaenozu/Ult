import { renderHook } from '@testing-library/react';
import { useChartOptions } from '../useChartOptions';
import { OHLCV } from '@/app/types';

describe('useChartOptions - Y-axis Range Bug Fix', () => {
  // 日野自動車（7205）の実際のデータに基づくテストケース
  const createHinoData = (): OHLCV[] => [
    {
      date: '2026-02-04',
      open: 453,
      high: 492,
      low: 449,
      close: 485, // 高値
      volume: 8783900,
    },
    {
      date: '2026-02-05',
      open: 472,
      high: 475,
      low: 459,
      close: 465, // 現在価格
      volume: 2772600,
    }
  ];

  it('should include all data points in Y-axis range', () => {
    const data = createHinoData();
    
    const { result } = renderHook(() => 
      useChartOptions({
        data,
        extendedData: { 
          labels: data.map(d => d.date), 
          prices: data.map(d => d.close) 
        },
        market: 'japan',
        hoveredIdx: null,
        setHoveredIndex: () => {}
      })
    );

    const options = result.current;
    const yAxis = options.scales?.y;
    
    if (!yAxis) {
      throw new Error('Y-axis options not found');
    }

    const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    const dataMin = Math.min(...allPrices);
    const dataMax = Math.max(...allPrices);

    console.log('Y-axis range:', { min: yAxis.min, max: yAxis.max });
    console.log('Data min/max:', { min: dataMin, max: dataMax });
    console.log('All prices:', allPrices);

    // 全ての価格がY軸範囲内にあることを確認
    allPrices.forEach(price => {
      expect(yAxis.min).toBeLessThanOrEqual(price);
      expect(yAxis.max).toBeGreaterThanOrEqual(price);
    });

    // 特に問題の価格を確認
    expect(yAxis.min).toBeLessThanOrEqual(485); // 高値
    expect(yAxis.max).toBeGreaterThanOrEqual(485);
    expect(yAxis.min).toBeLessThanOrEqual(465); // 現在価格
    expect(yAxis.max).toBeGreaterThanOrEqual(465);
    expect(yAxis.min).toBeLessThanOrEqual(449); // 安値
    expect(yAxis.max).toBeGreaterThanOrEqual(449);
  });

  it('should handle extreme price volatility', () => {
    // より極端な価格変動のテストケース
    const volatileData: OHLCV[] = [
      {
        date: '2026-02-01',
        open: 400,
        high: 600,
        low: 350,
        close: 550,
        volume: 1000000,
      },
      {
        date: '2026-02-02',
        open: 550,
        high: 580,
        low: 300,
        close: 320,
        volume: 1000000,
      }
    ];
    
    const { result } = renderHook(() => 
      useChartOptions({
        data: volatileData,
        extendedData: { 
          labels: volatileData.map(d => d.date), 
          prices: volatileData.map(d => d.close) 
        },
        market: 'japan',
        hoveredIdx: null,
        setHoveredIndex: () => {}
      })
    );

    const options = result.current;
    const yAxis = options.scales?.y;
    
    if (!yAxis) {
      throw new Error('Y-axis options not found');
    }

    const allPrices = volatileData.flatMap(d => [d.open, d.high, d.low, d.close]);
    
    console.log('Volatile data Y-axis range:', { min: yAxis.min, max: yAxis.max });
    console.log('Volatile data prices:', allPrices);

    // 全ての価格が範囲内にある
    allPrices.forEach(price => {
      expect(yAxis.min).toBeLessThanOrEqual(price);
      expect(yAxis.max).toBeGreaterThanOrEqual(price);
    });

    // 範囲が適切に広いことを確認
    const range = (yAxis.max as number) - (yAxis.min as number);
    const currentPrice = volatileData[volatileData.length - 1].close;
    const minExpectedRange = currentPrice * 0.02; // 最低2%
    
    expect(range).toBeGreaterThanOrEqual(minExpectedRange);
  });

  it('should maintain minimum range for stable data', () => {
    // 安定したデータのテストケース
    const stableData: OHLCV[] = [
      {
        date: '2026-02-01',
        open: 500,
        high: 505,
        low: 495,
        close: 502,
        volume: 1000000,
      },
      {
        date: '2026-02-02',
        open: 502,
        high: 504,
        low: 498,
        close: 500,
        volume: 1000000,
      }
    ];
    
    const { result } = renderHook(() => 
      useChartOptions({
        data: stableData,
        extendedData: { 
          labels: stableData.map(d => d.date), 
          prices: stableData.map(d => d.close) 
        },
        market: 'japan',
        hoveredIdx: null,
        setHoveredIndex: () => {}
      })
    );

    const options = result.current;
    const yAxis = options.scales?.y;
    
    if (!yAxis) {
      throw new Error('Y-axis options not found');
    }

    const allPrices = stableData.flatMap(d => [d.open, d.high, d.low, d.close]);
    
    console.log('Stable data Y-axis range:', { min: yAxis.min, max: yAxis.max });
    console.log('Stable data prices:', allPrices);

    // 全ての価格が範囲内にある
    allPrices.forEach(price => {
      expect(yAxis.min).toBeLessThanOrEqual(price);
      expect(yAxis.max).toBeGreaterThanOrEqual(price);
    });

    // 最低限の範囲が確保されていることを確認
    const range = (yAxis.max as number) - (yAxis.min as number);
    const currentPrice = stableData[stableData.length - 1].close;
    const minExpectedRange = currentPrice * 0.02; // 最低2%
    
    expect(range).toBeGreaterThanOrEqual(minExpectedRange);
  });
});
