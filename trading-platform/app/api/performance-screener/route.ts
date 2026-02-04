/**
 * Performance Screener API Route
 * 
 * スキャンして最適な銘柄を返すAPIエンドポイント
 * GET /api/performance-screener
 * POST /api/performance-screener/clear-cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceScreenerService, StockDataSource } from '@/app/lib/PerformanceScreenerService';
import { JAPAN_STOCKS, USA_STOCKS, fetchOHLCV } from '@/app/data/stocks';
import { OHLCV } from '@/app/types';
import {
  createApiHandler,
  successResponse,
  getQueryParams,
  generateCacheKey,
  ApiResponse,
  parseJsonBody
} from '@/app/lib/api/UnifiedApiClient';
import { CacheManager } from '@/app/lib/api/CacheManager';

// Use CacheManager for response caching
const responseCache = new CacheManager<ApiResponse<unknown>>({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100
});

/**
 * データソースの作成
 */
function createDataSources(): StockDataSource[] {
  const allStocks = [
    ...JAPAN_STOCKS.map(s => ({ ...s, market: 'japan' as const })),
    ...USA_STOCKS.map(s => ({ ...s, market: 'usa' as const })),
  ];

  return allStocks.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    fetchData: async (): Promise<OHLCV[]> => {
      try {
        // 価格を取得（現在の実装に合わせる）
        const price = stock.price || 100;
        return await fetchOHLCV(stock.symbol, stock.market, price);
      } catch (error) {
        console.error(`Failed to fetch data for ${stock.symbol}:`, error);
        return [];
      }
    },
  }));
}

/**
 * GET /api/performance-screener
 *
 * Public endpoint to retrieve performance screening results.
 * Rate limited but currently public.
 */
export const GET = createApiHandler(
  async (request: NextRequest) => {
    // Check cache first
    const cacheKey = generateCacheKey(request, 'performance-screener');
    const cachedResponse = responseCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log('[PerformanceScreenerAPI] Cache hit');
      return NextResponse.json(cachedResponse);
    }

    const params = getQueryParams(request, [
      'market',
      'minWinRate',
      'minProfitFactor',
      'minTrades',
      'maxDrawdown',
      'topN',
      'lookbackDays'
    ]);

    // Parse parameters
    const market = (params.market || 'all') as 'japan' | 'usa' | 'all';
    const minWinRate = parseFloat(params.minWinRate || '0');
    const minProfitFactor = parseFloat(params.minProfitFactor || '0');
    const minTrades = parseInt(params.minTrades || '5', 10);
    const maxDrawdown = parseFloat(params.maxDrawdown || '100');
    const topN = parseInt(params.topN || '20', 10);
    const lookbackDays = parseInt(params.lookbackDays || '90', 10);

    // Create data sources
    const dataSources = createDataSources();

    // Run screening
    const result = await performanceScreenerService.scanMultipleStocks(dataSources, {
      market,
      minWinRate,
      minProfitFactor,
      minTrades,
      maxDrawdown,
      topN,
      lookbackDays,
    });

    // Create response
    const response = {
      success: true,
      data: result,
    };

    // Cache the response
    responseCache.set(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
  {
    rateLimit: true,
    requireAuth: false, // Public access for dashboard
    // We use manual caching to support clearing via POST
    cache: {
      enabled: false
    }
  }
);

/**
 * POST /api/performance-screener/clear-cache
 *
 * Secure endpoint to clear caches.
 * Requires Authentication and Rate Limiting.
 */
export const POST = createApiHandler(
  async (request: NextRequest) => {
    const body = await parseJsonBody<{ action: string }>(request);

    if (body.action === 'clear-cache') {
      // Clear local response cache
      responseCache.clear();

      // Clear service cache
      performanceScreenerService.clearCache();

      return successResponse({
        message: 'Cache cleared successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
      },
      { status: 400 }
    );
  },
  {
    rateLimit: true,
    requireAuth: true, // PROTECTED: Only authenticated users can clear cache
    cache: {
      enabled: false
    }
  }
);
