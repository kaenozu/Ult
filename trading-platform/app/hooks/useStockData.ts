import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { useUIStore } from '@/app/store/uiStore';

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
  const [interval, setInterval] = useState<string>('5m'); // Add interval state

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
      // Parallel execution for Stock Data, Index Data, and Signals
      const indexSymbol = stock.market === 'japan' ? '^N225' : '^IXIC';

      // Map UI interval names to API interval format
      const apiInterval = interval === 'D' ? '1d' : interval.toLowerCase();

      const [data, idxData, signalData] = await Promise.all([
        fetchOHLCV(stock.symbol, stock.market, stock.price, controller.signal, apiInterval),
        fetchOHLCV(indexSymbol, stock.market, undefined, controller.signal, apiInterval),
        fetchSignal(stock, controller.signal, apiInterval)
      ]);

      if (controller.signal.aborted || !isMountedRef.current) return;

      if (data.length === 0) {
        setError('No data available');
        return;
      }

      setChartData(data);
      setIndexData(idxData);
      setChartSignal(signalData);

      // 4. Background sync for long-term data (keep independent)
      // This is for background calculations, so we don't await it
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
  }, [interval]); // Add interval dependency so it refetches when interval changes

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInterval(newInterval);
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
    interval,
    setInterval: handleIntervalChange
  };
}
