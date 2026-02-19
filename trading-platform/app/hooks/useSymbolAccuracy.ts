import { useState, useEffect, useRef } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { calculateRealTimeAccuracy, calculatePredictionError } from '@/app/lib/analysis';
import { DATA_REQUIREMENTS } from '@/app/constants';
import { logger } from '@/app/core/logger';

interface AccuracyData {
  hitRate: number;
  directionalAccuracy: number;
  totalTrades: number;
  predictionError: number;
}

// Simple in-memory cache with expiration
interface CacheEntry {
  data: AccuracyData;
  timestamp: number;
}

const accuracyCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Security: Limit cache size to prevent memory exhaustion

// Constants for error messages
const ERROR_MESSAGES = {
  CALCULATION_FAILED: '精度計算に失敗しました',
  INSUFFICIENT_DATA: 'Insufficient data for accuracy calculation',
  API_FAILED: 'Failed to fetch historical data'
};

/**
 * Security: Sanitize cache key to prevent cache poisoning attacks
 */
function sanitizeCacheKey(symbol: string, market: string): string {
  if (!symbol || typeof symbol !== 'string') throw new Error('Invalid symbol');
  if (!market || typeof market !== 'string') throw new Error('Invalid market');

  const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9._-]/g, '').toUpperCase();
  const sanitizedMarket = market.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();

  return `acc_${sanitizedSymbol}_${sanitizedMarket}`;
}

/**
 * Security: Manage cache size to prevent memory exhaustion
 */
function manageCacheSize(): void {
  if (accuracyCache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    for (const [key, entry] of accuracyCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) accuracyCache.delete(oldestKey);
  }
}

/**
 * useSymbolAccuracy - Hook to fetch and cache prediction accuracy for a symbol
 */
export function useSymbolAccuracy(stock: Stock, ohlcv: OHLCV[] = []) {
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentSymbol = stock.symbol;
    const currentMarket = stock.market;

    if (!currentSymbol || currentSymbol === '') {
      setAccuracy(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cacheKey: string;
    try {
      cacheKey = sanitizeCacheKey(currentSymbol, currentMarket);
    } catch {
      setError('Invalid symbol or market');
      setLoading(false);
      return;
    }

    const cached = accuracyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAccuracy(cached.data);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchAccuracy = async () => {
      setLoading(true);
      setError(null);

      try {
        // Increased to 3 years to ensure calculateRealTimeAccuracy has enough data
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const startDate = threeYearsAgo.toISOString().split('T')[0];

        logger.info(`[useSymbolAccuracy] Fetching for ${currentSymbol}`, { startDate }, 'useSymbolAccuracy');

        const params = new URLSearchParams({
          type: 'history',
          symbol: currentSymbol,
          market: currentMarket,
          startDate: startDate
        });

        const response = await fetch(`/api/market?${params.toString()}`, { signal: controller.signal });

        if (!response.ok) {
          if (response.status === 429) throw new Error('Too Many Requests');
          throw new Error('Failed to fetch historical data');
        }

        const result = await response.json();
        let historicalData = result.data || [];

        const MIN_DATA_FOR_ACCURACY = 30;
        const PREFERRED_DATA_LENGTH = 60;

        const useOHLCV = ohlcv.length > historicalData.length && ohlcv.length >= MIN_DATA_FOR_ACCURACY;
        const useAPI = historicalData.length >= MIN_DATA_FOR_ACCURACY;

        if (useOHLCV) {
          logger.warn(`[useSymbolAccuracy] API returned insufficient data, using provided OHLCV for ${currentSymbol}`, undefined, 'useSymbolAccuracy');
          historicalData = ohlcv;
        } else if (!useAPI && historicalData.length < MIN_DATA_FOR_ACCURACY) {
          logger.error(`[useSymbolAccuracy] CRITICAL: Insufficient data for ${currentSymbol}`, undefined, 'useSymbolAccuracy');
          setError('データが不足しています。精度計算には最低30日分の履歴データが必要です。');
          setLoading(false);
          return;
        }

        if (historicalData.length < PREFERRED_DATA_LENGTH) {
          logger.warn(`[useSymbolAccuracy] Unreliable accuracy due to short data length for ${currentSymbol}`, undefined, 'useSymbolAccuracy');
        }

        const accuracyResult = calculateRealTimeAccuracy(currentSymbol, historicalData, currentMarket);
        if (!accuracyResult) {
          if (stock.symbol === currentSymbol) setLoading(false);
          return;
        }

        const predError = calculatePredictionError(historicalData);
        const accuracyData: AccuracyData = {
          hitRate: accuracyResult.precisionAccuracy ?? accuracyResult.hitRate,
          directionalAccuracy: accuracyResult.directionalAccuracy,
          totalTrades: accuracyResult.totalTrades,
          predictionError: predError
        };

        manageCacheSize();
        accuracyCache.set(cacheKey, { data: accuracyData, timestamp: Date.now() });

        if (stock.symbol === currentSymbol) {
          setAccuracy(accuracyData);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        logger.error('Failed to calculate accuracy:', err instanceof Error ? err : new Error(String(err)), 'useSymbolAccuracy');

        if (stock.symbol === currentSymbol) {
          setError(ERROR_MESSAGES.CALCULATION_FAILED);
          if (ohlcv.length >= DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS) {
            try {
              const accuracyResult = calculateRealTimeAccuracy(currentSymbol, ohlcv, currentMarket);
              if (accuracyResult) {
                setAccuracy({
                  hitRate: accuracyResult.hitRate,
                  directionalAccuracy: accuracyResult.directionalAccuracy,
                  totalTrades: accuracyResult.totalTrades,
                  predictionError: calculatePredictionError(ohlcv)
                });
                setError(null);
              }
            } catch { /* Fallback failed */ }
          }
        }
      } finally {
        if (stock.symbol === currentSymbol) setLoading(false);
      }
    };

    fetchAccuracy();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol, stock.market, ohlcv.length]); // Track ohlcv.length to detect data changes without frequent re-renders

  return { accuracy, loading, error };
}