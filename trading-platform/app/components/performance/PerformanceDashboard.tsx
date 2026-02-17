import React, { useEffect, useState, useCallback } from 'react';
import { usePerformanceMonitor } from '@/app/hooks/usePerformanceMonitor';
import { globalCache } from '@/app/hooks/useCachedFetch';
import { enhancedPredictionService } from '@/app/lib/services/enhanced-prediction-service';
import { INTERVAL } from '@/app/constants/timing';

interface PerformanceMetrics {
  // レンダリング
  renderCount: number;
  averageRenderTime: number;
  slowRenders: number;
  
  // メモリ
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  
  // キャッシュ
  cacheHitRate: number;
  cacheSize: number;
  
  // 予測サービス
  predictionMetrics: {
    totalCalculations: number;
    cacheHits: number;
    averageCalculationTime: number;
  };
  
  // Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
}

/**
 * パフォーマンスダッシュボードコンポーネント
 * 開発時やデバッグ時に使用
 */
export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    cacheHitRate: 0,
    cacheSize: 0,
    predictionMetrics: {
      totalCalculations: 0,
      cacheHits: 0,
      averageCalculationTime: 0
    },
    lcp: null,
    fid: null,
    cls: null
  });
  
  const [isVisible, setIsVisible] = useState(false);
  
  const updateMetrics = useCallback(() => {
    // メモリ情報
    const memory = (performance as any).memory;
    
    // キャッシュ情報
    const cacheStats = globalCache.getStats();
    
    // 予測サービス情報
    const predMetrics = enhancedPredictionService.getPerformanceMetrics();
    
    setMetrics({
      renderCount: metrics.renderCount, // これは実際のモニタリングから取得
      averageRenderTime: 0,
      slowRenders: 0,
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      cacheHitRate: predMetrics.cacheHits / Math.max(predMetrics.totalCalculations, 1),
      cacheSize: cacheStats.size,
      predictionMetrics: predMetrics,
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls
    });
  }, [metrics]);
  
  // 定期的なメトリクス更新
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(updateMetrics, INTERVAL.PERFORMANCE_CHECK);
    return () => clearInterval(interval);
  }, [isVisible, updateMetrics]);
  
  // Web Vitals測定
  useEffect(() => {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(m => ({ ...m, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const firstEntry = list.getEntries()[0] as PerformanceEventTiming;
      setMetrics(m => ({ ...m, fid: firstEntry.processingStart - firstEntry.startTime }));
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      setMetrics(m => ({ ...m, cls: clsValue }));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    
    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getMetricColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.poor) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-[#1a2330] text-[#92adc9] p-2 rounded-lg border border-[#2a3540] hover:bg-[#2a3540] transition-colors z-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-[#1a2330] border border-[#2a3540] rounded-lg shadow-2xl z-50 w-80 max-h-[80vh] overflow-auto">
      <div className="sticky top-0 bg-[#1a2330] border-b border-[#2a3540] p-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Performance Metrics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-[#92adc9] hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Web Vitals */}
        <div>
          <h4 className="text-xs font-medium text-[#92adc9] mb-2">Web Vitals</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#131b23] p-2 rounded">
              <div className="text-[#92adc9]">LCP</div>
              <div className={getMetricColor(metrics.lcp || 0, { good: 2500, poor: 4000 })}>
                {metrics.lcp ? `${(metrics.lcp / 1000).toFixed(2)}s` : '-'}
              </div>
            </div>
            <div className="bg-[#131b23] p-2 rounded">
              <div className="text-[#92adc9]">FID</div>
              <div className={getMetricColor(metrics.fid || 0, { good: 100, poor: 300 })}>
                {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : '-'}
              </div>
            </div>
            <div className="bg-[#131b23] p-2 rounded">
              <div className="text-[#92adc9]">CLS</div>
              <div className={getMetricColor(metrics.cls || 0, { good: 0.1, poor: 0.25 })}>
                {metrics.cls !== null ? metrics.cls.toFixed(3) : '-'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Memory */}
        <div>
          <h4 className="text-xs font-medium text-[#92adc9] mb-2">Memory Usage</h4>
          <div className="bg-[#131b23] p-2 rounded text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[#92adc9]">Used:</span>
              <span className="text-white">{formatBytes(metrics.usedJSHeapSize)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#92adc9]">Total:</span>
              <span className="text-white">{formatBytes(metrics.totalJSHeapSize)}</span>
            </div>
          </div>
        </div>
        
        {/* Cache */}
        <div>
          <h4 className="text-xs font-medium text-[#92adc9] mb-2">Cache</h4>
          <div className="bg-[#131b23] p-2 rounded text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[#92adc9]">Size:</span>
              <span className="text-white">{metrics.cacheSize} entries</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#92adc9]">Hit Rate:</span>
              <span className={getMetricColor(1 - metrics.cacheHitRate, { good: 0.3, poor: 0.7 })}>
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Prediction Service */}
        <div>
          <h4 className="text-xs font-medium text-[#92adc9] mb-2">Prediction Service</h4>
          <div className="bg-[#131b23] p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#92adc9]">Calculations:</span>
              <span className="text-white">{metrics.predictionMetrics.totalCalculations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#92adc9]">Cache Hits:</span>
              <span className="text-white">{metrics.predictionMetrics.cacheHits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#92adc9]">Avg Time:</span>
              <span className="text-white">
                {metrics.predictionMetrics.averageCalculationTime.toFixed(2)}ms
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              globalCache.clear();
              updateMetrics();
            }}
            className="flex-1 bg-[#2a3540] text-[#92adc9] py-1 px-2 rounded text-xs hover:bg-[#3a4550] transition-colors"
          >
            Clear Cache
          </button>
          <button
            onClick={updateMetrics}
            className="flex-1 bg-[#2a3540] text-[#92adc9] py-1 px-2 rounded text-xs hover:bg-[#3a4550] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 開発環境でのみ表示するパフォーマンスインジケーター
 */
export function DevPerformanceIndicator() {
  if (process.env.NODE_ENV === 'production') return null;
  
  return <PerformanceDashboard />;
}

export default DevPerformanceIndicator;
