/**
 * コンポーネントの動的インポート設定
 * 
 * パフォーマンス最適化のための遅延読み込みコンポーネント
 * 重いコンポーネントは必要になった時のみ読み込む
 */

import React, { lazy } from 'react';

// チャート関連（重いChart.js依存）
export const LazyStockChart = lazy(() => 
  import('@/app/components/StockChart').then(m => ({ default: m.StockChart }))
);

export const LazySimpleRSIChart = lazy(() => 
  import('@/app/components/SimpleRSIChart').then(m => ({ default: m.SimpleRSIChart }))
);

// サイドバー
export const LazyRightSidebar = lazy(() => 
  import('@/app/components/RightSidebar').then(m => ({ default: m.RightSidebar }))
);

// ボトムパネル
export const LazyBottomPanel = lazy(() => 
  import('@/app/components/BottomPanel').then(m => ({ default: m.BottomPanel }))
);

// パフォーマンス分析（重い計算を含む）
export const LazyPerformanceDashboard = lazy(() => 
  import('@/app/components/PerformanceDashboard').then(m => ({ 
    default: m.PerformanceDashboard 
  }))
);

// バックテスト（重いシミュレーション）
export const LazyBacktestPanel = lazy(() => 
  import('@/app/components/BacktestPanel').then(m => ({ default: m.BacktestPanel }))
);

// データエクスポート（大きなデータ処理）
export const LazyDataExport = lazy(() => 
  import('@/app/components/DataExportImport').then(m => ({ default: m.DataExportImport }))
);

// プレースホルダーコンポーネント（ローディング中表示）
export function ChartLoadingPlaceholder({ height = 400 }: { height?: number }) {
  return (
    <div 
      className="flex items-center justify-center bg-[#131b23] animate-pulse"
      style={{ height }}
    >
      <div className="w-12 h-12 border-4 border-[#2a3540] border-t-[#4a5560] rounded-full animate-spin" />
    </div>
  );
}

export function SidebarLoadingPlaceholder() {
  return (
    <div className="w-80 h-full bg-[#131b23] animate-pulse p-4">
      <div className="h-8 bg-[#1f2937] rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 bg-[#1f2937] rounded" />
        ))}
      </div>
    </div>
  );
}

export function PanelLoadingPlaceholder() {
  return (
    <div className="h-48 bg-[#131b23] animate-pulse p-4">
      <div className="h-6 bg-[#1f2937] rounded mb-3 w-1/3" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-[#1f2937] rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * ルートベースのコード分割設定
 * Next.jsのdynamic importsで使用
 */
export const routeComponents = {
  '/ai-advisor': () => import('@/app/ai-advisor/page'),
  '/portfolio': () => import('@/app/portfolio/page'),
  '/journal': () => import('@/app/journal/page'),
};

/**
 * 機能別のチャンク分割
 * webpack/viteの設定で使用
 */
export const chunkGroups = {
  // チャート関連（Chart.js依存）
  charts: [
    '@/app/components/StockChart',
    '@/app/components/SimpleRSIChart',
    '@/app/components/VolumeChart',
  ],
  
  // 分析機能（重い計算）
  analysis: [
    '@/app/components/PerformanceDashboard',
    '@/app/components/SignalPanel',
    '@/app/components/BacktestPanel',
  ],
  
  // AI機能（MLモデル）
  ai: [
    '@/app/components/AIAdvisor',
    '@/app/lib/services/enhanced-prediction-service',
  ],
  
  // データ管理
  data: [
    '@/app/components/DataExport',
    '@/app/components/DataImport',
    '@/app/components/PortfolioManager',
  ],
  
  // UIコンポーネント（軽量）
  ui: [
    '@/app/components/ui/Button',
    '@/app/components/ui/Input',
    '@/app/components/ui/Select',
    '@/app/components/ui/Modal',
  ],
};

/**
 * プリフェッチ戦略
 * ユーザーアクションを予測して事前読み込み
 */
export function prefetchComponent(componentPath: keyof typeof routeComponents) {
  const loader = routeComponents[componentPath];
  if (loader) {
    // ブラウザのアイドル時間を利用してプリフェッチ
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loader();
      });
    } else {
      setTimeout(loader, 100);
    }
  }
}

/**
 * 優先度付き読み込み
 * 重要度に応じて読み込み順序を制御
 */
export function loadComponentWithPriority(
  importFn: () => Promise<any>,
  priority: 'high' | 'low' = 'low'
) {
  if (priority === 'high') {
    // 即座に読み込み
    return importFn();
  } else {
    // アイドル時に読み込み
    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          resolve(importFn());
        });
      } else {
        setTimeout(() => resolve(importFn()), 100);
      }
    });
  }
}
