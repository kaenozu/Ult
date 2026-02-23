/**
 * useChartInstance.ts
 * 
 * lightweight-chartsのインスタンス初期化とリサイズを管理
 */

import { useRef, useEffect, useState } from 'react';
import { createChart, IChartApi, ColorType, CrosshairMode } from 'lightweight-charts';

export function useChartInstance(height: number) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131b23' },
        textColor: '#92adc9',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1a2632',
        },
        horzLine: {
          color: '#6B7280',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1a2632',
        },
      },
      rightPriceScale: {
        borderColor: '#233648',
      },
      timeScale: {
        borderColor: '#233648',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.clientWidth;
        chart.applyOptions({ width });
        setContainerWidth(width);
      }
    };
    
    setContainerWidth(chartContainerRef.current.clientWidth);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [height]);

  return { chartContainerRef, chartRef, containerWidth };
}
