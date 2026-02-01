/**
 * Sentiment History API Route
 * 
 * GET /api/sentiment/history?symbol=<SYMBOL>
 * 
 * 銘柄の履歴センチメントデータを取得します。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalEnhancedSentimentService } from '@/app/lib/alternativeData';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // 強化されたセンチメント分析サービスを取得
    const service = getGlobalEnhancedSentimentService();

    // 履歴データを取得
    const history = service.getHistoricalSentiment(symbol);

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        history,
        count: history.length
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Sentiment History API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
