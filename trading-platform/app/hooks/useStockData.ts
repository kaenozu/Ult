import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';
import { isIntradayInterval, JAPANESE_MARKET_DELAY_MINUTES } from '@/app/lib/constants/intervals';
import { consensusSignalService } from '@/app/lib/ConsensusSignalService';

interface MarketDataMetadata {
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

  // Cleanup on unmount - prevents memory leaks
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchData = useCallback(async (stock: Stock) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

      // 1. Kick off all requests in parallel
      const stockDataPromise = fetchOHLCV(stock.symbol, stock.market, stock.price, controller.signal, apiInterval, startDate);
      const indexDataPromise = fetchOHLCV(indexSymbol, stock.market, undefined, controller.signal, apiInterval, startDate);
      const signalPromise = fetchSignal(stock, controller.signal, apiInterval);

      // 2. Await Critical Data (OHLCV) first
      // We use Promise.all for stock and index because the chart needs both to render relative comparison properly
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

      console.log('[useStockData] Starting signal fetch...');
      try {
        const signalResult = await signalPromise;
        console.log('[useStockData] Signal promise resolved:', signalResult);
        if (!controller.signal.aborted && isMountedRef.current) {
          if (signalResult.success && signalResult.data) {
            console.log('[useStockData] Got signal from API:', {
              type: signalResult.data.type,
              confidence: signalResult.data.confidence,
              accuracy: signalResult.data.accuracy,
              targetPrice: signalResult.data.targetPrice,
              forecastCone: !!signalResult.data.forecastCone
            });
            setChartSignal(signalResult.data);
          } else {
            console.warn('[useStockData] Signal fetch returned unsuccessful:', signalResult.error);
            // Fallback: generate consensus signal locally using technical analysis
            try {
              const fallbackSignal = consensusSignalService.generateConsensus(data);
              console.log('[useStockData] Fallback signal generated:', {
                type: fallbackSignal.type,
                confidence: fallbackSignal.confidence,
                probability: fallbackSignal.probability,
                strength: fallbackSignal.strength,
                reason: fallbackSignal.reason
              });
              // Convert ConsensusSignal to Signal
              const signal = consensusSignalService.convertToSignal(fallbackSignal, stock.symbol, data);
              setChartSignal(signal);
            } catch (fallbackErr) {
              console.error('[useStockData] Fallback signal generation failed:', fallbackErr);
            }
          }
        }
      } catch (signalErr) {
        console.warn('[useStockData] Signal fetch threw error, using fallback consensus:', signalErr);
        try {
          const fallbackSignal = consensusSignalService.generateConsensus(data);
          console.log('[useStockData] Fallback signal generated after error:', {
            type: fallbackSignal.type,
            confidence: fallbackSignal.confidence,
            probability: fallbackSignal.probability,
            strength: fallbackSignal.strength,
            reason: fallbackSignal.reason
          });
          const signal = consensusSignalService.convertToSignal(fallbackSignal, stock.symbol, data);
          if (!controller.signal.aborted && isMountedRef.current) {
            setChartSignal(signal);
          }
        } catch (fallbackErr) {
          console.error('[useStockData] Fallback also failed:', fallbackErr);
          // Keep chartSignal as null if fallback fails
        }
      }

      // 5. Background sync for long-term data (keep independent)
      const syncInBackground = async (
        sym: string,
        mkt: 'japan' | 'usa',
        setter: (data: OHLCV[]) => void,
        label: string
      ) => {
        try {
          const newData = await fetchOHLCV(sym, mkt, undefined, controller.signal, apiInterval, undefined, true);
          if (isMountedRef.current && !controller.signal.aborted && newData.length > 0) {
            setter(newData);
          }
        } catch (e) {
          if (isMountedRef.current && !controller.signal.aborted) {
            console.warn(`${label} background sync failed:`, e);
          }
        }
      };

      // Sync stock data
      syncInBackground(stock.symbol, stock.market, setChartData, 'Stock');
      // Sync index data
      syncInBackground(indexSymbol, stock.market, setIndexData, 'Index');

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
  }, [timeFrame]); // Add timeFrame dependency so it refetches when interval changes

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

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRealtimeUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;

      // Basic data validation
      if (!data || typeof data.symbol !== 'string' || typeof data.price !== 'number') {
        return;
      }

      if (selectedStock && data.symbol.toUpperCase() === selectedStock.symbol.toUpperCase()) {
        setChartData(prevData => {
          if (prevData.length === 0) return prevData;
          
          const newData = [...prevData];
          const lastIndex = newData.length - 1;
          const lastPoint = newData[lastIndex];
          
          // Update the last data point with real-time price
          // In a real implementation, we might check timestamps to see if we need a new candle
          newData[lastIndex] = {
            ...lastPoint,
            close: data.price,
            high: Math.max(lastPoint.high, data.price),
            low: Math.min(lastPoint.low, data.price),
            volume: typeof data.volume === 'number' ? data.volume : lastPoint.volume,
          };
          
          return newData;
        });
      }
    };

    window.addEventListener('market-data-update', handleRealtimeUpdate);
    return () => window.removeEventListener('market-data-update', handleRealtimeUpdate);
  }, [selectedStock]);

  return {
    selectedStock,
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
