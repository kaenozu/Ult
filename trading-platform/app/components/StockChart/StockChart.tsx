'use client';

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  ColorType,
  CrosshairMode,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { OHLCV, Signal } from '@/app/types';
import { SMA_CONFIG, GHOST_FORECAST, FORECAST_CONE } from '@/app/constants';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

export interface StockChartProps {
  data: OHLCV[];
  indexData?: OHLCV[];
  height?: number;
  showVolume?: boolean;
  showSMA?: boolean;
  showBollinger?: boolean;
  loading?: boolean;
  error?: string | null;
  market?: 'japan' | 'usa';
  signal?: Signal | null;
  accuracyData?: {
    hitRate: number;
    totalTrades: number;
    predictionError?: number;
    loading?: boolean;
  } | null;
}

interface TooltipData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma?: number;
}

export const StockChart = memo(function StockChart({
  data,
  indexData: _indexData = [],
  height = 400,
  showVolume = true,
  showSMA = true,
  showBollinger = false,
  loading = false,
  error = null,
  market: _market = 'usa',
  signal = null,
  accuracyData = null,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperBandRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerBandRef = useRef<ISeriesApi<'Line'> | null>(null);
  const forecastUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const forecastLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const convertToLWCData = useCallback((ohlcv: OHLCV[]): CandlestickData<Time>[] => {
    return ohlcv.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, []);

  const convertToVolumeData = useCallback((ohlcv: OHLCV[]): HistogramData<Time>[] => {
    return ohlcv.map((d) => ({
      time: d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
  }, []);

  const calculateSMA = useCallback((data: OHLCV[], period: number): LineData<Time>[] => {
    const result: LineData<Time>[] = [];
    if (data.length < period) return [];
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({
        time: data[i].date as Time,
        value: sum / period,
      });
    }
    return result;
  }, []);

  const calculateBollingerBands = useCallback((
    data: OHLCV[],
    period: number,
    stdDev: number
  ): { upper: LineData<Time>[]; lower: LineData<Time>[] } => {
    // Optimized implementation using technicalIndicatorService (O(N) instead of O(N*P))
    if (data.length < period) return { upper: [], lower: [] };

    // Convert to simple price array for the service (minimizing overhead)
    const len = data.length;
    const prices = new Array(len);
    for (let i = 0; i < len; i++) {
      prices[i] = data[i].close;
    }

    const { upper, lower } = technicalIndicatorService.calculateBollingerBands(prices, period, stdDev);
    
    // Map back to LineData format, filtering out invalid values (NaN)
    const upperData: LineData<Time>[] = [];
    const lowerData: LineData<Time>[] = [];

    for (let i = 0; i < len; i++) {
      const u = upper[i];
      const l = lower[i];
      // Only push if valid. The service returns NaN for the first `period-1` points.
      if (!isNaN(u)) {
        const time = data[i].date as Time;
        upperData.push({ time, value: u });
        lowerData.push({ time, value: l });
      }
    }

    return { upper: upperData, lower: lowerData };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });
    candleSeriesRef.current = candleSeries as unknown as ISeriesApi<'Candlestick'>;

    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries as unknown as ISeriesApi<'Histogram'>;
    }

    if (showSMA) {
      const smaSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
      });
      smaSeriesRef.current = smaSeries as unknown as ISeriesApi<'Line'>;
    }

    if (showBollinger) {
      const upperBand = chart.addSeries(LineSeries, {
        color: 'rgba(147, 51, 234, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });
      const lowerBand = chart.addSeries(LineSeries, {
        color: 'rgba(147, 51, 234, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
      });
      upperBandRef.current = upperBand as unknown as ISeriesApi<'Line'>;
      lowerBandRef.current = lowerBand as unknown as ISeriesApi<'Line'>;
    }

    // Forecast cone series
    const forecastUpper = chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.8)',
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const forecastLower = chart.addSeries(LineSeries, {
      color: 'rgba(59, 130, 246, 0.8)',
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    forecastUpperRef.current = forecastUpper as unknown as ISeriesApi<'Line'>;
    forecastLowerRef.current = forecastLower as unknown as ISeriesApi<'Line'>;

    // AI Confidence Markers (Beginner Friendly Visuals)
    const markers: any[] = [];
    if (signal && signal.confidence >= 60) {
      const time = data[data.length - 1].date as Time;
      const isBuy = signal.type === 'BUY';
      
      markers.push({
        time: time,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#22c55e' : '#ef4444',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `AI確信度: ${signal.confidence}%`,
        size: 2, // Larger size for visibility
      });
      
      // Add a second marker for "Reasoning" if available
      if (signal.reason) {
         // Simplified reason for chart
         const simpleReason = signal.reason.split('。')[0];
         markers.push({
            time: time,
            position: isBuy ? 'belowBar' : 'aboveBar',
            color: '#fbbf24', // Yellow for info
            shape: 'circle',
            text: simpleReason.length > 10 ? simpleReason.substring(0, 10) + '...' : simpleReason,
            size: 0, // Hidden shape, just text label
         });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (candleSeries as any).setMarkers(markers);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltipVisible(false);
        return;
      }

      const candleData = param.seriesData.get(candleSeries) as CandlestickData;
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
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data.length, height, showVolume, showSMA, showBollinger]);

  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;
    
    const lwcData = convertToLWCData(data);
    candleSeriesRef.current.setData(lwcData);

    if (volumeSeriesRef.current && showVolume) {
      const volumeData = convertToVolumeData(data);
      volumeSeriesRef.current.setData(volumeData);
    }

    if (smaSeriesRef.current && showSMA) {
      const smaData = calculateSMA(data, SMA_CONFIG.MEDIUM_PERIOD || 20);
      smaSeriesRef.current.setData(smaData);
    }

    if (upperBandRef.current && lowerBandRef.current && showBollinger) {
      const { upper, lower } = calculateBollingerBands(data, 20, 2);
      upperBandRef.current.setData(upper);
      lowerBandRef.current.setData(lower);
    }

    if (signal && forecastUpperRef.current && forecastLowerRef.current) {
      const lastData = data[data.length - 1];
      const forecastSteps = Math.min(FORECAST_CONE.STEPS || 30, 30);
      const atr = signal.atr || lastData.close * (GHOST_FORECAST.DEFAULT_ATR_RATIO || 0.02);
      const spreadMultiplier = 3.0 * (accuracyData?.predictionError || 1.0);
      
      const forecastUpperData: LineData<Time>[] = [];
      const forecastLowerData: LineData<Time>[] = [];
      
      const baseDate = new Date(lastData.date);
      
      for (let i = 0; i <= forecastSteps; i++) {
        const timeRatio = i / forecastSteps;
        const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
        const centerPrice = lastData.close * (1 + momentum * timeRatio);
        const spread = atr * timeRatio * spreadMultiplier;
        
        const futureDate = new Date(baseDate);
        futureDate.setDate(futureDate.getDate() + i);
        const timeStr = futureDate.toISOString().split('T')[0] as Time;
        
        forecastUpperData.push({ time: timeStr, value: centerPrice + spread });
        forecastLowerData.push({ time: timeStr, value: centerPrice - spread });
      }
      
      forecastUpperRef.current.setData(forecastUpperData);
      forecastLowerRef.current.setData(forecastLowerData);
      
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    }

    // AI Confidence Markers
    const markers: any[] = [];
    if (signal && signal.confidence >= 60) {
      const time = data[data.length - 1].date as Time;
      const isBuy = signal.type === 'BUY';
      
      markers.push({
        time: time,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#22c55e' : '#ef4444',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `AI確信度: ${signal.confidence}%`,
        size: 2,
      });
      
      if (signal.reason) {
         const simpleReason = signal.reason.split('。')[0];
         markers.push({
            time: time,
            position: isBuy ? 'belowBar' : 'aboveBar',
            color: '#fbbf24',
            shape: 'circle',
            text: simpleReason.length > 10 ? simpleReason.substring(0, 10) + '...' : simpleReason,
            size: 0,
         });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (candleSeriesRef.current as any).setMarkers(markers);

  }, [data, signal, showVolume, showSMA, showBollinger, accuracyData, convertToLWCData, convertToVolumeData, calculateSMA, calculateBollingerBands]);

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
      {tooltipVisible && tooltipData && (
        <div
          className="absolute z-50 bg-[#1a2632] border border-[#233648] rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x + 10, (chartContainerRef.current?.clientWidth || 300) - 150),
            top: Math.max(tooltipPos.y - 100, 10),
          }}
        >
          <div className="text-xs text-[#92adc9] mb-1">{tooltipData.time}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-400">始:</span>
            <span className="text-white">¥{tooltipData.open.toLocaleString()}</span>
            <span className="text-gray-400">高:</span>
            <span className="text-green-400">¥{tooltipData.high.toLocaleString()}</span>
            <span className="text-gray-400">安:</span>
            <span className="text-red-400">¥{tooltipData.low.toLocaleString()}</span>
            <span className="text-gray-400">終:</span>
            <span className="text-white">¥{tooltipData.close.toLocaleString()}</span>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" data-testid="line-chart" />
    </div>
  );
});
