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
const MAX_CACHE_SIZE = 1000; // Security: Limit cache size to prevent memory exhaustion

// Constants for error messages (can be moved to i18n later)
const ERROR_MESSAGES = {
  CALCULATION_FAILED: '精度計算に失敗しました',
  INSUFFICIENT_DATA: 'Insufficient data for accuracy calculation',
  API_FAILED: 'Failed to fetch historical data'
};

/**
 * Security: Sanitize cache key to prevent cache poisoning attacks
 *
 * Prevents:
 * - Prototype pollution
 * - Cache key collision
 * - Injection attacks
 * - Memory exhaustion via unbounded keys
 */
function sanitizeCacheKey(symbol: string, market: string): string {
  // Validate inputs
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Invalid symbol: must be a non-empty string');
  }

  if (!market || typeof market !== 'string') {
    throw new Error('Invalid market: must be a non-empty string');
  }

  // Remove potentially dangerous characters
  // Allow only alphanumeric, dash, underscore, and period
  const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9._-]/g, '').toUpperCase();
  const sanitizedMarket = market.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();

  // Validate sanitized values
  if (sanitizedSymbol.length === 0) {
    throw new Error('Invalid symbol: contains no valid characters');
  }

  if (sanitizedMarket.length === 0) {
    throw new Error('Invalid market: contains no valid characters');
  }

  // Limit key length to prevent memory issues
  const maxSymbolLength = 20;
  const maxMarketLength = 20;

  if (sanitizedSymbol.length > maxSymbolLength) {
    throw new Error(`Symbol too long: maximum ${maxSymbolLength} characters`);
  }

  if (sanitizedMarket.length > maxMarketLength) {
    throw new Error(`Market identifier too long: maximum ${maxMarketLength} characters`);
  }

  // Prevent prototype pollution by using a prefix
  return `acc_${sanitizedSymbol}_${sanitizedMarket}`;
}

/**
 * Security: Manage cache size to prevent memory exhaustion
 */
function manageCacheSize(): void {
  if (accuracyCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (LRU-style eviction)
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of accuracyCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      accuracyCache.delete(oldestKey);
    }
  }
}

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

    // Security: Sanitize cache key to prevent cache poisoning
    let cacheKey: string;
    try {
      cacheKey = sanitizeCacheKey(currentSymbol, currentMarket);
    } catch (error) {
      // Invalid symbol/market, set error and return
      const errorMessage = error instanceof Error ? error.message : 'Invalid symbol or market';
      setError(errorMessage);
      setLoading(false);
      return;
    }

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

        // Security: Use URLSearchParams to safely encode query parameters
        const params = new URLSearchParams({
          type: 'history',
          symbol: currentSymbol, // Already validated by sanitizeCacheKey
          market: currentMarket, // Already validated by sanitizeCacheKey
          startDate: startDate
        });

        const response = await fetch(
          `/api/market?${params.toString()}`,
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

        // Calculate accuracy metrics (returns null if insufficient data)
        const accuracyResult = calculateRealTimeAccuracy(currentSymbol, historicalData);
        if (!accuracyResult) {
          // Not enough data for accuracy calculation
          return;
        }

        const predError = calculatePredictionError(historicalData);

        const accuracyData: AccuracyData = {
          hitRate: accuracyResult.hitRate,
          directionalAccuracy: accuracyResult.directionalAccuracy,
          totalTrades: accuracyResult.totalTrades,
          predictionError: predError
        };

        // Security: Manage cache size before adding new entry
        manageCacheSize();

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
              const accuracyResult = calculateRealTimeAccuracy(currentSymbol, ohlcv);
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
