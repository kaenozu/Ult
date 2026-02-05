/**
 * Performance Configuration
 * 
 * パフォーマンス最適化の設定と定数
 */

// ============================================================================
// Image Optimization
// ============================================================================

export const IMAGE_CONFIG = {
  // 画像の最大サイズ
  maxWidth: 1920,
  maxHeight: 1080,
  
  // 品質設定
  quality: {
    low: 50,
    medium: 75,
    high: 90,
  },
  
  // フォーマット
  formats: ['webp', 'jpeg', 'png'],
  
  // プレースホルダー
  placeholder: 'blur',
  
  // 遅延読み込み
  lazyBoundary: '200px',
};

// ============================================================================
// Caching Strategies
// ============================================================================

export const CACHE_CONFIG = {
  // APIレスポンスのキャッシュ時間
  api: {
    marketData: 30 * 1000,      // 30秒
    portfolio: 60 * 1000,       // 1分
    userSettings: 5 * 60 * 1000, // 5分
    static: 24 * 60 * 60 * 1000, // 24時間
  },
  
  // ブラウザキャッシュ
  browser: {
    maxAge: '1year',
    immutable: true,
  },
  
  // Service Worker
  sw: {
    cacheName: 'trading-platform-v1',
    maxEntries: 100,
    maxAgeSeconds: 7 * 24 * 60 * 60, // 1週間
  },
};

// ============================================================================
// Performance Budgets
// ============================================================================

export const PERFORMANCE_BUDGETS = {
  // JavaScriptバンドルサイズ
  js: {
    initial: 200 * 1024,      // 200KB（初期読み込み）
    async: 500 * 1024,        // 500KB（非同期チャンク）
    total: 2 * 1024 * 1024,   // 2MB（合計）
  },
  
  // CSS
  css: {
    initial: 50 * 1024,       // 50KB
    total: 200 * 1024,        // 200KB
  },
  
  // 画像
  images: {
    perPage: 1 * 1024 * 1024, // 1MB/ページ
    perImage: 200 * 1024,     // 200KB/画像
  },
  
  // フォント
  fonts: {
    total: 300 * 1024,        // 300KB
  },
};

// ============================================================================
// Loading Priorities
// ============================================================================

export const LOADING_PRIORITIES = {
  // クリティカルリソース（即座に読み込み）
  critical: [
    'main.js',
    'main.css',
    'react',
    'react-dom',
  ],
  
  // 重要リソース（優先的に読み込み）
  important: [
    'layout.js',
    'navigation.js',
    'chart.js',
  ],
  
  // 遅延読み込み
  lazy: [
    'analysis.js',
    'backtest.js',
    'ml-models.js',
  ],
};

// ============================================================================
// Animation Settings
// ============================================================================

export const ANIMATION_CONFIG = {
  // パフォーマンスを考慮したアニメーション設定
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  // 減衰設定
  easing: {
    default: 'ease-out',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // パフォーマンス設定
  performance: {
    useTransform: true,
    useOpacity: true,
    willChange: 'transform, opacity',
  },
};

// ============================================================================
// Network Optimization
// ============================================================================

export const NETWORK_CONFIG = {
  // リクエスト設定
  request: {
    timeout: 30000,           // 30秒
    retries: 3,
    retryDelay: 1000,
  },
  
  // バッチ処理
  batch: {
    maxSize: 10,
    maxWait: 50,              // 50ms
  },
  
  // デバウンス
  debounce: {
    input: 300,
    search: 500,
    scroll: 16,               // 60fps
    resize: 100,
  },
};

// ============================================================================
// Monitoring Thresholds
// ============================================================================

export const MONITORING_THRESHOLDS = {
  // Core Web Vitals
  lcp: 2500,    // Largest Contentful Paint (2.5s)
  fid: 100,     // First Input Delay (100ms)
  cls: 0.1,     // Cumulative Layout Shift (0.1)
  fcp: 1800,    // First Contentful Paint (1.8s)
  ttfb: 800,    // Time to First Byte (800ms)
  
  // JavaScript
  longTask: 50, // Long Task (>50ms)
  
  // Memory
  heapSize: 200 * 1024 * 1024, // 200MB
};

// ============================================================================
// Feature Detection
// ============================================================================

export const FEATURE_SUPPORT = {
  // モダンブラウザ機能
  modern: {
    webp: () => {
      const elem = document.createElement('canvas');
      return elem.getContext && elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    },
    intersectionObserver: () => 'IntersectionObserver' in window,
    requestIdleCallback: () => 'requestIdleCallback' in window,
    ResizeObserver: () => 'ResizeObserver' in window,
    WebWorker: () => 'Worker' in window,
    serviceWorker: () => 'serviceWorker' in navigator,
  },
};

// ============================================================================
// Breakpoints
// ============================================================================

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  ultraWide: 1536,
};

// ============================================================================
// Export Defaults
// ============================================================================

export default {
  IMAGE_CONFIG,
  CACHE_CONFIG,
  PERFORMANCE_BUDGETS,
  LOADING_PRIORITIES,
  ANIMATION_CONFIG,
  NETWORK_CONFIG,
  MONITORING_THRESHOLDS,
  BREAKPOINTS,
};
