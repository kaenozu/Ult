import { useEffect, useState, useCallback } from 'react';

interface WebVitalsMetrics {
  // Largest Contentful Paint
  lcp: number | null;
  lcpElement: string | null;
  
  // First Input Delay
  fid: number | null;
  
  // Cumulative Layout Shift
  cls: number | null;
  clsEntries: LayoutShiftEntry[];
  
  // First Contentful Paint
  fcp: number | null;
  
  // Time to First Byte
  ttfb: number | null;
  
  // Interaction to Next Paint (INP) - Core Web Vital (2024)
  inp: number | null;
}

interface LayoutShiftEntry {
  value: number;
  element?: string;
  time: number;
}

interface WebVitalsRating {
  lcp: 'good' | 'needs-improvement' | 'poor';
  fid: 'good' | 'needs-improvement' | 'poor';
  cls: 'good' | 'needs-improvement' | 'poor';
  fcp: 'good' | 'needs-improvement' | 'poor';
  ttfb: 'good' | 'needs-improvement' | 'poor';
  inp: 'good' | 'needs-improvement' | 'poor';
}

// Core Web Vitals閾値
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 },
};

/**
 * Core Web Vitalsを測定するフック
 */
export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    lcp: null,
    lcpElement: null,
    fid: null,
    cls: null,
    clsEntries: [],
    fcp: null,
    ttfb: null,
    inp: null,
  });

  const [ratings, setRatings] = useState<WebVitalsRating>({
    lcp: 'good',
    fid: 'good',
    cls: 'good',
    fcp: 'good',
    ttfb: 'good',
    inp: 'good',
  });

  // LCP測定
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
      
      setMetrics((prev) => ({
        ...prev,
        lcp: lastEntry.startTime,
        lcpElement: (lastEntry as any).element?.tagName || null,
      }));
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    return () => observer.disconnect();
  }, []);

  // FID測定
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const firstEntry = list.getEntries()[0] as PerformanceEventTiming;
      
      setMetrics((prev) => ({
        ...prev,
        fid: firstEntry.processingStart - firstEntry.startTime,
      }));
    });

    observer.observe({ entryTypes: ['first-input'] });

    return () => observer.disconnect();
  }, []);

  // CLS測定
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    const entries: LayoutShiftEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as LayoutShift;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          entries.push({
            value: layoutShift.value,
            element: (layoutShift as any).sources?.[0]?.node?.tagName,
            time: layoutShift.startTime,
          });
        }
      }

      setMetrics((prev) => ({
        ...prev,
        cls: clsValue,
        clsEntries: entries,
      }));
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    return () => observer.disconnect();
  }, []);

  // FCP測定
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(
        (entry) => entry.name === 'first-contentful-paint'
      );
      
      if (fcpEntry) {
        setMetrics((prev) => ({
          ...prev,
          fcp: fcpEntry.startTime,
        }));
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    return () => observer.disconnect();
  }, []);

  // TTFB測定
  useEffect(() => {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      setMetrics((prev) => ({
        ...prev,
        ttfb: navigation.responseStart - navigation.startTime,
      }));
    }
  }, []);

  // INP測定（最新のCore Web Vital）
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    let maxDuration = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventTiming = entry as PerformanceEventTiming;
        const duration = eventTiming.processingEnd - eventTiming.startTime;
        if (duration > maxDuration) {
          maxDuration = duration;
          setMetrics((prev) => ({
            ...prev,
            inp: maxDuration,
          }));
        }
      }
    });

    // Event Timing APIがあれば使用
    try {
      observer.observe({ entryTypes: ['event'] as any });
    } catch (e) {
      // 未対応のブラウザでは無視
    }

    return () => observer.disconnect();
  }, []);

  // レーティング計算
  useEffect(() => {
    const newRatings: WebVitalsRating = {
      lcp: getRating(metrics.lcp, THRESHOLDS.lcp),
      fid: getRating(metrics.fid, THRESHOLDS.fid),
      cls: getRating(metrics.cls, THRESHOLDS.cls),
      fcp: getRating(metrics.fcp, THRESHOLDS.fcp),
      ttfb: getRating(metrics.ttfb, THRESHOLDS.ttfb),
      inp: getRating(metrics.inp, THRESHOLDS.inp),
    };
    
    setRatings(newRatings);
  }, [metrics]);

  // レポート送信
  const reportToAnalytics = useCallback(() => {
    if (process.env.NODE_ENV === 'production') {
      // Google Analyticsや独自の分析システムに送信
      console.log('[WebVitals]', metrics);
      
      // 例: Google Analytics 4
      if ('gtag' in window) {
        (window as any).gtag('event', 'web_vitals', {
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls,
          fcp: metrics.fcp,
          ttfb: metrics.ttfb,
          inp: metrics.inp,
        });
      }
    }
  }, [metrics]);

  // ページ離脱時にレポート
  useEffect(() => {
    const handleBeforeUnload = () => {
      reportToAnalytics();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 10秒後にもレポート（早期離脱対策）
    const timer = setTimeout(reportToAnalytics, 10000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(timer);
    };
  }, [reportToAnalytics]);

  const getOverallScore = useCallback(() => {
    const scores = Object.values(ratings);
    const poorCount = scores.filter((s) => s === 'poor').length;
    const needsImprovementCount = scores.filter((s) => s === 'needs-improvement').length;

    if (poorCount > 0) return 'poor';
    if (needsImprovementCount > 0) return 'needs-improvement';
    return 'good';
  }, [ratings]);

  return {
    metrics,
    ratings,
    overallScore: getOverallScore(),
    reportToAnalytics,
  };
}

function getRating(
  value: number | null,
  thresholds: { good: number; poor: number }
): 'good' | 'needs-improvement' | 'poor' {
  if (value === null) return 'good';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// TypeScript用の型定義
interface LargestContentfulPaint extends PerformanceEntry {
  startTime: number;
  element?: Element;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: Array<{ node?: Element }>;
}
