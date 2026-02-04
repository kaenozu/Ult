'use client';

import dynamic from 'next/dynamic';

export const LazyBacktestPanel = dynamic(() => import('../BacktestPanel'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#141e27] p-4 flex flex-col gap-3 h-full animate-pulse">
      <div className="flex justify-between items-center text-xs">
        <div className="h-4 w-24 bg-[#233648] rounded" />
        <div className="h-4 w-12 bg-[#233648] rounded" />
      </div>
      <div className="flex-1 bg-[#192633]/50 rounded-lg border border-[#233648]" />
    </div>
  ),
});
