/**
 * Performance Monitoring Hook
 * 
 * Provides real-time performance monitoring for React components
 * including render time, memory usage, and user interaction responsiveness.
 */

import { useEffect, useRef, useCallback, useState, createElement } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  slowRenderCount: number;
  lastInteractionTime: number;
  interactionResponsiveness: number;
}

interface PerformanceMonitorOptions {
  slowRenderThreshold?: number; // ms
  enableMemoryTracking?: boolean;
  enableInteractionTracking?: boolean;
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    slowRenderThreshold = 16, // 60fps = 16.67ms per frame
    enableMemoryTracking = true,
    enableInteractionTracking = true,
    onSlowRender
  } = options;

  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const slowRenderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);
  const lastInteractionTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    averageRenderTime: 0,
    slowRenderCount: 0,
    lastInteractionTime: 0,
    interactionResponsiveness: 0
  });

  // Initialize lastInteractionTime on mount
  useEffect(() => {
    lastInteractionTime.current = Date.now();
  }, []);

  // Performance monitoring during render
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current++;

    return () => {
      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime.current;
      totalRenderTime.current += renderTime;

      // Check for slow renders
      if (renderTime > slowRenderThreshold) {
        slowRenderCount.current++;
        console.warn(`🐌 Slow render detected: ${renderTime.toFixed(2)}ms (threshold: ${slowRenderThreshold}ms)`);
        
        if (onSlowRender) {
          onSlowRender({
            renderTime,
            renderCount: renderCount.current,
            averageRenderTime: totalRenderTime.current / renderCount.current,
            slowRenderCount: slowRenderCount.current,
            lastInteractionTime: lastInteractionTime.current,
            interactionResponsiveness: metrics.interactionResponsiveness
          });
        }
      }

      // Update metrics
      const newMetrics: PerformanceMetrics = {
        renderTime,
        renderCount: renderCount.current,
        averageRenderTime: totalRenderTime.current / renderCount.current,
        slowRenderCount: slowRenderCount.current,
        lastInteractionTime: lastInteractionTime.current,
        interactionResponsiveness: metrics.interactionResponsiveness
      };

      setMetrics(newMetrics);

      // Memory tracking (if available)
      if (enableMemoryTracking && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn(`⚠️ High memory usage: ${((memory.usedJSHeapSize / 1024 / 1024).toFixed(2))}MB`);
        }
      }
    };
  }, [slowRenderThreshold, onSlowRender, enableMemoryTracking, metrics.interactionResponsiveness]);

  // Track user interactions
  const trackInteraction = useCallback(() => {
    if (!enableInteractionTracking) return;
    
    const now = Date.now();
    const responsiveness = now - lastInteractionTime.current;
    lastInteractionTime.current = now;

    setMetrics(prev => ({
      ...prev,
      lastInteractionTime: now,
      interactionResponsiveness: responsiveness
    }));

    // Log slow interactions
    if (responsiveness > 300) { // 300ms threshold for user interactions
      console.warn(`🐌 Slow interaction detected: ${responsiveness}ms`);
    }
  }, [enableInteractionTracking]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    return {
      averageRenderTime: metrics.averageRenderTime.toFixed(2) + 'ms',
      slowRenderRate: ((metrics.slowRenderCount / metrics.renderCount) * 100).toFixed(1) + '%',
      totalRenders: metrics.renderCount,
      slowRenders: metrics.slowRenderCount,
      interactionResponsiveness: metrics.interactionResponsiveness.toFixed(2) + 'ms'
    };
  }, [metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCount.current = 0;
    slowRenderCount.current = 0;
    totalRenderTime.current = 0;
    lastInteractionTime.current = Date.now();
    
    setMetrics({
      renderTime: 0,
      renderCount: 0,
      averageRenderTime: 0,
      slowRenderCount: 0,
      lastInteractionTime: Date.now(),
      interactionResponsiveness: 0
    });
  }, []);

  return {
    metrics,
    trackInteraction,
    getPerformanceSummary,
    resetMetrics
  };
}

/**
 * Component Performance Monitor
 * 
 * Higher-order component that wraps a component with performance monitoring
 */
export function withPerformanceMonitor<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  options?: PerformanceMonitorOptions
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  return function MonitoredComponent(props: T) {
    const { getPerformanceSummary, trackInteraction } = usePerformanceMonitor({
      slowRenderThreshold: 50, // More lenient for complex components
      ...options,
      onSlowRender: (metrics) => {
        console.warn(`📊 ${displayName} Performance Issues:`, getPerformanceSummary());
        options?.onSlowRender?.(metrics);
      }
    });

    // Wrap event handlers to track interactions
    const monitoredProps = { ...props };
    Object.keys(monitoredProps).forEach(key => {
      const prop = monitoredProps[key as keyof T];
      if (typeof prop === 'function' && key.startsWith('on')) {
        monitoredProps[key as keyof T] = ((...args: unknown[]) => {
          trackInteraction();
          return (prop as any)(...args);
        }) as any;
      }
    });

    return createElement(WrappedComponent, { ...monitoredProps });
  };

  const MonitoredComponentFn = function MonitoredComponentInner(props: T) {
    const { getPerformanceSummary, trackInteraction } = usePerformanceMonitor({
      slowRenderThreshold: 50,
      ...options,
      onSlowRender: (metrics) => {
        console.warn(`📊 ${displayName} Performance Issues:`, getPerformanceSummary());
        options?.onSlowRender?.(metrics);
      }
    });

    const monitoredProps = { ...props };
    Object.keys(monitoredProps).forEach(key => {
      const prop = monitoredProps[key as keyof T];
      if (typeof prop === 'function' && key.startsWith('on')) {
        monitoredProps[key as keyof T] = ((...args: unknown[]) => {
          trackInteraction();
          return (prop as any)(...args);
        }) as any;
      }
    });

    return createElement(WrappedComponent, { ...monitoredProps });
  };

  MonitoredComponentFn.displayName = `withPerformanceMonitor(${displayName})`;
  return MonitoredComponentFn;
}

/**
 * Global Performance Monitor
 * 
 * Monitors global application performance metrics
 */
class GlobalPerformanceMonitor {
  private static instance: GlobalPerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private observer: MutationObserver | null = null;

  private constructor() {
    this.initializeGlobalMonitoring();
  }

  static getInstance(): GlobalPerformanceMonitor {
    if (!GlobalPerformanceMonitor.instance) {
      GlobalPerformanceMonitor.instance = new GlobalPerformanceMonitor();
    }
    return GlobalPerformanceMonitor.instance;
  }

  private initializeGlobalMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor DOM changes
    this.observer = new MutationObserver((mutations) => {
      const largeDOMChanges = mutations.filter(m => 
        m.addedNodes.length > 10 || m.removedNodes.length > 10
      );
      
      if (largeDOMChanges.length > 0) {
        console.warn('⚠️ Large DOM changes detected:', largeDOMChanges.length);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    // Monitor memory
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) {
          console.error(`🚨 Critical memory usage: ${usagePercent.toFixed(1)}%`);
        } else if (usagePercent > 60) {
          console.warn(`⚠️ High memory usage: ${usagePercent.toFixed(1)}%`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  recordComponentMetrics(componentName: string, metrics: PerformanceMetrics) {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    
    const componentMetrics = this.metrics.get(componentName)!;
    componentMetrics.push(metrics);
    
    // Keep only last 100 entries per component
    if (componentMetrics.length > 100) {
      componentMetrics.shift();
    }
  }

  getComponentReport(componentName: string) {
    const componentMetrics = this.metrics.get(componentName);
    if (!componentMetrics || componentMetrics.length === 0) {
      return null;
    }

    const avgRenderTime = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / componentMetrics.length;
    const slowRenderRate = componentMetrics.filter(m => m.renderTime > 16).length / componentMetrics.length;
    const avgInteractionTime = componentMetrics.reduce((sum, m) => sum + m.interactionResponsiveness, 0) / componentMetrics.length;

    return {
      componentName,
      sampleCount: componentMetrics.length,
      averageRenderTime: avgRenderTime.toFixed(2) + 'ms',
      slowRenderRate: (slowRenderRate * 100).toFixed(1) + '%',
      averageInteractionTime: avgInteractionTime.toFixed(2) + 'ms',
      totalSlowRenders: componentMetrics.filter(m => m.renderTime > 16).length
    };
  }

  getGlobalReport() {
    const report: any = {};
    for (const [componentName] of this.metrics) {
      const componentReport = this.getComponentReport(componentName);
      if (componentReport) {
        report[componentName] = componentReport;
      }
    }
    return report;
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.metrics.clear();
  }
}

export const globalPerformanceMonitor = GlobalPerformanceMonitor.getInstance();