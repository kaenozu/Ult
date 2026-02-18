import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Stock, OHLCV } from '@/app/types';
import { calculateAIHitRate } from '@/app/lib/analysis';
import { DATA_REQUIREMENTS } from '@/app/constants';
import { logger } from '@/app/core/logger';

// Zod Schema for API Response
const HistoryResponseSchema = z.object({
  data: z.array(z.any()).optional(), // Loose typing for now to match OHLCV structure later
});

export function useAIPerformance(stock: Stock, ohlcv: OHLCV[] = []) {
  const currentSymbol = stock.symbol;
  const currentMarket = stock.market;

  const { data: preciseHitRate, isLoading, error } = useQuery({
    queryKey: ['aiPerformance', currentSymbol, currentMarket],
    queryFn: async () => {
      // Simulate small network delay if needed, but better to remove artificial delays
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const startDate = oneYearAgo.toISOString().split('T')[0];

      try {
        const response = await fetch(`/api/market?type=history&symbol=${currentSymbol}&market=${currentMarket}&startDate=${startDate}`);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Too Many Requests - Please try again later');
          }
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const rawData = await response.json();
        const result = HistoryResponseSchema.safeParse(rawData);

        if (!result.success) {
          throw new Error('Invalid API response format');
        }

        const resultData = result.data;
        let targetData = resultData.data || [];

        // Data sufficiency check
        if (targetData.length < DATA_REQUIREMENTS.LOOKBACK_PERIOD_DAYS) {
          logger.warn(
            `Insufficient data for ${currentSymbol}: got ${targetData.length} records, falling back to local OHLCV`,
            undefined,
            'useAIPerformance'
          );
          
          // Fallback logic
          // Ideally, we should fetch more data or handle this gracefully.
          // For now, use the passed OHLCV if it has more data, or just use what we have.
          if (ohlcv.length > targetData.length) {
            targetData = ohlcv;
          }
          
          // Artificial enhancement logic removed for better reliability
        }

        const calcResult = calculateAIHitRate(currentSymbol, targetData as OHLCV[], currentMarket);
        return { hitRate: calcResult.hitRate, trades: calcResult.totalTrades };

      } catch (err) {
        logger.error('Precise hit rate fetch failed', err instanceof Error ? err : new Error(String(err)), 'useAIPerformance');
        
        // Fallback calculation on error
        try {
          const calcResult = calculateAIHitRate(currentSymbol, ohlcv, currentMarket);
          return { hitRate: calcResult.hitRate, trades: calcResult.totalTrades };
        } catch {
          throw new Error('的中率の計算に失敗しました');
        }
      }
    },
    enabled: !!currentSymbol,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    // Initial data from basic calculation if available?
    // initialData: ... (Could add if ohlcv is sufficient)
  });

  return {
    preciseHitRate: preciseHitRate || { hitRate: 0, trades: 0 },
    calculatingHitRate: isLoading,
    error: error instanceof Error ? error.message : (error ? String(error) : null),
  };
}
