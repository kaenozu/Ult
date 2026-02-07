/**
 * GET /api/sentiment/route.ts
 *
 * センチメントデータAPI - 全シンボルのセンチメント情報を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSentimentIntegration } from '@/app/lib/nlp/SentimentIntegrationService';
import { createGetHandler, createPostHandler } from '@/app/lib/api/UnifiedApiClient';
import { validateField } from '@/app/lib/api/ApiValidator';
import { requireAdmin } from '@/app/lib/auth';

export const GET = createGetHandler(
  async () => {
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

    return {
      success: true,
      status,
      data,
      count: allIntelligence.size,
    };
  },
  {
    rateLimit: true,
    cache: {
      enabled: process.env.NODE_ENV !== 'test', // Disable cache in test environment
      ttl: 60000, // 1 minute cache
      keyGenerator: () => 'sentiment:all',
    },
  }
);

interface SentimentAction {
  action: 'start' | 'stop' | 'clear';
}

export const POST = createPostHandler<SentimentAction, { success: boolean; message: string }>(
  async (request: NextRequest, body: SentimentAction) => {
    // Admin access required for control actions
    const adminError = requireAdmin(request);
    if (adminError) {
      return adminError;
    }

    // Validate action
    const validationError = validateField({
      value: body.action,
      fieldName: 'action',
      required: true,
      enum: ['start', 'stop', 'clear'] as const,
    });

    if (validationError) {
      return NextResponse.json(
        { success: false, message: `Invalid action: ${body.action}` },
        { status: 400 }
      );
    }

    const sentimentService = getGlobalSentimentIntegration();

    switch (body.action) {
      case 'start':
        sentimentService.start();
        return {
          success: true,
          message: 'Sentiment analysis started',
        };

      case 'stop':
        sentimentService.stop();
        return {
          success: true,
          message: 'Sentiment analysis stopped',
        };

      case 'clear':
        sentimentService.clearAllData();
        return {
          success: true,
          message: 'All data cleared',
        };

      default:
        return {
          success: false,
          message: `Unknown action: ${body.action}`,
        };
    }
  },
  {
    rateLimit: true,
    requireAuth: true,
    csrfProtection: true,
  }
);

