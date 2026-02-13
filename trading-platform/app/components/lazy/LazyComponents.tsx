'use client';

import dynamic from 'next/dynamic';

const PanelSkeleton = () => (
  <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full animate-pulse">
    <div className="flex justify-between items-center text-xs">
      <div className="h-4 w-24 bg-[#233648] rounded" />
      <div className="h-4 w-12 bg-[#233648] rounded" />
    </div>
    <div className="flex-1 bg-[#192633]/50 rounded-lg border border-[#233648]" />
  </div>
);

export const LazyBacktestPanel = dynamic(() => import('../BacktestPanel'), {
  ssr: false,
  loading: PanelSkeleton,
});

export const LazyRiskPanel = dynamic(() => import('../RiskPanel').then(mod => mod.RiskPanel), {
  ssr: false,
  loading: PanelSkeleton,
});

export const LazyAlertPanel = dynamic(() => import('../AlertPanel').then(mod => mod.AlertPanel), {
  ssr: false,
  loading: PanelSkeleton,
});

export const LazyMarketDataPanel = dynamic(() => import('../MarketDataPanel').then(mod => mod.MarketDataPanel), {
  ssr: false,
  loading: PanelSkeleton,
});
