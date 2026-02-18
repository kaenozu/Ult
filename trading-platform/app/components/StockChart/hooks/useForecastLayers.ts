import { useMemo, useRef, useState, useEffect } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { GHOST_FORECAST, FORECAST_CONE, OPTIMIZATION } from '@/app/constants';

interface UseForecastLayersProps {
  data: OHLCV[];
  extendedData: { labels: string[]; prices: number[] };
  signal: Signal | null;
  market: 'japan' | 'usa';
  hoveredIdx: number | null;
  accuracyData?: {
    predictionError: number;
  } | null;
  preCalculatedIndicators?: {
    rsi: Map<number, number[]>;
    sma: Map<number, number[]>;
    atr: number[];
  };
}

// Cache for ghost forecast calculations to avoid redundant analyzeStock calls
interface GhostForecastCache {
  idx: number;
  result: {
    targetArr: number[];
    stopArr: number[];
    color: string;
  } | null;
  dataLength: number;
  dataHash: string;
}

// Quantization step for hover index to reduce calculation frequency
const HOVER_QUANTIZATION_STEP = 25;

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 30;

/**
 * 	Forecast layer hook
 */
export const useForecastLayers = ({
  data,
  extendedData,
  signal,
  market,
  hoveredIdx,
  accuracyData = null,
  preCalculatedIndicators
}: UseForecastLayersProps) => {

  // 1. AI Forecast Cone (latest prediction display)
  const forecastDatasets = useMemo(() => {
    if (!signal || !signal.targetPrice || data.length === 0) return [];

    const lastIdx = data.length - 1;
    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    // Form a cone from the current point into the future
    const currentPrice = data[lastIdx].close;
    const predictionError = accuracyData?.predictionError || 1.0;
    
    // Adjust width based on signal confidence and past errors
    const spreadMultiplier = (1.5 - (signal.confidence / 100)) * predictionError;
    const stockATR = signal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);

    targetArr[lastIdx] = currentPrice;
    stopArr[lastIdx] = currentPrice;

    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      const idx = lastIdx + i;
      if (idx < extendedData.labels.length) {
        const timeRatio = i / FORECAST_CONE.STEPS;
        const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * spreadMultiplier;
        
        targetArr[idx] = centerPrice + spread;
        stopArr[idx] = centerPrice - spread;
      }
    }

    const color = signal.type === 'BUY' ? '34, 197, 94' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
    
    return [
      {
        label: 'Forecast Range (Upper)',
        data: targetArr,
        borderColor: `rgba(${color}, 0.3)`,
        backgroundColor: `rgba(${color}, 0.1)`,
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: '+1',
        order: -1
      },
      {
        label: 'Forecast Range (Lower)',
        data: stopArr,
        borderColor: `rgba(${color}, 0.3)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -1
      }
    ];
  }, [signal, data, extendedData.labels, accuracyData]);

  // Cache for ghost forecast calculations - kept in state to avoid ref access during render
  const ghostCacheRef = useRef<Map<number, GhostForecastCache>>(new Map());
  const [ghostForecastDatasets, setGhostForecastDatasets] = useState<Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    borderWidth: number;
    borderDash?: number[];
    pointRadius: number;
    fill: boolean | string;
    order: number;
  }>>([]);

  // 2. AI Time Travel: Ghost Cloud (past prediction reproduction)
  // Performance Optimization: Quantize hover index and cache results
  // React 19 Compliance: Moved cache operations to useEffect to avoid ref access during render
  useEffect(() => {
    if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) {
      setGhostForecastDatasets([]);
      return;
    }

    // Quantize the hover index to reduce calculation frequency
    const quantizedIdx = Math.floor(hoveredIdx / HOVER_QUANTIZATION_STEP) * HOVER_QUANTIZATION_STEP;
    
    // Create a simple hash based on data content for cache validation
    const dataHash = `${data.length}-${data[0]?.symbol}-${quantizedIdx}`;
    
    // Check cache first
    const cache = ghostCacheRef.current;
    const cachedEntry = cache.get(quantizedIdx);
    
    if (cachedEntry && 
        cachedEntry.dataLength === data.length && 
        cachedEntry.dataHash === dataHash &&
        cachedEntry.result) {
      // Cache hit - return cached result
      const { targetArr, stopArr, color } = cachedEntry.result;
      
      setGhostForecastDatasets([
        {
          label: 'Past Forecast (Upper)',
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
          label: 'Past Forecast (Lower)',
          data: stopArr,
          borderColor: `rgba(${color}, ${GHOST_FORECAST.STOP_ALPHA})`,
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: -2
        }
      ]);
      return;
    }

    // Cache miss - perform lightweight calculation
    const currentPrice = data[quantizedIdx].close;
    
    // Use pre-calculated indicators if available, otherwise use simple defaults
    let lastRSI = 50;
    let lastSMA = currentPrice;
    
    if (preCalculatedIndicators) {
      const rsiArr = preCalculatedIndicators.rsi.get(14) || [];
      const smaArr = preCalculatedIndicators.sma.get(20) || [];
      lastRSI = rsiArr[quantizedIdx] || 50;
      lastSMA = smaArr[quantizedIdx] || currentPrice;
    }
    
    // Simple signal determination without full analysis
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (currentPrice > lastSMA && lastRSI < 45) signalType = 'BUY';
    else if (currentPrice < lastSMA && lastRSI > 55) signalType = 'SELL';
    else if (currentPrice > lastSMA) signalType = 'BUY';
    else if (currentPrice < lastSMA) signalType = 'SELL';

    const targetArr = new Array(extendedData.labels.length).fill(NaN);
    const stopArr = new Array(extendedData.labels.length).fill(NaN);

    const stockATR = preCalculatedIndicators?.atr?.[quantizedIdx] || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
    const confidenceFactor = 0.5;
    const momentum = signalType === 'BUY' ? 0.02 : signalType === 'SELL' ? -0.02 : 0;

    targetArr[quantizedIdx] = currentPrice;
    stopArr[quantizedIdx] = currentPrice;

    for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
      if (quantizedIdx + i < extendedData.labels.length) {
        const timeRatio = i / FORECAST_CONE.STEPS;
        const centerPrice = currentPrice * (1 + (momentum * timeRatio));
        const spread = (stockATR * timeRatio) * confidenceFactor;
        targetArr[quantizedIdx + i] = centerPrice + spread;
        stopArr[quantizedIdx + i] = centerPrice - spread;
      }
    }

    const color = signalType === 'BUY' ? '34, 197, 94' : signalType === 'SELL' ? '239, 68, 68' : '100, 116, 139';
    
    // Store in cache with LRU eviction
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }
    
    cache.set(quantizedIdx, {
      idx: quantizedIdx,
      result: { targetArr, stopArr, color },
      dataLength: data.length,
      dataHash
    });

    setGhostForecastDatasets([
      {
        label: 'Past Forecast (Upper)',
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
        label: 'Past Forecast (Lower)',
        data: stopArr,
        borderColor: `rgba(${color}, ${GHOST_FORECAST.STOP_ALPHA})`,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        order: -2
      }
    ]);
  }, [hoveredIdx, data, extendedData.labels.length, preCalculatedIndicators]);

  return { ghostForecastDatasets, forecastDatasets };
};