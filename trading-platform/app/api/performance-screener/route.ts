/**
 * Performance Screener API Route
 * 
 * スキャンして最適な銘柄を返すAPIエンドポイント
 * GET /api/performance-screener
 *
 * Query Parameters:
 * - market: 'japan' | 'usa' | 'all' (default: 'all')
 * - minWinRate: number (default: 0)
 * - minProfitFactor: number (default: 0)
 * - minTrades: number (default: 5)
 * - maxDrawdown: number (default: 100)
 * - topN: number (default: 20)
 * - lookbackDays: number (default: 90)
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceScreenerService, StockDataSource } from '@/app/lib/PerformanceScreenerService';
import { JAPAN_STOCKS, USA_STOCKS, fetchOHLCV } from '@/app/data/stocks';
import { OHLCV } from '@/app/types';
import { handleApiError } from '@/app/lib/error-handler';

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
  try {
    const searchParams = request.nextUrl.searchParams;

    // パラメータ取得
    const market = (searchParams.get('market') || 'all') as 'japan' | 'usa' | 'all';
    const minWinRate = parseFloat(searchParams.get('minWinRate') || '0');
    const minProfitFactor = parseFloat(searchParams.get('minProfitFactor') || '0');
    const minTrades = parseInt(searchParams.get('minTrades') || '5', 10);
    const maxDrawdown = parseFloat(searchParams.get('maxDrawdown') || '100');
    const topN = parseInt(searchParams.get('topN') || '20', 10);
    const lookbackDays = parseInt(searchParams.get('lookbackDays') || '90', 10);

    // キャッシュキー生成
    const cacheKey = `${market}:${minWinRate}:${minProfitFactor}:${minTrades}:${maxDrawdown}:${topN}:${lookbackDays}`;
    
    // キャッシュチェック
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log('[PerformanceScreenerAPI] Cache hit');
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5分キャッシュ
        },
      });
    }

    // データソース作成
    const dataSources = createDataSources();

    // スクリーニング実行
    const result = await performanceScreenerService.scanMultipleStocks(dataSources, {
      market,
      minWinRate,
      minProfitFactor,
      minTrades,
      maxDrawdown,
      topN,
      lookbackDays,
    });

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
