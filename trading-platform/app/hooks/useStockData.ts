import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useTradingStore } from '@/app/store/tradingStore';

/**
 * Custom hook for fetching and managing stock data
 * Includes proper cleanup to prevent memory leaks
 */
export function useStockData() {
  const { watchlist, selectedStock: storeSelectedStock, setSelectedStock } = useTradingStore();
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [indexData, setIndexData] = useState<OHLCV[]>([]);
  const [chartSignal, setChartSignal] = useState<Signal | null>(null);
  const [selectedStock, setLocalSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // 1. 個別銘柄のデータ取得
      const data = await fetchOHLCV(stock.symbol, stock.market, stock.price);
      if (controller.signal.aborted || !isMountedRef.current) return;

      if (data.length === 0) {
        setError('No data available');
        return;
      }
      setChartData(data);

      // 2. 市場指数のデータ取得 (重ね合わせ用)
      const indexSymbol = stock.market === 'japan' ? '^N225' : '^IXIC';
      const idxData = await fetchOHLCV(indexSymbol, stock.market);
      if (controller.signal.aborted || !isMountedRef.current) return;

      setIndexData(idxData);

      // 3. シグナル取得
      const signalData = await fetchSignal(stock);
      if (controller.signal.aborted || !isMountedRef.current) return;

      setChartSignal(signalData);

      // 4. 的中率計算用の長期データをバックグラウンドで同期
      // アンマウントされた後は実行しない
      fetchOHLCV(stock.symbol, stock.market).catch(e => {
        if (isMountedRef.current && !controller.signal.aborted) {
          console.warn('Background sync failed:', e);
        }
      });

    } catch (err) {
      if (controller.signal.aborted || !isMountedRef.current) return;
      console.error('Data fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      if (!controller.signal.aborted && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch data when selected stock or watchlist changes
  useEffect(() => {
    if (storeSelectedStock) {
      if (selectedStock?.symbol !== storeSelectedStock.symbol) {
        setLocalSelectedStock(storeSelectedStock);
        fetchData(storeSelectedStock);
      }
    }
    else if (watchlist.length > 0) {
      const defaultStock = watchlist[0];
      if (selectedStock?.symbol !== defaultStock.symbol) {
        setLocalSelectedStock(defaultStock);
        setSelectedStock(defaultStock);
        fetchData(defaultStock);
      }
    }
    else {
      if (selectedStock) {
        setLocalSelectedStock(null);
      }
    }
  }, [storeSelectedStock, watchlist, selectedStock, setSelectedStock, fetchData]);

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
    handleStockSelect
  };
}