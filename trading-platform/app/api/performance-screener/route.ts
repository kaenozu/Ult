/**
 * Performance Screener API Route
 * 
 * スキャンして最適な銘柄を返すAPIエンドポイント
 * GET /api/performance-screener
 *
 * Query Parameters:
 * - mode: 'performance' | 'ai-signals' (default: 'performance')
 * - market: 'japan' | 'usa' | 'all' (default: 'all')
 * - minWinRate: number (default: 0) [performance mode]
 * - minProfitFactor: number (default: 0) [performance mode]
 * - minTrades: number (default: 5) [performance mode]
 * - maxDrawdown: number (default: 100) [performance mode]
 * - minConfidence: number (default: 60) [ai-signals mode]
 * - topN: number (default: 20)
 * - lookbackDays: number (default: 90)
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceScreenerService, StockDataSource } from '@/app/lib/PerformanceScreenerService';
import { JAPAN_STOCKS, USA_STOCKS, fetchOHLCV } from '@/app/data/stocks';
import { OHLCV } from '@/app/types';
import { handleApiError } from '@/app/lib/error-handler';
import { requireAuth } from '@/app/lib/auth';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireCSRF } from '@/app/lib/csrf/csrf-protection';

// キャッシュ管理
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

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
 */
export async function GET(request: NextRequest) {
  // Rate limiting (Public endpoint but expensive)
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

   try {
     const searchParams = request.nextUrl.searchParams;

     // モード判定
     const mode = searchParams.get('mode') || 'performance';

     // 共通パラメータ
     const market = (searchParams.get('market') || 'all') as 'japan' | 'usa' | 'all';
     const topN = parseInt(searchParams.get('topN') || '20', 10);
     const lookbackDays = parseInt(searchParams.get('lookbackDays') || '90', 10);

     // モード固有パラメータ（デフォルト値を設定）
     const minWinRate = parseFloat(searchParams.get('minWinRate') || '0');
     const minProfitFactor = parseFloat(searchParams.get('minProfitFactor') || '0');
     const minTrades = parseInt(searchParams.get('minTrades') || '5', 10);
     const maxDrawdown = parseFloat(searchParams.get('maxDrawdown') || '100');
     const minConfidence = parseFloat(searchParams.get('minConfidence') || '60');

     // キャッシュキー生成（全パラメータを含める）
     const cacheKey = mode === 'ai-signals'
       ? `${mode}:${market}:${topN}:${lookbackDays}:${minConfidence}`
       : `${mode}:${market}:${minWinRate}:${minProfitFactor}:${minTrades}:${maxDrawdown}:${topN}:${lookbackDays}`;
     
     // キャッシュチェック
     const cached = cache.get(cacheKey);
     if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
       console.log('[PerformanceScreenerAPI] Cache hit');
       return NextResponse.json(cached.data, {
         headers: {
           'Cache-Control': 'public, max-age=300',
         },
       });
     }

     // データソース作成
     const dataSources = createDataSources();

     let result;
     if (mode === 'ai-signals') {
       console.error('[PerformanceScreenerAPI] AI signal scan with config:', { market, topN, lookbackDays, minConfidence });
       result = await performanceScreenerService.scanMultipleStocksForAISignals(dataSources, {
         market,
         topN,
         lookbackDays,
         minConfidence,
       });
     } else {
       // パフォーマンスモード（デフォルト）
       console.error('[PerformanceScreenerAPI] Performance scan with config:', { market, minWinRate, minProfitFactor, minTrades, maxDrawdown, topN, lookbackDays });
       result = await performanceScreenerService.scanMultipleStocks(dataSources, {
         market,
         minWinRate,
         minProfitFactor,
         minTrades,
         maxDrawdown,
         topN,
         lookbackDays,
       });
     }

    // レスポンス
    const response = {
      success: true,
      data: result,
    };

    // キャッシュに保存
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });

  } catch (error) {
    return handleApiError(error, 'PerformanceScreenerAPI');
  }
}

/**
 * POST /api/performance-screener/clear-cache
 * キャッシュをクリア
 */
export async function POST(request: NextRequest) {
  // Require authentication for administrative actions
  const authError = requireAuth(request);
  if (authError) return authError;

  // CSRF protection
  const csrfError = requireCSRF(request);
  if (csrfError) return csrfError;

  try {
    const { action } = await request.json();

    if (action === 'clear-cache') {
      cache.clear();
      performanceScreenerService.clearCache();

      return NextResponse.json({
        success: true,
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

  } catch (error) {
    return handleApiError(error, 'PerformanceScreenerAPI');
  }
}
