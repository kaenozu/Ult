'use client';

import React, { useEffect, useState } from 'react';
import { useInfoToast } from './ToastSystem';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceData {
  metrics: WebVitalsMetric[];
  bundleSize: number;
  loadTime: number;
  memoryUsage?: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    metrics: [],
    bundleSize: 0,
    loadTime: 0,
  });
  const showInfoToast = useInfoToast();

  useEffect(() => {
    // Core Web Vitals monitoring
    const reportWebVitals = (metric: any) => {
      const vitalsMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        timestamp: Date.now(),
      };

      setPerformanceData(prev => ({
        ...prev,
        metrics: [...prev.metrics.slice(-9), vitalsMetric], // Keep last 10 metrics
      }));

      // Alert on poor performance
      if (vitalsMetric.rating === 'poor') {
        showInfoToast(
          `Performance Alert: ${metric.name}`,
          `${metric.value.toFixed(2)} (${vitalsMetric.rating})`,
          { duration: 10000 }
        );
      }
    };

    // Dynamic import of web-vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportWebVitals);
      getFID(reportWebVitals);
      getFCP(reportWebVitals);
      getLCP(reportWebVitals);
      getTTFB(reportWebVitals);
    });

    // Bundle size monitoring
    if ('performance' in window && 'getEntriesByType' in performance) {
      const entries = performance.getEntriesByType(
        'navigation'
      ) as PerformanceNavigationTiming[];
      if (entries.length > 0) {
        const navEntry = entries[0];
        setPerformanceData(prev => ({
          ...prev,
          loadTime: navEntry.loadEventEnd - navEntry.fetchStart,
        }));
      }
    }

    // Memory usage monitoring
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setPerformanceData(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize,
      }));
    }

    // Bundle size estimation
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const totalSize = jsResources.reduce(
        (acc, r) => acc + (r.transferSize || 0),
        0
      );

      setPerformanceData(prev => ({
        ...prev,
        bundleSize: totalSize,
      }));
    }
  }, [showInfoToast]);

  const getRating = (
    name: string,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' => {
    switch (name) {
      case 'CLS':
        return value <= 0.1
          ? 'good'
          : value <= 0.25
            ? 'needs-improvement'
            : 'poor';
      case 'FID':
        return value <= 100
          ? 'good'
          : value <= 300
            ? 'needs-improvement'
            : 'poor';
      case 'FCP':
        return value <= 1800
          ? 'good'
          : value <= 3000
            ? 'needs-improvement'
            : 'poor';
      case 'LCP':
        return value <= 2500
          ? 'good'
          : value <= 4000
            ? 'needs-improvement'
            : 'poor';
      case 'TTFB':
        return value <= 800
          ? 'good'
          : value <= 1800
            ? 'needs-improvement'
            : 'poor';
      default:
        return 'good';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'text-green-400';
      case 'needs-improvement':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatValue = (name: string, value: number) => {
    switch (name) {
      case 'CLS':
        return value.toFixed(3);
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toString();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className='fixed bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 border border-white/10 shadow-lg max-w-sm'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-sm font-semibold text-foreground'>
          Performance Monitor
        </h3>
        <button
          onClick={() => setPerformanceData(prev => ({ ...prev, metrics: [] }))}
          className='text-xs text-muted-foreground hover:text-foreground'
        >
          Clear
        </button>
      </div>

      {/* Core Web Vitals */}
      <div className='space-y-2 mb-4'>
        <h4 className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Core Web Vitals
        </h4>
        {performanceData.metrics.slice(-5).map((metric, index) => (
          <div
            key={`${metric.name}-${metric.timestamp}`}
            className='flex justify-between items-center text-xs'
          >
            <span className='text-muted-foreground'>{metric.name}</span>
            <span className={getRatingColor(metric.rating)}>
              {formatValue(metric.name, metric.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Bundle Info */}
      <div className='space-y-2'>
        <h4 className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
          Bundle Info
        </h4>
        <div className='flex justify-between items-center text-xs'>
          <span className='text-muted-foreground'>Load Time</span>
          <span className='text-foreground'>
            {performanceData.loadTime
              ? `${(performanceData.loadTime / 1000).toFixed(2)}s`
              : 'N/A'}
          </span>
        </div>
        <div className='flex justify-between items-center text-xs'>
          <span className='text-muted-foreground'>Bundle Size</span>
          <span className='text-foreground'>
            {formatBytes(performanceData.bundleSize)}
          </span>
        </div>
        {performanceData.memoryUsage && (
          <div className='flex justify-between items-center text-xs'>
            <span className='text-muted-foreground'>Memory Usage</span>
            <span className='text-foreground'>
              {formatBytes(performanceData.memoryUsage)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for programmatic access to performance data
export const usePerformanceMonitor = () => {
  const [data, setData] = useState<PerformanceData>({
    metrics: [],
    bundleSize: 0,
    loadTime: 0,
  });

  useEffect(() => {
    const updateData = () => {
      // Collect current performance data
      let loadTime = 0;
      let bundleSize = 0;
      let memoryUsage = undefined;

      if ('performance' in window && 'getEntriesByType' in performance) {
        const entries = performance.getEntriesByType(
          'navigation'
        ) as PerformanceNavigationTiming[];
        if (entries.length > 0) {
          loadTime = entries[0].loadEventEnd - entries[0].fetchStart;
        }

        const resources = performance.getEntriesByType(
          'resource'
        ) as PerformanceResourceTiming[];
        const jsResources = resources.filter(r => r.name.includes('.js'));
        bundleSize = jsResources.reduce(
          (acc, r) => acc + (r.transferSize || 0),
          0
        );
      }

      if ('memory' in performance) {
        memoryUsage = (performance as any).memory.usedJSHeapSize;
      }

      setData(prev => ({
        ...prev,
        loadTime,
        bundleSize,
        memoryUsage,
      }));
    };

    updateData();
    const interval = setInterval(updateData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return data;
};
