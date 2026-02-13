import { useState, useEffect, useCallback } from 'react';
import { RealTimeQuote } from '@/app/lib/services/RealTimeDataService';

interface UseRealTimeDataOptions {
  enabled?: boolean;
  market?: string;
  interval?: number; // ms
}

export function useRealTimeData(symbol: string | null, options: UseRealTimeDataOptions = {}) {
  const { enabled = true, market = 'japan', interval = 20000 } = options;
  const [data, setData] = useState<RealTimeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRealTimeData = useCallback(async () => {
    if (!symbol || !enabled || market !== 'japan') return;

    try {
      setLoading(true);
      const response = await fetch(`/api/market/realtime?symbol=${symbol}&market=${market}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch real-time data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbol, enabled, market]);

  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();

    // Setup polling
    if (!symbol || !enabled || market !== 'japan') return;

    const timer = setInterval(fetchRealTimeData, interval);
    return () => clearInterval(timer);
  }, [fetchRealTimeData, interval, symbol, enabled, market]);

  return { data, loading, error, refetch: fetchRealTimeData };
}
