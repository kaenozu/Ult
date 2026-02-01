/**
 * GET /api/news/route.ts
 * 
 * ニュースデータAPI - ニュース記事を取得
 */

import { NextRequest } from 'next/server';
import { getGlobalNewsCollector } from '@/app/lib/nlp/NewsCollector';
import { createApiHandler, getQueryParams, successResponse, generateCacheKey } from '@/app/lib/api/UnifiedApiClient';
import { validateSymbol, validateField } from '@/app/lib/api/ApiValidator';

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const params = getQueryParams(request, ['symbol', 'keywords', 'limit']);
    const { symbol, keywords, limit: limitStr } = params;

    // Validate symbol if provided
    if (symbol) {
      const symbolError = validateSymbol(symbol, false);
      if (symbolError) return symbolError;
    }

    // Validate and parse limit
    const limit = parseInt(limitStr || '20', 10);
    const limitError = validateField({
      value: limit,
      fieldName: 'limit',
      min: 1,
      max: 100,
    });
    if (limitError) return limitError;

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

    return successResponse({
      success: true,
      data: limitedArticles,
      count: limitedArticles.length,
      total: articles.length,
    });
  },
  {
    rateLimit: true,
    cache: {
      enabled: true,
      ttl: 120000, // 2 minutes cache for news
      keyGenerator: (req) => generateCacheKey(req, 'news'),
    },
  }
);
