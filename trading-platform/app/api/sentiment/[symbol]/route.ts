/**
 * GET /api/sentiment/[symbol]/route.ts
 * 
 * センチメントデータAPI - 特定シンボルのセンチメント情報を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSentimentIntegration } from '@/app/lib/nlp/SentimentIntegrationService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
): Promise<NextResponse> {
  try {
    const { symbol } = await context.params;
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    // Get sentiment integration service
    const sentimentService = getGlobalSentimentIntegration();

    // Get market intelligence for the symbol
    const intelligence = sentimentService.getMarketIntelligence(symbol);

    if (!intelligence) {
      return NextResponse.json(
        { error: `No sentiment data available for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    // Get trend analysis
    const trend = sentimentService.analyzeSentimentTrend(symbol);

    return NextResponse.json({
      success: true,
      data: {
        ...intelligence,
        trend,
      },
    });
  } catch (error) {
    console.error('[Sentiment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}
