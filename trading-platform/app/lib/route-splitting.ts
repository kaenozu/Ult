/**
 * Route-based Code Splitting Configuration
 * 
 * ルートごとに最適なコード分割とプリフェッチ戦略を定義
 */

import { lazy, ComponentType } from 'react';
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';

// ルート優先度定義
type RoutePriority = 'critical' | 'important' | 'normal' | 'low';

interface RouteConfig {
  component: () => Promise<{ default: ComponentType<any> }>;
  priority: RoutePriority;
  preload?: boolean;
  prefetchOnHover?: boolean;
}

// ルート設定
export const routeConfigs: Record<string, RouteConfig> = {
  // クリティカル: 最初に必要
  '/': {
    component: () => import('@/app/page'),
    priority: 'critical',
    preload: true,
  },
  
  // 重要: よくアクセスされる
  '/portfolio': {
    component: () => import('@/app/portfolio/page'),
    priority: 'important',
    prefetchOnHover: true,
  },
  '/journal': {
    component: () => import('@/app/journal/page'),
    priority: 'important',
    prefetchOnHover: true,
  },
  
  // 通常: 必要になったら読み込み
  '/ai-advisor': {
    component: () => import('@/app/ai-advisor/page'),
    priority: 'normal',
  },
};

// 優先度に基づいてコンポーネントをlazy load
export function createLazyRoute(path: string) {
  const config = routeConfigs[path];
  if (!config) {
    devWarn(`No route config found for: ${path}`);
    return null;
  }
  
  return lazy(config.component);
}

// 重要なルートをプリロード
export function preloadCriticalRoutes() {
  Object.entries(routeConfigs).forEach(([path, config]) => {
    if (config.priority === 'critical' || config.preload) {
      // requestIdleCallbackを使用して、ブラウザがアイドル時に読み込み
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          config.component();
        });
      } else {
        setTimeout(() => {
          config.component();
        }, 100);
      }
    }
  });
}

// ホバー時にプリフェッチ
export function prefetchRouteOnHover(path: string) {
  const config = routeConfigs[path];
  if (config?.prefetchOnHover) {
    config.component();
  }
}

// 現在のルートに基づいて次に必要なルートをプリフェッチ
export function prefetchNextRoutes(currentPath: string) {
  // ポートフォリオページからはジャーナルとバックテストをプリフェッチ
  if (currentPath === '/portfolio') {
    prefetchRoute('/journal');
    prefetchRoute('/backtest');
  }
  
  // ジャーナルからはポートフォリオをプリフェッチ
  if (currentPath === '/journal') {
    prefetchRoute('/portfolio');
  }
}

function prefetchRoute(path: string) {
  const config = routeConfigs[path];
  if (config) {
    config.component();
  }
}

/**
 * コンポーネント別のロード戦略
 */
export const componentLoadStrategies = {
  // 即座に読み込み（上にスクロールした時に必要）
  immediate: [
    'Header',
    'Navigation',
    'StockChart',
  ],
  
  // スクロールで表示された時に読み込み
  onScroll: [
    'BottomPanel',
    'RightSidebar',
    'PerformanceMetrics',
  ],
  
  // インタラクション後に読み込み
  onInteraction: [
    'SettingsPanel',
    'DataExport',
    'AdvancedChartTools',
  ],
  
  // 必要になった時に読み込み
  onDemand: [
    'AIAdvisor',
    'BacktestEngine',
    'MLTrainingPanel',
  ],
};

/**
 * チャンクサイズ最適化設定
 */
export const chunkOptimization = {
  // 最大チャンクサイズ（バイト）
  maxSize: 244 * 1024, // 244KB（gzip後200KB以下を目標）
  
  // 最小チャンクサイズ
  minSize: 20 * 1024, // 20KB
  
  // 分割対象のライブラリ
  vendors: [
    '@tensorflow/tfjs',
    'chart.js',
    'react-chartjs-2',
    'recharts',
    'date-fns',
    'lodash',
  ],
  
  // 共通用のチャンク
  commons: {
    // React関連
    react: ['react', 'react-dom'],
    // UIコンポーネント
    ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    // 状態管理
    state: ['zustand', '@tanstack/react-query'],
  },
};
