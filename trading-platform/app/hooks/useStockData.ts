import { useState, useCallback, useEffect, useRef } from 'react';
import { Stock, OHLCV, Signal } from '@/app/types';
import { fetchOHLCV, fetchSignal } from '@/app/data/stocks';
import { useTradingStore } from '@/app/store/tradingStore';

export function useStockData() {
  const { watchlist, selectedStock: storeSelectedStock, setSelectedStock } = useTradingStore();
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [chartSignal, setChartSignal] = useState<Signal | null>(null);
  const [selectedStock, setLocalSelectedStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to watchlist for stable callbacks
  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  const fetchData = useCallback(async (stock: Stock) => {
    setLoading(true);
    setError(null);
    setChartData([]); // Clear for skeleton
    setChartSignal(null);

    try {
      const data = await fetchOHLCV(stock.symbol, stock.market, stock.price);
      if (data.length === 0) {
        setError('No data available');
      } else {
        setChartData(data);
        const signalData = await fetchSignal(stock);
        setChartSignal(signalData);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Priority 1: Stock explicitly selected in the global store (from Screener or Search)
    if (storeSelectedStock) {
      setLocalSelectedStock(storeSelectedStock);
      fetchData(storeSelectedStock);
    }
    // Priority 2: If no global selection but watchlist has items, show the first one
    else if (watchlist.length > 0) {
      const defaultStock = watchlist[0];
      setLocalSelectedStock(defaultStock);
      setSelectedStock(defaultStock); // Sync back to store
      fetchData(defaultStock);
    }
    // Priority 3: Nothing to show
    else {
      setLocalSelectedStock(null);
    }
  }, [storeSelectedStock, fetchData, watchlist, setSelectedStock]);

  const handleStockSelect = useCallback((stock: Stock) => {
    setLocalSelectedStock(stock);
    setSelectedStock(stock);
    fetchData(stock);
  }, [setSelectedStock, fetchData]);

  return {
    selectedStock,
    chartData,
    chartSignal,
    loading,
    error,
    handleStockSelect
  };
}
