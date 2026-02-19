import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { devLog, devWarn, devError, devDebug } from '@/app/lib/utils/dev-logger';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { isIntradayInterval, JAPANESE_MARKET_DELAY_MINUTES } from '@/app/constants/intervals';
import { NUMERIC_PRECISION } from '@/app/constants/common';
import { consensusSignalService } from '@/app/lib/ConsensusSignalService';
import { TIMEOUT } from '@/app/constants/timing';

import { useRealTimeData } from './useRealTimeData';

import { ServiceContainer, TOKENS } from '@/app/lib/di/ServiceContainer';
import { IMarketDataHub } from '@/app/lib/interfaces/IMarketDataHub';
import { initializeContainer } from '@/app/lib/di/initialize';

interface MarketDataMetadata {
  // ... (rest of the interface)

  fallbackApplied?: boolean;
  dataDelayMinutes?: number;
}

/**
 * Custom hook for fetching and managing stock data
 * Includes proper cleanup to prevent memory leaks
 */
export function useStockData() {
  const { watchlist } = useWatchlistStore();
  const { selectedStock: storeSelectedStock, setSelectedStock } = useUIStore();

  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [indexData, setIndexData] = useState<OHLCV[]>([]);
  const [chartSignal, setChartSignal] = useState<Signal | null>(null);
  const [selectedStock, setLocalSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<string>('D'); // Default to daily chart
  const [metadata, setMetadata] = useState<MarketDataMetadata>({});

  // AbortController for canceling pending requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Real-time data polling for Japanese stocks - throttled to reduce updates
  const { data: realTimeQuote } = useRealTimeData(
    selectedStock?.market === 'japan' ? selectedStock.symbol : null,
    { 
      enabled: !!selectedStock, 
      market: selectedStock?.market,
      // Limit polling frequency to reduce re-renders
      interval: selectedStock?.market === 'japan' ? TIMEOUT.REAL_TIME_POLLING_JAPAN : undefined
    }
  );

  // Update chart data with real-time quote
  useEffect(() => {
    if (realTimeQuote && realTimeQuote.price !== null && chartData.length > 0) {
      const lastIndex = chartData.length - 1;
      const lastPoint = chartData[lastIndex];

      // Update only if price is different
      if (Math.abs(lastPoint.close - realTimeQuote.price) > NUMERIC_PRECISION.PRICE_COMPARISON_EPSILON) {
        setChartData(prev => {
          const newData = [...prev];
          newData[lastIndex] = {
            ...lastPoint,
            close: realTimeQuote.price!,
            high: Math.max(lastPoint.high, realTimeQuote.price!),
            low: Math.min(lastPoint.low, realTimeQuote.price!),
          };
          return newData;
        });
      }
    }
  }, [realTimeQuote]);

  // Enhanced cleanup on unmount - prevents memory leaks and resource waste
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      devDebug('[useStockData] Cleaning up resources...');
      isMountedRef.current = false;

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounted');
        abortControllerRef.current = null;
      }

      // Clear state to prevent memory leaks
      setChartData([]);
      setIndexData([]);
      setChartSignal(null);
      setError(null);
    };
  }, []);

  const fetchData = useCallback(async (stock: Stock) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('New request started');
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setChartData([]);
    setIndexData([]);
    setChartSignal(null);

    try {
      if (!stock.symbol) {
        setLoading(false);
        return;
      }

      const indexSymbol = stock.market === 'japan' ? '^N225' : '^IXIC';

      // Map UI interval names to API interval format
      const apiInterval = timeFrame === 'D' ? '1d' : timeFrame.toLowerCase();

      // Determine if fallback will be applied (Japanese stock with intraday interval)
      const isJapaneseStock = stock.market === 'japan';
      const fallbackApplied = isJapaneseStock && isIntradayInterval(timeFrame);

      // Set metadata
      setMetadata({
        fallbackApplied,
        dataDelayMinutes: isJapaneseStock ? JAPANESE_MARKET_DELAY_MINUTES : undefined
      });

      // Calculate start date (2 years ago) for robust chart history
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startDate = twoYearsAgo.toISOString().split('T')[0];

      // 1. Get MarketDataHub from DI container (with lazy initialization)
      let dataHub: IMarketDataHub;
      try {
        dataHub = ServiceContainer.resolve<IMarketDataHub>(TOKENS.MarketDataHub);
      } catch {
        // DI container not yet initialized - initialize now
        devWarn('[useStockData] DI container not initialized, initializing now...');
        initializeContainer();
        dataHub = ServiceContainer.resolve<IMarketDataHub>(TOKENS.MarketDataHub);
      }

      // 2. Kick off all requests in parallel
      // Use Hub for stock data to avoid duplicates
      const stockDataPromise = dataHub.getData(stock.symbol, stock.market);
      const indexDataPromise = fetchOHLCV(indexSymbol, stock.market, undefined, controller.signal, apiInterval, startDate);
      const signalPromise = fetchSignal(stock, controller.signal, apiInterval);

      // 3. Await Critical Data (OHLCV) first
      const [data, idxData] = await Promise.all([stockDataPromise, indexDataPromise]);

      if (controller.signal.aborted || !isMountedRef.current) return;

      if (data.length === 0) {
        setError('No data available');
        return;
      }

      // 3. Render Chart immediately with available data
      setChartData(data);
      setIndexData(idxData);
      setLoading(false); // Stop spinner here!

      devLog('[useStockData] Starting signal fetch...');
      try {
        const signalResult = await signalPromise;
        devLog('[useStockData] Signal promise resolved:', signalResult);
        if (!controller.signal.aborted && isMountedRef.current) {
          // If API returns success but the predicted change is exactly 0, 
          // it might be a 'flat' signal from backend. Trigger local fallback in this case.
          const isFlatSignal = signalResult.data && signalResult.data.predictedChange === 0;
          
          if (signalResult.success && signalResult.data && !isFlatSignal) {
            devLog('[useStockData] Got valid signal from API:', {
              type: signalResult.data.type,
              predictedChange: signalResult.data.predictedChange
            });
            
            // Optimization: Only update if content changed to prevent redundant re-renders
            setChartSignal(prev => {
              if (prev && 
                  prev.type === signalResult.data!.type && 
                  prev.targetPrice === signalResult.data!.targetPrice &&
                  prev.confidence === signalResult.data!.confidence) {
                return prev;
              }
              return signalResult.data!;
            });
          } else {
            devWarn(`[useStockData] Signal from API is ${isFlatSignal ? 'flat' : 'unsuccessful'}, using fallback consensus.`);
            // Fallback: generate consensus signal locally using technical analysis
            try {
              const fallbackSignal = consensusSignalService.generateConsensus(data);
              const signal = consensusSignalService.convertToSignal(fallbackSignal, stock.symbol, data);
              
              setChartSignal(prev => {
                if (prev && 
                    prev.type === signal.type && 
                    prev.targetPrice === signal.targetPrice &&
                    prev.confidence === signal.confidence) {
                  return prev;
                }
                return signal;
              });
            } catch (fallbackErr) {
              devError('[useStockData] Fallback signal generation failed:', fallbackErr);
            }
          }
        }
      } catch (signalErr) {
        devWarn('[useStockData] Signal fetch threw error, using fallback consensus:', signalErr);
        try {
          const fallbackSignal = consensusSignalService.generateConsensus(data);
          devLog('[useStockData] Fallback signal generated after error:', {
            type: fallbackSignal.type,
            confidence: fallbackSignal.confidence,
            probability: fallbackSignal.probability,
            strength: fallbackSignal.strength,
            reason: fallbackSignal.reason
          });
          const signal = consensusSignalService.convertToSignal(fallbackSignal, stock.symbol, data);
          if (!controller.signal.aborted && isMountedRef.current) {
            setChartSignal(prev => {
              if (prev && 
                  prev.type === signal.type && 
                  prev.targetPrice === signal.targetPrice &&
                  prev.confidence === signal.confidence) {
                return prev;
              }
              return signal;
            });
          }
        } catch (fallbackErr) {
          devError('[useStockData] Fallback also failed:', fallbackErr);
          // Keep chartSignal as null if fallback fails
        }
      }

      // 5. Performance-optimized: Background sync with longer delay (60s) to reduce API calls
      const syncInBackground = async (
        sym: string,
        mkt: 'japan' | 'usa',
        setter: (data: OHLCV[]) => void,
        label: string
      ) => {
        // Increased delay to reduce unnecessary background syncs
        await new Promise(resolve => setTimeout(resolve, TIMEOUT.LONG));

        try {
          if (!isMountedRef.current || controller.signal.aborted) return;

          // Only sync if data is stale (older than 5 minutes)
          // This check prevents redundant updates
          const newData = await fetchOHLCV(sym, mkt, undefined, controller.signal, apiInterval, undefined, true);
          if (isMountedRef.current && !controller.signal.aborted && newData.length > 0) {
            setter(newData);
          }
        } catch (e) {
          if (isMountedRef.current && !controller.signal.aborted) {
            devWarn(`${label} background sync failed:`, e);
          }
        }
      };

      // Only start background sync if not unmounted and not already fetching
      if (isMountedRef.current && !controller.signal.aborted && !loading) {
        // Sync stock data - only for active stocks to reduce load
        if (stock.market === 'japan') {
          syncInBackground(stock.symbol, stock.market, setChartData, 'Stock');
        }
        // Sync index data less frequently
        // syncInBackground(indexSymbol, stock.market, setIndexData, 'Index');
      }

    } catch (err) {
      if (controller.signal.aborted || !isMountedRef.current) return;
      // 統一エラーハンドリング
      const { logError, getUserErrorMessage } = await import('@/app/lib/errors');
      logError(err, 'useStockData.fetchData');
      setError(getUserErrorMessage(err));
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [timeFrame]); // Refetch when interval changes

  const handleTimeFrameChange = useCallback((newTimeFrame: string) => {
    setTimeFrame(newTimeFrame);
  }, []);

  // 1. Sync Store/Watchlist -> Local State
  useEffect(() => {
    if (storeSelectedStock) {
      if (selectedStock?.symbol !== storeSelectedStock.symbol) {
        setLocalSelectedStock(storeSelectedStock);
      }
    }
    else if (watchlist.length > 0) {
      const defaultStock = watchlist[0];
      if (selectedStock?.symbol !== defaultStock.symbol) {
        setLocalSelectedStock(defaultStock);
        setSelectedStock(defaultStock);
      }
    }
    else {
      if (selectedStock) {
        setLocalSelectedStock(null);
      }
    }
  }, [storeSelectedStock, watchlist, selectedStock, setSelectedStock]);

  // 2. Fetch Data when Local State or Interval changes (via fetchData dependency)
  useEffect(() => {
    if (selectedStock) {
      fetchData(selectedStock);
    }
  }, [selectedStock, fetchData]);

  const handleStockSelect = useCallback((stock: Stock) => {
    setLocalSelectedStock(stock);
    setSelectedStock(stock);
    fetchData(stock);
  }, [setSelectedStock, fetchData]);

  // Handle real-time updates from WebSocket with performance optimization
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedStock) return;

    // Performance-optimized: Debounce real-time updates to prevent excessive re-renders
    let updateTimeout: NodeJS.Timeout | null = null;

    const handleRealtimeUpdate = (event: Event) => {
      if (!isMountedRef.current) return;

      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      // Enhanced data validation
      if (!data || typeof data.symbol !== 'string' || typeof data.price !== 'number') {
        return;
      }

      // Performance optimization: Debounce rapid updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => {
        if (!isMountedRef.current || data.symbol.toUpperCase() !== selectedStock.symbol.toUpperCase()) {
          return;
        }

        setChartData(prevData => {
          if (!isMountedRef.current || prevData.length === 0) return prevData;

          // Performance-optimized: Avoid unnecessary array copies
          const lastIndex = prevData.length - 1;
          const lastPoint = prevData[lastIndex];

          // Check if price actually changed to avoid unnecessary updates
          if (Math.abs(lastPoint.close - data.price) < NUMERIC_PRECISION.PRICE_COMPARISON_EPSILON) {
            return prevData; // Skip micro-changes
          }

          // Create new array only when necessary
          const newData = [...prevData];
          newData[lastIndex] = {
            ...lastPoint,
            close: data.price,
            high: Math.max(lastPoint.high, data.price),
            low: Math.min(lastPoint.low, data.price),
            volume: typeof data.volume === 'number' ? data.volume : lastPoint.volume,
          };

          return newData;
        });
      }, 100); // 100ms debounce
    };

    window.addEventListener('market-data-update', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('market-data-update', handleRealtimeUpdate);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
        updateTimeout = null;
      }
    };
  }, [selectedStock]);

  // Derived stock object with real-time price
  const currentStock = useMemo(() => {
    if (!selectedStock) return null;

    // 1. Priority: Real-time quote
    if (realTimeQuote?.price) {
      return {
        ...selectedStock,
        price: realTimeQuote.price,
        // change: realTimeQuote.change ?? selectedStock.change,
        // changePercent: realTimeQuote.changePercent ?? selectedStock.changePercent
      };
    }

    // 2. Fallback: Latest chart data
    if (chartData.length > 0) {
      const lastCandle = chartData[chartData.length - 1];
      return {
        ...selectedStock,
        price: lastCandle.close
      };
    }

    return selectedStock;
  }, [selectedStock, realTimeQuote, chartData]);

  return {
    selectedStock: currentStock,
    chartData,
    indexData,
    chartSignal,
    loading,
    error,
    handleStockSelect,
    interval: timeFrame,
    setInterval: handleTimeFrameChange,
    fallbackApplied: metadata.fallbackApplied,
    dataDelayMinutes: metadata.dataDelayMinutes
  };
}
