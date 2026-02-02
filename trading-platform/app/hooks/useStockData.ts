import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';

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
  const [timeFrame, setTimeFrame] = useState<string>('5m'); // Renamed from interval to avoid shadowing
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
      const indexSymbol = stock.market === 'japan' ? '^N225' : '^IXIC';

      // Map UI interval names to API interval format
      const apiInterval = timeFrame === 'D' ? '1d' : timeFrame.toLowerCase();

      // Determine if fallback will be applied (Japanese stock with intraday interval)
      const isJapaneseStock = stock.market === 'japan';
      const isIntradayInterval = ['1m', '5m', '15m', '1h', '4h'].includes(timeFrame);
      const fallbackApplied = isJapaneseStock && isIntradayInterval;

      // Set metadata
      setMetadata({
        fallbackApplied,
        dataDelayMinutes: isJapaneseStock ? 20 : undefined
      });

      // 1. Kick off all requests in parallel
      const stockDataPromise = fetchOHLCV(stock.symbol, stock.market, stock.price, controller.signal, apiInterval);
      const indexDataPromise = fetchOHLCV(indexSymbol, stock.market, undefined, controller.signal, apiInterval);
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

      // 4. Handle Signal (Non-blocking)
      try {
        const signalData = await signalPromise;
        if (!controller.signal.aborted && isMountedRef.current) {
          setChartSignal(signalData);
        }
      } catch (signalErr) {
        console.warn('Signal fetch failed (non-critical):', signalErr);
        // Do not set global error, just log. The user still has the chart.
      }

      // 5. Background sync for long-term data (keep independent)
      fetchOHLCV(stock.symbol, stock.market, undefined, controller.signal, apiInterval).catch(e => {
        if (isMountedRef.current && !controller.signal.aborted) {
          console.warn('Background sync failed:', e);
        }
      });

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
  }, [timeFrame, watchlist]); // Add timeFrame dependency so it refetches when interval changes

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
