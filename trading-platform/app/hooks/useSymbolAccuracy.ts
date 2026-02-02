import { useState, useEffect, useRef } from 'react';
import { Stock, OHLCV } from '@/app/types';
import { calculateRealTimeAccuracy, calculatePredictionError } from '@/app/lib/analysis';

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

// Constants for error messages (can be moved to i18n later)
const ERROR_MESSAGES = {
  CALCULATION_FAILED: '精度計算に失敗しました',
  INSUFFICIENT_DATA: 'Insufficient data for accuracy calculation',
  API_FAILED: 'Failed to fetch historical data'
};

/**
 * useSymbolAccuracy - Hook to fetch and cache prediction accuracy for a symbol
 * 
 * Features:
 * - Fetches real-time accuracy using AccuracyService
 * - Caches results per symbol for 5 minutes
 * - Calculates prediction error for confidence intervals
 * - Handles loading and error states
 * 
 * @param stock - Stock information
 * @param ohlcv - Historical OHLCV data
 * @returns Accuracy data, loading state, and error
 */
export function useSymbolAccuracy(stock: Stock, ohlcv: OHLCV[] = []) {
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const currentSymbol = stock.symbol;
    const currentMarket = stock.market;
    const cacheKey = `${currentSymbol}_${currentMarket}`;

    // Check cache first
    const cached = accuracyCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAccuracy(cached.data);
      setLoading(false);
      return;
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchAccuracy = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch historical data for accuracy calculation
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const startDate = oneYearAgo.toISOString().split('T')[0];

        const response = await fetch(
          `/api/market?type=history&symbol=${currentSymbol}&market=${currentMarket}&startDate=${startDate}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch historical data');
        }

        const result = await response.json();
        let historicalData = result.data || [];

        // Fallback to provided OHLCV if API data is insufficient
        if (historicalData.length < 252) {
          historicalData = ohlcv;
        }

        // Calculate accuracy metrics
        const accuracyResult = calculateRealTimeAccuracy(currentSymbol, historicalData, currentMarket);
        
        if (!accuracyResult) {
          throw new Error(ERROR_MESSAGES.INSUFFICIENT_DATA);
        }

        const predError = calculatePredictionError(historicalData);

        const accuracyData: AccuracyData = {
          hitRate: accuracyResult.hitRate,
          directionalAccuracy: accuracyResult.directionalAccuracy,
          totalTrades: accuracyResult.totalTrades,
          predictionError: predError
        };

        // Update cache
        accuracyCache.set(cacheKey, {
          data: accuracyData,
          timestamp: Date.now()
        });

        // Only update state if the symbol hasn't changed
        if (stock.symbol === currentSymbol && stock.market === currentMarket) {
          setAccuracy(accuracyData);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't update state
          return;
        }

        console.error('Failed to calculate accuracy:', err);
        
        // Only update error state if the symbol hasn't changed
        if (stock.symbol === currentSymbol && stock.market === currentMarket) {
          setError(ERROR_MESSAGES.CALCULATION_FAILED);
          
          // Try to calculate with existing OHLCV data as fallback
          if (ohlcv.length >= 252) {
            try {
              const accuracyResult = calculateRealTimeAccuracy(currentSymbol, ohlcv, currentMarket);
              if (accuracyResult) {
                const predError = calculatePredictionError(ohlcv);
                const fallbackData: AccuracyData = {
                  hitRate: accuracyResult.hitRate,
                  directionalAccuracy: accuracyResult.directionalAccuracy,
                  totalTrades: accuracyResult.totalTrades,
                  predictionError: predError
                };
                setAccuracy(fallbackData);
                setError(null);
              }
            } catch {
              // Fallback also failed, keep error state
            }
          }
        }
      } finally {
        if (stock.symbol === currentSymbol && stock.market === currentMarket) {
          setLoading(false);
        }
      }
    };

    fetchAccuracy();

    return () => {
      controller.abort();
    };
  }, [stock.symbol, stock.market, ohlcv]);

  return { accuracy, loading, error };
}
