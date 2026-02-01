'use client';

import { OHLCV } from '@/app/types';
import { formatCurrency } from '@/app/lib/utils';

export interface ChartTooltipProps {
  hoveredIdx: number | null;
  data: OHLCV[];
  labels: string[];
  market: 'japan' | 'usa';
}

export const ChartTooltip = function ChartTooltip({
  hoveredIdx,
  data,
  labels,
  market,
}: ChartTooltipProps) {
  if (hoveredIdx === null || hoveredIdx >= data.length) {
    return null;
  }

  return (
    <div className="absolute top-2 left-2 z-20 bg-[#1a2632]/90 border border-[#233648] p-3 rounded shadow-xl pointer-events-none backdrop-blur-sm">
      <div className="text-xs font-black text-primary uppercase border-b border-[#233648] pb-1 mb-1">{labels[hoveredIdx]}</div>
      <div className="text-sm font-bold text-white">{formatCurrency(data[hoveredIdx].close, market === 'japan' ? 'JPY' : 'USD')}</div>
    </div>
  );
};
