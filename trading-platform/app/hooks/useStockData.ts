import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useTradingStore } from '@/app/store/tradingStore';

export function useStockData() {
  const { watchlist, selectedStock: storeSelectedStock, setSelectedStock } = useTradingStore();
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [indexData, setIndexData] = useState<OHLCV[]>([]);
  const [chartSignal, setChartSignal] = useState<Signal | null>(null);
  const [selectedStock, setLocalSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to watchlist for stable callbacks
  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  // AbortController for canceling pending requests on unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
      if (controller.signal.aborted) return;

      if (data.length === 0) {
        setError('No data available');
        return;
      }
      setChartData(data);

      // 2. 市場指数のデータ取得 (重ね合わせ用)
      const indexSymbol = stock.market === 'japan' ? '^N225' : '^IXIC';
      const idxData = await fetchOHLCV(indexSymbol, stock.market);
      if (controller.signal.aborted) return;

      setIndexData(idxData);

      // 3. シグナル取得
      const signalData = await fetchSignal(stock);
      if (controller.signal.aborted) return;

      setChartSignal(signalData);

      // 4. 的中率計算用の長期データをバックグラウンドで同期
      // アンマウントされた後は実行しない
      fetchOHLCV(stock.symbol, stock.market).catch(e => {
        if (!controller.signal.aborted) {
          console.warn('Background sync failed:', e);
        }
      });

    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Data fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

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
  }, [storeSelectedStock, fetchData, watchlist, setSelectedStock, selectedStock]);

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