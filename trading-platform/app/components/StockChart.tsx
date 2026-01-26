'use client';

import { useRef, useMemo, memo, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency, calculateSMA, calculateBollingerBands } from '@/app/lib/utils';
import { analyzeStock } from '@/app/lib/analysis';
import {
  VOLUME_PROFILE,
  GHOST_FORECAST,
  FORECAST_CONE,
  SMA as SMA_CONFIG,
  BOLLINGER_BANDS,
  CANDLESTICK,
  CHART_GRID,
  CHART_CONFIG,
  OPTIMIZATION,
} from '@/app/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// 需給の壁 (Volume Profile) Plugin
const volumeProfilePlugin = {
  id: 'volumeProfile',
  afterDatasetsDraw: (chart: any, args: unknown, options: any) => {
    if (!options.enabled || !options.data || options.data.length === 0) return;

    const { ctx, chartArea: { right, width, top, bottom } } = chart;
    const yAxis = chart.scales.y;
    const currentPrice = options.currentPrice;

    ctx.save();
    // Disable shadow for cleaner look
    ctx.shadowBlur = 0;

    options.data.forEach((wall: any) => {
      const yPos = yAxis.getPixelForValue(wall.price);
      if (yPos < top || yPos > bottom) return;

      const isAbove = wall.price > currentPrice;
      const color = isAbove ? '239, 68, 68' : '34, 197, 94';
      const barWidth = width * VOLUME_PROFILE.MAX_BAR_WIDTH_RATIO * wall.strength;
      const barHeight = (bottom - top) / VOLUME_PROFILE.HEIGHT_DIVISOR;

      // Draw smooth, semi-transparent bars
      const gradient = ctx.createLinearGradient(right - barWidth, 0, right, 0);
      gradient.addColorStop(0, `rgba(${color}, 0)`);
      gradient.addColorStop(1, `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA + wall.strength * VOLUME_PROFILE.STRENGTH_ALPHA_ADD})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(right - barWidth, yPos - barHeight / 2, barWidth, barHeight);

      // Draw very thin indicator line at the right edge
      ctx.fillStyle = `rgba(${color}, ${VOLUME_PROFILE.BASE_ALPHA})`;
      ctx.fillRect(right - 2, yPos - barHeight / 2, 2, barHeight);
    });
    ctx.restore();
  }
};

ChartJS.register(volumeProfilePlugin);

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
}

export const StockChart = memo(function StockChart({
  data, indexData = [], height = 400, showVolume = true, showSMA = true, showBollinger = false, loading = false, error = null, market = 'usa', signal = null,
}: StockChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [hoveredIdx, setHoveredIndex] = useState<number | null>(null);

  // 1. 基本データと未来予測用のラベル拡張
  const extendedData = useMemo(() => {
    const labels = data.map(d => d.date);
    const prices = data.map(d => d.close);
    if (signal && data.length > 0) {
      const lastDate = new Date(data[data.length - 1].date);
      for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
        const future = new Date(lastDate);
        future.setDate(lastDate.getDate() + i);
        labels.push(future.toISOString().split('T')[0]);
        prices.push(NaN);
      }
    }
    return { labels, prices };
  }, [data, signal]);

  // 1.5 市場指数の正規化 (Normalizing Index to Stock scale)
  const normalizedIndexData = useMemo(() => {
    if (!indexData || indexData.length < 10 || data.length === 0) return [];
    
    // 表示期間の開始価格を基準に倍率を計算
    const stockStartPrice = data[0].close;
    // indexDataからdata[0].dateに最も近い日の価格を探す
    const targetDate = data[0].date;
    const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
    const indexStartPrice = indexStartPoint.close;
    
    const ratio = stockStartPrice / indexStartPrice;
    
    // data[i].date に合わせて indexData をマッピング
    return extendedData.labels.map(label => {
      const idxPoint = indexData.find(d => d.date === label);
      return idxPoint ? idxPoint.close * ratio : NaN;
    });
  }, [data, indexData, extendedData.labels]);

  const sma20 = useMemo(() => calculateSMA(extendedData.prices, SMA_CONFIG.SHORT_PERIOD), [extendedData.prices]);
  const { upper, lower } = useMemo(() =>
    calculateBollingerBands(extendedData.prices, SMA_CONFIG.SHORT_PERIOD, BOLLINGER_BANDS.STD_DEVIATION),
    [extendedData.prices]
  );

  // 2. AI Time Travel: Ghost Cloud (過去の予測再現)
  const ghostForecastDatasets = useMemo(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) return [];
    const pastSignal = analyzeStock(data[0].symbol || '', data.slice(0, hoveredIdx + 1), market);
    if (!pastSignal) return [];

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);
    const currentPrice = data[hoveredIdx].close;
    targetArr[hoveredIdx] = stopArr[hoveredIdx] = currentPrice;

    const stockATR = pastSignal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    const confidenceFactor = (110 - pastSignal.confidence) / 100;
    const momentum = pastSignal.predictedChange / 100;

    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      if (hoveredIdx + i < extendedData.labels.length) {
        const timeRatio = i / FORECAST_CONE.STEPS;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[hoveredIdx + i] = centerPrice + spread;
        stopArr[hoveredIdx + i] = centerPrice - spread;
      }
    }

    const color = pastSignal.type === 'BUY' ? '34, 197, 94' : pastSignal.type === 'SELL' ? '239, 68, 68' : '100, 116, 139';
    return [
      {
        label: '過去予測(上)',
        data: targetArr,
        borderColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_ALPHA})`,
        backgroundColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_FILL_ALPHA})`,
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        fill: '+1',
        order: -2
      },
      {
        label: '過去予測(下)',
        data: stopArr,
        borderColor: `rgba(${color}, ${GHOST_FORECAST.STOP_ALPHA})`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -2
      }
    ];
  }, [hoveredIdx, data, market, extendedData.labels.length]);

  // 4. 未来予測の予報円 (Forecast Cone)
  const forecastDatasets = useMemo(() => {
    if (!signal || data.length === 0) return [];
    const lastIdx = data.length - 1;
    const currentPrice = data[lastIdx].close;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    const stockATR = signal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    const confidenceFactor = (110 - signal.confidence) / 100;
    const momentum = signal.predictedChange / 100;

    targetArr[lastIdx] = stopArr[lastIdx] = currentPrice;
    const steps = FORECAST_CONE.STEPS;
    for (let i = 1; i <= steps; i++) {
      if (lastIdx + i < extendedData.labels.length) {
        const timeRatio = i / steps;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[lastIdx + i] = centerPrice + spread;
        stopArr[lastIdx + i] = centerPrice - spread;
      }
    }

    const color = signal.type === 'BUY' ? '16, 185, 129' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    return [
      {
        label: 'ターゲット',
        data: targetArr,
        borderColor: `rgba(${color}, 0.8)`,
        backgroundColor: `rgba(${color}, 0.25)`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: '+1',
        order: -1
      },
      {
        label: 'リスク',
        data: stopArr,
        borderColor: `rgba(${color}, 0.4)`,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: -1
      }
    ];
  }, [signal, data, extendedData]);

  const chartData = useMemo(() => ({
    labels: extendedData.labels,
    datasets: [
      {
        label: market === 'japan' ? '日経平均 (相対)' : 'NASDAQ (相対)',
        data: normalizedIndexData,
        borderColor: '#60a5fa',  // 明るい青（ダークテーマ用）
        backgroundColor: 'rgba(96, 165, 250, 0.05)',
        fill: false,  // 塗りつぶしを無効化（線のみ表示）
        pointRadius: 0,
        borderWidth: 1,
        tension: CHART_CONFIG.TENSION,
        order: 10 // 最背面に配置
      },
      {
        label: '現在価格',
        data: extendedData.prices,
        borderColor: '#10b981',  // 明るい緑（ダークテーマ用）
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,  // 塗りつぶしを無効化（線のみ表示）
        tension: CHART_CONFIG.TENSION,
        pointRadius: 0,
        pointHoverRadius: CANDLESTICK.HOVER_RADIUS,
        borderWidth: 2,
        order: 1
      },
      ...forecastDatasets,
      ...ghostForecastDatasets,
      ...(showSMA ? [{
        label: `SMA (${SMA_CONFIG.SHORT_PERIOD})`,
        data: sma20,
        borderColor: SMA_CONFIG.COLOR,
        borderWidth: SMA_CONFIG.LINE_WIDTH,
        pointRadius: 0,
        tension: CHART_CONFIG.TENSION,
        fill: false,
        order: 2
      }] : []),
      ...(showBollinger ? [
        {
          label: 'BB Upper',
          data: upper,
          borderColor: BOLLINGER_BANDS.UPPER_COLOR,
          backgroundColor: BOLLINGER_BANDS.UPPER_BACKGROUND,
          borderWidth: 1,
          pointRadius: 0,
          tension: CHART_CONFIG.TENSION,
          fill: '+1',
          order: 3
        },
        {
          label: 'BB Lower',
          data: lower,
          borderColor: BOLLINGER_BANDS.LOWER_COLOR,
          borderWidth: 1,
          pointRadius: 0,
          tension: CHART_CONFIG.TENSION,
          fill: false,
          order: 4
        }
      ] : []),
    ],
  }), [extendedData, sma20, upper, lower, showSMA, showBollinger, forecastDatasets, ghostForecastDatasets]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onHover: (_, elements) => setHoveredIndex(elements.length > 0 ? elements[0].index : null),
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#92adc9',
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 10,
        }
      },
      tooltip: { enabled: false },
      volumeProfile: {
        enabled: true,
        data: signal?.volumeResistance,
        currentPrice: data.length > 0 ? data[data.length - 1].close : 0
      }
    },
    scales: {
      x: {
        min: extendedData.labels.length > 105 ? extendedData.labels[extendedData.labels.length - 105] : undefined,
        grid: {
          color: (c: any) => c.index === hoveredIdx
            ? CHART_GRID.HOVER_COLOR
            : (c.index! >= data.length ? CHART_GRID.FUTURE_AREA_COLOR : CHART_GRID.MAIN_COLOR),
          lineWidth: (c: any) => c.index === hoveredIdx
            ? CHART_GRID.HOVER_LINE_WIDTH
            : (c.index === data.length - 1 ? CHART_GRID.CURRENT_PRICE_LINE_WIDTH : 1)
        },
        ticks: {
          color: (c: any) => c.index === hoveredIdx ? '#fff' : (c.index! >= data.length ? '#3b82f6' : '#92adc9'),
          maxTicksLimit: 15
        }
      },
      y: {
        // Y軸の範囲をデータ＋予報円に合わせて調整
        min: (() => {
          if (data.length === 0) return undefined;
          const dataMin = Math.min(...data.map(d => d.low));
          // 予報円の最小値も考慮
          const forecastMin = Math.min(...[
            ...(forecastDatasets.length > 0 ? forecastDatasets.flatMap(d => d.data).filter(v => !isNaN(v)) : []),
            ...(ghostForecastDatasets.length > 0 ? ghostForecastDatasets.flatMap(d => d.data).filter(v => !isNaN(v)) : [])
          ]);
          const allMin = Math.min(dataMin, forecastMin);
          return allMin * 0.99;
        })(),
        max: (() => {
          if (data.length === 0) return undefined;
          const dataMax = Math.max(...data.map(d => d.high));
          // 予報円の最大値も考慮
          const forecastMax = Math.max(...[
            ...(forecastDatasets.length > 0 ? forecastDatasets.flatMap(d => d.data).filter(v => !isNaN(v)) : []),
            ...(ghostForecastDatasets.length > 0 ? ghostForecastDatasets.flatMap(d => d.data).filter(v => !isNaN(v)) : [])
          ]);
          const allMax = Math.max(dataMax, forecastMax);
          return allMax * 1.01;
        })(),
        grid: { color: CHART_GRID.MAIN_COLOR },
        ticks: { color: '#92adc9', callback: (v) => formatCurrency(Number(v), market === 'japan' ? 'JPY' : 'USD') }
      }
    },
  }), [market, data.length, extendedData.labels, hoveredIdx]);

  if (error) return (
    <div className="relative w-full flex items-center justify-center bg-red-500/10 border border-red-500/50 rounded" style={{ height }}>
      <div className="text-center p-4">
        <p className="text-red-400 font-bold">データの取得に失敗しました</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    </div>
  );
  if (loading || data.length === 0) return (
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded animate-pulse" style={{ height }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-xs text-[#92adc9]">データを取得中...</p>
      </div>
    </div>
  );

  return (
    <div className="relative w-full group" style={{ height }}>
      {hoveredIdx !== null && hoveredIdx < data.length && (
        <div className="absolute top-2 left-2 z-20 bg-[#1a2632]/90 border border-[#233648] p-2 rounded shadow-xl pointer-events-none backdrop-blur-sm">
          <div className="text-[10px] font-black text-primary uppercase border-b border-[#233648] pb-1 mb-1">{extendedData.labels[hoveredIdx]}</div>
          <div className="text-xs font-bold text-white">{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
      {showVolume && (
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
          <Bar data={{
            labels: extendedData.labels,
            datasets: [{
              data: data.map(d => d.volume),
              backgroundColor: data.map((d, i) =>
                i === 0 || d.close >= data[i - 1].close ? CANDLESTICK.BULL_COLOR : CANDLESTICK.BEAR_COLOR
              )
            }]
          }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }} />
        </div>
      )}
    </div>
  );
});