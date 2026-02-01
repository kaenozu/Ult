/**
 * GET /api/news/route.ts
 * 
 * ニュースデータAPI - ニュース記事を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalNewsCollector } from '@/app/lib/nlp/NewsCollector';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const keywords = searchParams.get('keywords');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const newsCollector = getGlobalNewsCollector();

    let articles;

    if (symbol) {
      articles = newsCollector.filterBySymbol(symbol);
    } else if (keywords) {
      const keywordList = keywords.split(',').map((k) => k.trim());
      articles = newsCollector.filterByKeywords(keywordList);
    } else {
      articles = newsCollector.getAllArticles();
    }

    // Limit results
    const limitedArticles = articles.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedArticles,
      count: limitedArticles.length,
      total: articles.length,
    });
  } catch (error) {
    console.error('[News API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news data' },
      { status: 500 }
    );
  }
}
