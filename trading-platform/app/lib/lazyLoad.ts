/**
 * Lazy Loading Utilities
 * 
 * コード分割と遅延ロードのユーティリティ
 */

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { LoadingStates } from '@/app/components/ui/LoadingStates';

// ============================================================================
// Lazy Loading Helper
// ============================================================================

interface LazyLoadOptions {
  fallback?: ReactNode;
  delay?: number;
}

/**
 * コンポーネントを遅延ロード
 * @param importFn - 動的import関数
 * @param options - オプション
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const { fallback = <LoadingStates.LoadingSpinner />, delay = 0 } = options;
  
  const LazyComponent = lazy(() => {
    if (delay > 0) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(importFn());
        }, delay);
      });
    }
    return importFn();
  });
  
  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================================
// Component Lazy Loaders
// ============================================================================

/**
 * 重いコンポーネントを遅延ロード
 */
export const LazyComponents = {
  // チャート関連（重いため優先的に遅延ロード）
  StockChart: lazyLoad(() => import('@/app/components/StockChart'), {
    fallback: <LoadingStates.ChartSkeleton />,
  }),
  
  SimpleRSIChart: lazyLoad(() => import('@/app/components/SimpleRSIChart'), {
    fallback: <LoadingStates.ChartSkeleton />,
  }),
  
  RSIChart: lazyLoad(() => import('@/app/components/RSIChart'), {
    fallback: <LoadingStates.ChartSkeleton />,
  }),
  
  // ダッシュボード（初期表示不要）
  TradingPsychologyDashboard: lazyLoad(
    () => import('@/app/components/TradingPsychologyDashboard'),
    { fallback: <LoadingStates.DashboardSkeleton /> }
  ),
  
  MLPerformanceDashboard: lazyLoad(
    () => import('@/app/components/MLPerformanceDashboard'),
    { fallback: <LoadingStates.DashboardSkeleton /> }
  ),
  
  BacktestResultsDashboard: lazyLoad(
    () => import('@/app/components/backtest/BacktestResultsDashboard'),
    { fallback: <LoadingStates.DashboardSkeleton /> }
  ),
  
  // その他の重いコンポーネント
  SignalPanel: lazyLoad(() => import('@/app/components/SignalPanel'), {
    fallback: <LoadingStates.PanelSkeleton />,
  }),
  
  RiskMonitoringDashboard: lazyLoad(
    () => import('@/app/components/RiskMonitoringDashboard'),
    { fallback: <LoadingStates.DashboardSkeleton /> }
  ),
  
  PatternAnalysisPanel: lazyLoad(
    () => import('@/app/components/PatternAnalysisPanel'),
    { fallback: <LoadingStates.PanelSkeleton /> }
  ),
  
  SentimentPanel: lazyLoad(() => import('@/app/components/SentimentPanel'), {
    fallback: <LoadingStates.PanelSkeleton />,
  }),
};

// ============================================================================
// Route-based Code Splitting
// ============================================================================

/**
 * Next.jsのdynamic importラッパー
 */
export const PageComponents = {
  // 認証ページ
  LoginPage: lazyLoad(() => import('@/app/login/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
  
  // メインページ
  DashboardPage: lazyLoad(() => import('@/app/dashboard/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
  
  // ポートフォリオページ
  PortfolioPage: lazyLoad(() => import('@/app/portfolio/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
  
  // 取引履歴ページ
  OrdersPage: lazyLoad(() => import('@/app/orders/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
  
  // 設定ページ
  SettingsPage: lazyLoad(() => import('@/app/settings/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
  
  // 分析ページ
  AnalysisPage: lazyLoad(() => import('@/app/analysis/page'), {
    fallback: <LoadingStates.PageSkeleton />,
  }),
};

// ============================================================================
// Preload Utilities
// ============================================================================

/**
 * コンポーネントをプリロード
 * @param importFn - 動的import関数
 */
export function preloadComponent<T>(importFn: () => Promise<T>): void {
  // ブラウザのアイドル時にプリロード
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      importFn();
    });
  } else {
    // requestIdleCallbackがない場合はsetTimeout
    setTimeout(() => {
      importFn();
    }, 1);
  }
}

/**
 * 次のページをプリロード
 */
export function preloadNextPage(pagePath: string): void {
  preloadComponent(() => import(/* @vite-ignore */ pagePath));
}

// ============================================================================
// Route Preloading
// ============================================================================

/**
 * 予測可能なルートをプリロード
 */
export function setupRoutePreloading(): void {
  if (typeof window === 'undefined') return;
  
  // リンクホバー時にプリロード
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href^="/"]');
    
    if (link) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http')) {
        // プリロードをスロットル（過剰なプリロードを防ぐ）
        throttlePreload(() => {
          preloadNextPage(href);
        }, 100);
      }
    }
  });
}

let preloadTimeout: ReturnType<typeof setTimeout> | null = null;

function throttlePreload(fn: () => void, delay: number): void {
  if (preloadTimeout) {
    clearTimeout(preloadTimeout);
  }
  
  preloadTimeout = setTimeout(() => {
    fn();
    preloadTimeout = null;
  }, delay);
}

// ============================================================================
// Webpack Magic Comments
// ============================================================================

/**
 * チャンク名を指定した動的インポート
 */
export function importWithChunkName<T>(
  importFn: () => Promise<T>,
  chunkName: string
): Promise<T> {
  // webpackのmagic commentsを使用
  return import(
    /* webpackChunkName: "[request]" */
    /* webpackMode: "lazy" */
    // @ts-ignore
    importFn()
  );
}

// ============================================================================
// Critical CSS Extraction Helper
// ============================================================================

/**
 * クリティカルCSSを抽出
 * （SSR時に使用）
 */
export function extractCriticalCSS(): string {
  if (typeof window === 'undefined') return '';
  
  // 使用されたスタイルのみを抽出
  const styles: string[] = [];
  const styleSheets = document.styleSheets;
  
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const sheet = styleSheets[i];
      const rules = sheet.cssRules || sheet.rules;
      
      for (let j = 0; j < rules.length; j++) {
        styles.push(rules[j].cssText);
      }
    } catch (e) {
      // cross-origin stylesheetはスキップ
    }
  }
  
  return styles.join('\n');
}

// ============================================================================
// Bundle Analysis Helpers
// ============================================================================

/**
 * チャンクサイズをログ
 * （開発環境のみ）
 */
export function logChunkSizes(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  if (typeof window !== 'undefined' && 'performance' in window) {
    const resources = performance.getEntriesByType('resource');
    
    resources.forEach((resource) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        console.log(`[Bundle] ${resource.name}: ${(resource as any).transferSize} bytes`);
      }
    });
  }
}

// ============================================================================
// Prefetch Strategies
// ============================================================================

/**
 * データの先読み戦略
 */
export const PrefetchStrategies = {
  /**
   * 次に表示される可能性が高いデータを先読み
   */
  nextLikelyData(): void {
    // 実装はアプリケーション固有
  },
  
  /**
   * ユーザーがよく見るデータを先読み
   */
  userFavorites(userId: string): void {
    // 実装はアプリケーション固有
  },
  
  /**
   * 時間帯に基づく先読み
   */
  timeBased(): void {
    const hour = new Date().getHours();
    
    // 取引時間中は市場データを優先
    if (hour >= 9 && hour <= 15) {
      // 市場データを先読み
    }
  },
};
