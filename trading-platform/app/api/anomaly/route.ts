/**
 * Anomaly Detection API Endpoint
 * TRADING-010: 異常検知と市場予測システムの実装
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnomalyDetector, EventPredictor } from '@/app/lib/aiAnalytics/AnomalyDetection';
import { MarketData } from '@/app/lib/aiAnalytics/AnomalyDetection/types';
import { handleApiError } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/api-middleware';
import { requireCSRF } from '@/app/lib/csrf/csrf-protection';

// Initialize detectors (in production, these would be singletons or cached)
const anomalyDetector = new AnomalyDetector();
const eventPredictor = new EventPredictor();

/**
 * POST /api/anomaly
 * Detect anomalies in market data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF protection
    const csrfError = requireCSRF(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const rateLimitResponse = checkRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'detect': {
        // Detect anomalies in market data
        if (!data || !data.symbol || !data.ohlcv) {
          return NextResponse.json(
            { error: 'Invalid market data provided' },
            { status: 400 }
          );
        }

        const marketData: MarketData = {
          symbol: data.symbol,
          timestamp: new Date(data.timestamp || Date.now()),
          ohlcv: data.ohlcv,
          recentHistory: data.recentHistory || [],
          volume: data.volume || data.ohlcv[data.ohlcv.length - 1]?.volume || 0,
          price: data.price || data.ohlcv[data.ohlcv.length - 1]?.close || 0,
          indicators: data.indicators,
        };

        const result = anomalyDetector.detectAnomaly(marketData);

        return NextResponse.json({
          success: true,
          anomaly: result,
        });
      }

      case 'flash-crash': {
        // Check for flash crash
        if (!data || !data.ohlcv || !Array.isArray(data.ohlcv)) {
          return NextResponse.json(
            { error: 'OHLCV data array is required' },
            { status: 400 }
          );
        }

        const alert = anomalyDetector.detectFlashCrash(data.ohlcv);

        return NextResponse.json({
          success: true,
          alert: alert || null,
          detected: alert !== null,
        });
      }

      case 'liquidity-crisis': {
        // Check for liquidity crisis
        if (!data || !data.orderBook) {
          return NextResponse.json(
            { error: 'Order book data is required' },
            { status: 400 }
          );
        }

        const alert = anomalyDetector.detectLiquidityCrisis(data.orderBook);

        return NextResponse.json({
          success: true,
          alert: alert || null,
          detected: alert !== null,
        });
      }

      case 'regime-change': {
        // Check for market regime change
        if (!data || !data.ohlcv || !Array.isArray(data.ohlcv)) {
          return NextResponse.json(
            { error: 'OHLCV data array is required' },
            { status: 400 }
          );
        }

        const alert = anomalyDetector.detectRegimeChange(data.ohlcv);

        return NextResponse.json({
          success: true,
          alert: alert || null,
          detected: alert !== null,
        });
      }

      case 'predict-event': {
        // Predict market events
        if (!data || !data.ohlcv || !Array.isArray(data.ohlcv)) {
          return NextResponse.json(
            { error: 'OHLCV data array is required' },
            { status: 400 }
          );
        }

        const prediction = await eventPredictor.predictEvent(data.ohlcv);

        return NextResponse.json({
          success: true,
          prediction,
        });
      }

      case 'predict-price': {
        // Predict price movement
        if (!data || !data.symbol || !data.ohlcv || !Array.isArray(data.ohlcv)) {
          return NextResponse.json(
            { error: 'Symbol and OHLCV data are required' },
            { status: 400 }
          );
        }

        const horizon = data.horizon || 5;
        const prediction = await eventPredictor.predictPriceMovement(
          data.symbol,
          data.ohlcv,
          horizon
        );

        return NextResponse.json({
          success: true,
          prediction,
        });
      }

      case 'tail-risk': {
        // Assess tail risk
        if (!data || !data.portfolio) {
          return NextResponse.json(
            { error: 'Portfolio data is required' },
            { status: 400 }
          );
        }

        const assessment = eventPredictor.assessTailRisk(data.portfolio);

        return NextResponse.json({
          success: true,
          assessment,
        });
      }

      case 'risk-correlation': {
        // Analyze risk correlation
        if (!data || !data.assets || !Array.isArray(data.assets)) {
          return NextResponse.json(
            { error: 'Assets array is required' },
            { status: 400 }
          );
        }

        const analysis = eventPredictor.analyzeRiskCorrelation(data.assets);

        return NextResponse.json({
          success: true,
          analysis,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Anomaly detection API error:', error);
    return handleApiError(error, 'Anomaly detection failed');
  }
}

/**
 * GET /api/anomaly
 * Get anomaly detection status and capabilities
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    capabilities: {
      actions: [
        'detect',
        'flash-crash',
        'liquidity-crisis',
        'regime-change',
        'predict-event',
        'predict-price',
        'tail-risk',
        'risk-correlation',
      ],
      description: 'Anomaly detection and market prediction system',
      version: '1.0.0',
    },
    status: 'operational',
  });
}
