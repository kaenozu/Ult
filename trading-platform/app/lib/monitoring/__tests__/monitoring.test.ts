/**
 * Tests for Monitoring Service
 */

import { monitoring, initializeMonitoring, trackApiCall, trackRender } from '../index';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  browserTracingIntegration: jest.fn(() => ({})),
  replayIntegration: jest.fn(() => ({})),
}));

// Mock web-vitals
jest.mock('web-vitals', () => ({
  onCLS: jest.fn((callback) => {
    // Simulate CLS metric
    callback({
      name: 'CLS',
      value: 0.05,
      delta: 0.05,
      id: 'test-cls-id',
      navigationType: 'navigate',
    });
  }),
  onINP: jest.fn((callback) => {
    // Simulate INP metric (replaces FID in web-vitals v4)
    callback({
      name: 'INP',
      value: 150,
      delta: 150,
      id: 'test-inp-id',
      navigationType: 'navigate',
    });
  }),
  onLCP: jest.fn((callback) => {
    // Simulate LCP metric
    callback({
      name: 'LCP',
      value: 2000,
      delta: 2000,
      id: 'test-lcp-id',
      navigationType: 'navigate',
      startTime: 2000,
    });
  }),
  onFCP: jest.fn(),
  onTTFB: jest.fn(),
}));

describe('Monitoring Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset monitoring state
    (monitoring as any).initialized = false;
    (monitoring as any).metrics.clear();
    (monitoring as any).apiMetrics = [];
    (monitoring as any).renderMetrics = [];
    (monitoring as any).webVitalsMetrics.clear();
  });

  describe('initialization', () => {
    it('should initialize monitoring service', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      initializeMonitoring({
        sentryDsn: 'https://test@sentry.io/123',
        environment: 'test',
        enableWebVitals: false,
      });

      expect(consoleSpy.mock.calls.some(call => typeof call[0] === 'string' && call[0].includes('[Monitoring] Service initialized'))).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should not initialize twice', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      initializeMonitoring({ enableWebVitals: false });
      initializeMonitoring({ enableWebVitals: false });

      // Should only log initialization once
      const initCalls = consoleSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('[Monitoring] Service initialized')
      );
      expect(initCalls.length).toBe(1);
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('API tracking', () => {
    beforeEach(() => {
      initializeMonitoring({ enableWebVitals: false });
    });

    it('should track successful API calls', () => {
      trackApiCall('/api/test', 'GET', 150, 200, true);

      const summary = monitoring.getPerformanceSummary();
      expect(summary.apiSuccessRate).toBe(100);
      expect(summary.slowestApiCalls).toHaveLength(1);
      expect(summary.slowestApiCalls[0]).toMatchObject({
        endpoint: '/api/test',
        method: 'GET',
        duration: 150,
        status: 200,
        success: true,
      });
    });

    it('should track failed API calls', () => {
      trackApiCall('/api/test', 'POST', 200, 500, false);

      const summary = monitoring.getPerformanceSummary();
      expect(summary.apiSuccessRate).toBe(0);
    });

    it('should calculate API success rate correctly', () => {
      trackApiCall('/api/test1', 'GET', 100, 200, true);
      trackApiCall('/api/test2', 'GET', 150, 200, true);
      trackApiCall('/api/test3', 'GET', 200, 500, false);

      const summary = monitoring.getPerformanceSummary();
      expect(summary.apiSuccessRate).toBeCloseTo(66.67, 2);
    });

    it('should track slow API calls', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      trackApiCall('/api/slow', 'GET', 1500, 200, true);

      expect(warnSpy.mock.calls.some(call => typeof call[0] === 'string' && call[0].includes('[API] Slow response'))).toBe(true);
      warnSpy.mockRestore();
    });
  });

  describe('Render tracking', () => {
    beforeEach(() => {
      initializeMonitoring({ enableWebVitals: false });
    });

    it('should track component renders', () => {
      trackRender('TestComponent', 25);

      const summary = monitoring.getPerformanceSummary();
      expect(summary.slowestRenders).toHaveLength(1);
      expect(summary.slowestRenders[0]).toMatchObject({
        componentName: 'TestComponent',
        duration: 25,
      });
    });

    it('should warn about slow renders', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      trackRender('SlowComponent', 150);

      expect(warnSpy.mock.calls.some(call => typeof call[0] === 'string' && call[0].includes('[Render] Slow render'))).toBe(true);
      warnSpy.mockRestore();
    });

    it('should track multiple renders', () => {
      trackRender('Component1', 10);
      trackRender('Component2', 20);
      trackRender('Component3', 30);

      const summary = monitoring.getPerformanceSummary();
      expect(summary.slowestRenders).toHaveLength(3);
      expect(summary.slowestRenders[0].duration).toBe(30); // Slowest first
    });
  });

  describe('Performance summary', () => {
    beforeEach(() => {
      initializeMonitoring({ enableWebVitals: false });
    });

    it('should generate complete performance summary', () => {
      trackApiCall('/api/test', 'GET', 100, 200, true);
      trackRender('TestComponent', 25);

      const summary = monitoring.getPerformanceSummary();

      expect(summary.apiSuccessRate).toBe(100);
      expect(summary.slowestApiCalls).toHaveLength(1);
      expect(summary.slowestRenders).toHaveLength(1);
    });

    it('should handle empty metrics', () => {
      const summary = monitoring.getPerformanceSummary();

      expect(summary.apiSuccessRate).toBe(100);
      expect(summary.slowestApiCalls).toHaveLength(0);
      expect(summary.slowestRenders).toHaveLength(0);
      expect(summary.averageApiResponseTime).toBeNull();
    });
  });

  describe('Metric recording', () => {
    beforeEach(() => {
      initializeMonitoring({ enableWebVitals: false });
    });

    it('should record and retrieve metrics', () => {
      monitoring.recordMetric('test.metric', 100);
      monitoring.recordMetric('test.metric', 150);
      monitoring.recordMetric('test.metric', 200);

      const avg = monitoring.getAverageMetric('test.metric');
      expect(avg).toBe(150);
    });

    it('should return null for non-existent metrics', () => {
      const avg = monitoring.getAverageMetric('nonexistent');
      expect(avg).toBeNull();
    });

    it('should limit stored metrics', () => {
      // Store more than MAX_STORED_METRICS
      for (let i = 0; i < 1100; i++) {
        monitoring.recordMetric('test.metric', i);
      }

      const metrics = (monitoring as any).metrics.get('test.metric');
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });
});
