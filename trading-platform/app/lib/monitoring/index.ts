/**
 * Comprehensive Monitoring & Error Tracking for ULT Trading Platform
 * 
 * Features:
 * - Core Web Vitals monitoring (LCP, FID, CLS)
 * - Error tracking with Sentry
 * - Custom metrics (API, WebSocket, Rendering)
 * - Real User Monitoring (RUM)
 * - Performance budgets
 */

import * as Sentry from '@sentry/nextjs';
import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';
import { logger } from '@/app/core/logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
  timestamp: number;
}

export interface WebSocketMetric {
  event: 'connect' | 'disconnect' | 'error' | 'message';
  duration?: number;
  success: boolean;
  timestamp: number;
  errorMessage?: string;
}

export interface RenderMetric {
  componentName: string;
  duration: number;
  timestamp: number;
  renderCount?: number;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  warning: number;
}

// ============================================================================
// Configuration
// ============================================================================

const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { metric: 'LCP', budget: 2500, warning: 2000 },
  { metric: 'INP', budget: 200, warning: 150 },
  { metric: 'CLS', budget: 0.1, warning: 0.05 },
  { metric: 'FCP', budget: 1800, warning: 1500 },
  { metric: 'TTFB', budget: 800, warning: 600 },
  { metric: 'api.response', budget: 1000, warning: 750 },
  { metric: 'render.component', budget: 100, warning: 75 },
];

// Web Vitals thresholds
const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

// ============================================================================
// Monitoring Class
// ============================================================================

class MonitoringService {
  private metrics: Map<string, number[]> = new Map();
  private apiMetrics: ApiMetric[] = [];
  private webSocketMetrics: WebSocketMetric[] = [];
  private renderMetrics: RenderMetric[] = [];
  private webVitalsMetrics: Map<string, WebVitalsMetric> = new Map();
  private initialized = false;
  private readonly MAX_STORED_METRICS = 1000;

  /**
   * Initialize monitoring service
   */
  initialize(config?: {
    sentryDsn?: string;
    environment?: string;
    tracesSampleRate?: number;
    enableWebVitals?: boolean;
  }): void {
    if (this.initialized) {
      return;
    }

    // Initialize Sentry if DSN is provided
    if (config?.sentryDsn) {
      this.initializeSentry({
        dsn: config.sentryDsn,
        environment: config.environment || process.env.NODE_ENV || 'development',
        tracesSampleRate: config.tracesSampleRate || 0.1,
      });
    }

    // Initialize Web Vitals tracking
    if (config?.enableWebVitals !== false && typeof window !== 'undefined') {
      this.initializeWebVitals();
    }

    this.initialized = true;
    logger.info('[Monitoring] Service initialized', undefined, 'Monitoring');
  }

  /**
   * Initialize Sentry error tracking
   */
  private initializeSentry(config: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
  }): void {
    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate,
        
        tracePropagationTargets: ['localhost', /^\//],
        
        // Performance Monitoring
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Filter out non-critical errors
        beforeSend(event, hint) {
          // Filter out network errors that are expected
          if (
            hint.originalException &&
            typeof hint.originalException === 'object' &&
            'message' in hint.originalException
          ) {
            const message = String(hint.originalException.message);
            if (
              message.includes('Failed to fetch') ||
              message.includes('Network request failed')
            ) {
              return null;
            }
          }
          return event;
        },
      });

      logger.info('[Monitoring] Sentry initialized', undefined, 'Monitoring');
    } catch (error) {
      logger.error('[Monitoring] Failed to initialize Sentry', error instanceof Error ? error : new Error(String(error)), 'Monitoring');
    }
  }

  /**
   * Initialize Web Vitals tracking
   */
  private initializeWebVitals(): void {
    const reportWebVital = (metric: Metric) => {
      const webVitalMetric = this.processWebVital(metric);
      this.webVitalsMetrics.set(metric.name, webVitalMetric);

      // Log to console
      logger.info(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${webVitalMetric.rating})`, { id: metric.id }, 'Monitoring');

      // Send to Sentry
      Sentry.captureMessage(`Web Vital: ${metric.name}`, {
        level: webVitalMetric.rating === 'poor' ? 'warning' : 'info',
        tags: {
          'web-vital': metric.name,
          rating: webVitalMetric.rating,
        },
        extra: {
          value: metric.value,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
        },
      });

      // Check against budget
      this.checkPerformanceBudget(metric.name, metric.value);

      // Record custom metric
      this.recordMetric(`web-vitals.${metric.name}`, metric.value);
    };

    // Track all Core Web Vitals
    onCLS(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
    onFCP(reportWebVital);
    onTTFB(reportWebVital);

    logger.info('[Monitoring] Web Vitals tracking initialized', undefined, 'Monitoring');
  }

  /**
   * Process Web Vital metric and determine rating
   */
  private processWebVital(metric: Metric): WebVitalsMetric {
    const thresholds = WEB_VITALS_THRESHOLDS[metric.name as keyof typeof WEB_VITALS_THRESHOLDS];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (thresholds) {
      if (metric.value > thresholds.poor) {
        rating = 'poor';
      } else if (metric.value > thresholds.good) {
        rating = 'needs-improvement';
      }
    }

    return {
      name: metric.name,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    };
  }

  /**
   * Check if metric exceeds performance budget
   */
  private checkPerformanceBudget(metricName: string, value: number): void {
    const budget = PERFORMANCE_BUDGETS.find(b => b.metric === metricName);
    if (!budget) return;

    if (value > budget.budget) {
      logger.warn(
        `[Performance Budget] ${metricName} exceeded budget: ${value.toFixed(2)}ms > ${budget.budget}ms`,
        undefined,
        'Monitoring'
      );
      
      // Report to Sentry
      Sentry.captureMessage(`Performance budget exceeded: ${metricName}`, {
        level: 'warning',
        tags: { metric: metricName },
        extra: { value, budget: budget.budget, warning: budget.warning },
      });
    } else if (value > budget.warning) {
      logger.warn(
        `[Performance Budget] ${metricName} approaching budget: ${value.toFixed(2)}ms > ${budget.warning}ms (warning threshold)`,
        undefined,
        'Monitoring'
      );
    }
  }

  /**
   * Record a generic metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const measurements = this.metrics.get(name)!;
    measurements.push(value);

    // Keep only recent measurements
    if (measurements.length > this.MAX_STORED_METRICS) {
      measurements.shift();
    }
  }

  /**
   * Track API call metrics
   */
  trackApiCall(metric: ApiMetric): void {
    this.apiMetrics.push(metric);

    // Keep only recent metrics
    if (this.apiMetrics.length > this.MAX_STORED_METRICS) {
      this.apiMetrics.shift();
    }

    // Record duration
    this.recordMetric(`api.${metric.endpoint}`, metric.duration);

    // Check against budget
    this.checkPerformanceBudget('api.response', metric.duration);

    // Log slow API calls
    if (metric.duration > 1000) {
      logger.warn(
        `[API] Slow response: ${metric.method} ${metric.endpoint} took ${metric.duration.toFixed(2)}ms`,
        undefined,
        'Monitoring'
      );
    }

    // Track errors in Sentry
    if (!metric.success) {
      Sentry.captureMessage(`API call failed: ${metric.method} ${metric.endpoint}`, {
        level: 'error',
        tags: {
          endpoint: metric.endpoint,
          method: metric.method,
          status: metric.status.toString(),
        },
        extra: { duration: metric.duration },
      });
    }
  }

  /**
   * Track WebSocket metrics
   */
  trackWebSocket(metric: WebSocketMetric): void {
    this.webSocketMetrics.push(metric);

    // Keep only recent metrics
    if (this.webSocketMetrics.length > this.MAX_STORED_METRICS) {
      this.webSocketMetrics.shift();
    }

    // Record metric
    if (metric.duration !== undefined) {
      this.recordMetric(`websocket.${metric.event}`, metric.duration);
    }

    // Track errors in Sentry
    if (!metric.success) {
      Sentry.captureMessage(`WebSocket ${metric.event} failed`, {
        level: 'error',
        tags: { event: metric.event },
        extra: {
          errorMessage: metric.errorMessage,
          duration: metric.duration,
        },
      });
    }

    // Log connection issues
    if (metric.event === 'error' || !metric.success) {
      logger.error(
        `[WebSocket] ${metric.event} failed: ${metric.errorMessage || 'Unknown error'}`,
        new Error(metric.errorMessage || 'WebSocket error'),
        'Monitoring'
      );
    }
  }

  /**
   * Track component render metrics
   */
  trackRender(metric: RenderMetric): void {
    this.renderMetrics.push(metric);

    // Keep only recent metrics
    if (this.renderMetrics.length > this.MAX_STORED_METRICS) {
      this.renderMetrics.shift();
    }

    // Record duration
    this.recordMetric(`render.${metric.componentName}`, metric.duration);

    // Check against budget
    this.checkPerformanceBudget('render.component', metric.duration);

    // Log slow renders
    if (metric.duration > 100) {
      logger.warn(
        `[Render] Slow render: ${metric.componentName} took ${metric.duration.toFixed(2)}ms`,
        undefined,
        'Monitoring'
      );
    }
  }

  /**
   * Get WebSocket connection success rate
   */
  getWebSocketSuccessRate(): number {
    if (this.webSocketMetrics.length === 0) return 100;

    const connectAttempts = this.webSocketMetrics.filter(
      m => m.event === 'connect'
    );
    const successfulConnects = connectAttempts.filter(m => m.success);

    return connectAttempts.length > 0
      ? (successfulConnects.length / connectAttempts.length) * 100
      : 100;
  }

  /**
   * Get API success rate
   */
  getApiSuccessRate(): number {
    if (this.apiMetrics.length === 0) return 100;

    const successfulCalls = this.apiMetrics.filter(m => m.success);
    return (successfulCalls.length / this.apiMetrics.length) * 100;
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number | null {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return null;

    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }

  /**
   * Get all Web Vitals metrics
   */
  getWebVitals(): Map<string, WebVitalsMetric> {
    return new Map(this.webVitalsMetrics);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    webVitals: Record<string, WebVitalsMetric>;
    apiSuccessRate: number;
    webSocketSuccessRate: number;
    averageApiResponseTime: number | null;
    slowestApiCalls: ApiMetric[];
    slowestRenders: RenderMetric[];
  } {
    const webVitalsObj: Record<string, WebVitalsMetric> = {};
    this.webVitalsMetrics.forEach((value, key) => {
      webVitalsObj[key] = value;
    });

    // Get slowest API calls
    const slowestApiCalls = [...this.apiMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Get slowest renders
    const slowestRenders = [...this.renderMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      webVitals: webVitalsObj,
      apiSuccessRate: this.getApiSuccessRate(),
      webSocketSuccessRate: this.getWebSocketSuccessRate(),
      averageApiResponseTime: this.getAverageMetric('api.response'),
      slowestApiCalls,
      slowestRenders,
    };
  }

  /**
   * Capture error in Sentry
   */
  captureError(error: Error, context?: Record<string, unknown>): void {
    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(user: { id?: string; email?: string; username?: string }): void {
    Sentry.setUser(user);
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const monitoring = new MonitoringService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize monitoring
 */
export function initializeMonitoring(config?: {
  sentryDsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  enableWebVitals?: boolean;
}): void {
  monitoring.initialize(config);
}

/**
 * Track API call
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  duration: number,
  status: number,
  success: boolean
): void {
  monitoring.trackApiCall({
    endpoint,
    method,
    duration,
    status,
    success,
    timestamp: Date.now(),
  });
}

/**
 * Track WebSocket event
 */
export function trackWebSocket(
  event: 'connect' | 'disconnect' | 'error' | 'message',
  success: boolean,
  duration?: number,
  errorMessage?: string
): void {
  monitoring.trackWebSocket({
    event,
    success,
    duration,
    errorMessage,
    timestamp: Date.now(),
  });
}

/**
 * Track component render
 */
export function trackRender(
  componentName: string,
  duration: number,
  renderCount?: number
): void {
  monitoring.trackRender({
    componentName,
    duration,
    timestamp: Date.now(),
    renderCount,
  });
}

/**
 * Capture error
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  monitoring.captureError(error, context);
}
