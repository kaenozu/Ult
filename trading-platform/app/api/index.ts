/**
 * API Routes Index - Centralized exports and documentation
 * 
 * This file provides documentation and centralized access to all API routes.
 */

// ============================================================================
// Core Trading API
// ============================================================================

/**
 * GET /api/trading - Get trading platform status
 * POST /api/trading - Execute trading actions
 * 
 * Actions: start, stop, reset, place_order, close_position, create_alert, update_config
 */
export { GET as TradingGET, POST as TradingPOST } from './trading/route';

// ============================================================================
// Symbol-specific Trading API
// ============================================================================

/**
 * GET /api/trading/[symbol] - Get symbol-specific trading data
 */
export { GET as SymbolGET } from './trading/[symbol]/route';

// ============================================================================
// Market Data API
// ============================================================================

/**
 * GET /api/market - Get market data (history or quotes)
 * 
 * Query params:
 * - type: 'history' | 'quote'
 * - symbol: Stock symbol(s)
 * - market: 'japan' | 'usa' (optional)
 * - interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1wk' | '1mo' (optional)
 * - startDate: YYYY-MM-DD (optional, for history)
 */
export { GET as MarketGET } from './market/route';

// ============================================================================
// News API
// ============================================================================

/**
 * GET /api/news - Get financial news
 */
export { GET as NewsGET } from './news/route';

// ============================================================================
// Backtest API
// ============================================================================

/**
 * GET /api/backtest - Get backtest results
 */
export { GET as BacktestGET } from './backtest/route';

// ============================================================================
// Anomaly Detection API
// ============================================================================

/**
 * GET /api/anomaly - Get anomaly detection results
 */
export { GET as AnomalyGET } from './anomaly/route';

// ============================================================================
// API Documentation
// ============================================================================

/**
 * API Route Documentation
 * 
 * Common patterns across all routes:
 * 
 * 1. Authentication: All routes require valid authentication via requireAuth()
 * 2. Rate Limiting: All routes are rate-limited via checkRateLimit()
 * 3. Error Handling: Centralized error handling via handleApiError()
 * 4. Validation: Input validation using validation utilities
 * 5. CSRF Protection: POST routes require CSRF token validation
 * 
 * Response Format:
 * - Success: { success: true, data: ... }
 * - Error: { success: false, error: "...", details?: ... }
 * 
 * Status Codes:
 * - 200: Success
 * - 400: Bad Request (validation error)
 * - 401: Unauthorized
 * - 404: Not Found
 * - 429: Rate Limited
 * - 500: Internal Server Error
 * - 502: Bad Gateway (external API error)
 */

export const API_DOCUMENTATION = {
  version: '1.0.0',
  lastUpdated: '2026-02-05',
  endpoints: {
    trading: {
      methods: ['GET', 'POST'],
      description: 'Core trading platform operations',
      authentication: true,
      rateLimit: true,
      csrf: true,
    },
    market: {
      methods: ['GET'],
      description: 'Market data and quotes',
      authentication: false,
      rateLimit: true,
      csrf: false,
    },
    news: {
      methods: ['GET', 'POST'],
      description: 'Financial news and sentiment analysis',
      authentication: true,
      rateLimit: true,
      csrf: true,
    },
    backtest: {
      methods: ['GET', 'POST'],
      description: 'Strategy backtesting',
      authentication: true,
      rateLimit: true,
      csrf: true,
    },
    anomaly: {
      methods: ['GET', 'POST'],
      description: 'Anomaly detection and alerts',
      authentication: true,
      rateLimit: true,
      csrf: true,
    },
  },
};