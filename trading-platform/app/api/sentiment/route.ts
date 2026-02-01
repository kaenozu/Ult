/**
 * GET /api/sentiment/route.ts
 * 
 * センチメントデータAPI - 全シンボルのセンチメント情報を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSentimentIntegration } from '@/app/lib/nlp/SentimentIntegrationService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get sentiment integration service
    const sentimentService = getGlobalSentimentIntegration();

    // Get all market intelligence
    const allIntelligence = sentimentService.getAllMarketIntelligence();

    // Convert Map to object for JSON response
    const data: Record<string, unknown> = {};
    allIntelligence.forEach((intelligence, symbol) => {
      data[symbol] = intelligence;
    });

    // Get service status
    const status = sentimentService.getStatus();

    return NextResponse.json({
      success: true,
      status,
      data,
      count: allIntelligence.size,
    });
  } catch (error) {
    console.error('[Sentiment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    const sentimentService = getGlobalSentimentIntegration();

    switch (action) {
      case 'start':
        sentimentService.start();
        return NextResponse.json({
          success: true,
          message: 'Sentiment analysis started',
        });

      case 'stop':
        sentimentService.stop();
        return NextResponse.json({
          success: true,
          message: 'Sentiment analysis stopped',
        });

      case 'clear':
        sentimentService.clearAllData();
        return NextResponse.json({
          success: true,
          message: 'All data cleared',
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Sentiment API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
