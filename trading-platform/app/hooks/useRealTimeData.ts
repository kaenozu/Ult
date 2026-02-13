import { useState, useEffect, useCallback, useRef } from 'react';
import { RealTimeQuote } from '@/app/lib/services/RealTimeDataService';

interface UseRealTimeDataOptions {
  enabled?: boolean;
  market?: string;
  interval?: number; // ms
  maxErrors?: number;
}

export function useRealTimeData(symbol: string | null, options: UseRealTimeDataOptions = {}) {
  const { enabled = true, market = 'japan', interval = 20000, maxErrors = 3 } = options;
  const [data, setData] = useState<RealTimeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorCountRef = useRef(0);
  const [isPollingPaused, setIsPollingPaused] = useState(false);

  const fetchRealTimeData = useCallback(async () => {
    if (!symbol || !enabled || market !== 'japan' || isPollingPaused) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/market/realtime?symbol=${symbol}&market=${market}`);
      
      if (response.status === 401 || response.status === 403) {
        setIsPollingPaused(true);
        setError('Authentication required for real-time data');
        return;
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
        errorCountRef.current = 0; // Reset on success
      } else {
        throw new Error(result.error || 'Failed to fetch real-time data');
      }
    } catch (err) {
      errorCountRef.current += 1;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      if (errorCountRef.current >= maxErrors) {
        setIsPollingPaused(true);
        console.warn(`[useRealTimeData] Pausing polling for ${symbol} due to ${maxErrors} consecutive errors.`);
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled, market, maxErrors, isPollingPaused]);

  useEffect(() => {
    // Reset state when symbol changes
    setIsPollingPaused(false);
    errorCountRef.current = 0;
    
    // Initial fetch
    fetchRealTimeData();

    // Setup polling
    if (!symbol || !enabled || market !== 'japan') return;

    const timer = setInterval(() => {
      if (!isPollingPaused) {
        fetchRealTimeData();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [fetchRealTimeData, interval, symbol, enabled, market, isPollingPaused]);

  return { data, loading, error, refetch: fetchRealTimeData, isPaused: isPollingPaused };
}
