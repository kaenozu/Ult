/**
 * StockChart.tsx
 * 
 * メインのチャートコンポーネント。
 * 各種レイヤー（ローソク足、指標、予測、需給）を統合します。
 */

'use client';

import { useState, memo, useEffect } from 'react';
import { CandlestickData } from 'lightweight-charts';
import { StockChartProps } from './types';
import { ChartTooltip } from './ChartTooltip';
import { useChartInstance } from './hooks/useChartInstance';
import { useChartData } from './hooks/useChartData';
import { useChartIndicators } from './hooks/useChartIndicators';
import { useChartForecast } from './hooks/useChartForecast';
import { useChartMarkers } from './hooks/useChartMarkers';
import { useSupplyDemandCanvas } from './hooks/useSupplyDemandCanvas';

export const StockChart = memo(function StockChart({
  data,
  height = 400,
  showVolume = true,
  showSMA = true,
  showBollinger = false,
  showSupplyDemandWall = true,
  loading = false,
  error = null,
  signal = null,
  accuracyData = null,
}: StockChartProps) {
  // State for Tooltip
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Chart Instance Initialization
  const { chartContainerRef, chartRef, containerWidth } = useChartInstance(height);

  // 2. Base Data (Candlesticks & Volume)
  const { candleSeriesRef } = useChartData(chartRef, data, showVolume);

  // 3. Technical Indicators (SMA & Bollinger)
  useChartIndicators(chartRef, data, showSMA, showBollinger);

  // 4. AI Forecast Cone
  useChartForecast(chartRef, data, signal, accuracyData?.predictionError);

  // 5. AI Signal Markers
  useChartMarkers(candleSeriesRef, data, signal);

  // 6. Supply/Demand Wall (Canvas Overlay)
  const { wallCanvasRef } = useSupplyDemandCanvas(
    chartRef,
    candleSeriesRef,
    data,
    showSupplyDemandWall,
    height,
    containerWidth
  );

  // Crosshair move subscription for Tooltip
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    const handler = (param: any) => {
      if (!param.time || !param.point || !candleSeriesRef.current) {
        setTooltipVisible(false);
        return;
      }

      const candleData = param.seriesData.get(candleSeriesRef.current) as CandlestickData;
      if (candleData) {
        const dateStr = String(param.time);
        setTooltipData({
          time: dateStr,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: 0,
        });
        setTooltipPos({ x: param.point.x, y: param.point.y });
        setTooltipVisible(true);
      }
    };

    chartRef.current.subscribeCrosshairMove(handler);
    return () => {
      chartRef.current?.unsubscribeCrosshairMove(handler);
    };
  }, [chartRef.current, candleSeriesRef.current]);

  if (error) {
    return (
      <div className="w-full flex items-center justify-center bg-red-900/20 border border-red-500/30 rounded" style={{ height }}>
        <div className="text-center p-4">
          <p className="text-red-400 font-bold">データの取得に失敗しました</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || data.length === 0) {
    return (
      <div className="w-full bg-[#131b23] border border-[#233648] rounded overflow-hidden" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-[#92adc9] animate-pulse">チャートデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <ChartTooltip 
        visible={tooltipVisible} 
        data={tooltipData} 
        pos={tooltipPos} 
        containerWidth={containerWidth} 
      />
      <div ref={chartContainerRef} className="w-full h-full" data-testid="line-chart" />
      <canvas
        ref={wallCanvasRef}
        className="absolute top-0 right-0 pointer-events-none"
        width={containerWidth}
        height={height}
        style={{ zIndex: 10 }}
      />
    </div>
  );
});
