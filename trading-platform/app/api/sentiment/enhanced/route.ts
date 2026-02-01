/**
 * Enhanced Sentiment Analysis API Route
 * 
 * GET /api/sentiment/enhanced?symbol=<SYMBOL>
 * 
 * 強化されたセンチメント分析結果を取得します。
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
    
    // サービスがまだ開始されていない場合は開始
    try {
      service.start();
    } catch (error) {
      // 既に開始されている場合はエラーを無視
    }

    // 指定された銘柄のセンチメント分析を実行
    const result = await service.analyzeSymbol(symbol);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Enhanced Sentiment API] Error:', error);
    
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
