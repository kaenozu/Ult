'use client';

import { memo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { formatCurrency, formatPercent, cn } from '@/app/lib/utils';

export interface ChartTooltipProps {
  hoveredIdx: number | null;
  data: OHLCV[];
  labels: string[];
  market: 'japan' | 'usa';
  signal?: Signal | null;
  showSMA?: boolean;
  smaValue?: number;
}

/**
 * ChartTooltip component - memoized for performance
 * Only re-renders when hoveredIdx or relevant data changes
 */
export const ChartTooltip = memo(function ChartTooltip({
  hoveredIdx,
  data,
  labels,
  market,
  signal,
  showSMA = false,
  smaValue,
}: ChartTooltipProps) {
  if (hoveredIdx === null || hoveredIdx >= data.length) {
    return null;
  }

  const currentData = data[hoveredIdx];
  const prevData = hoveredIdx > 0 ? data[hoveredIdx - 1] : null;
  const change = prevData ? ((currentData.close - prevData.close) / prevData.close) * 100 : 0;
  const isPositive = change >= 0;

  // Calculate price range for visual indicator
  const dayRange = currentData.high - currentData.low;
  const pricePosition = dayRange > 0 ? ((currentData.close - currentData.low) / dayRange) * 100 : 50;

  return (
    <div className="absolute top-3 left-16 md:left-20 z-50 bg-[#1a2632]/95 border border-[#233648] rounded-lg shadow-2xl pointer-events-none backdrop-blur-md animate-fade-in-up min-w-[200px]">
      {/* Date/Time Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#233648]">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
          {labels[hoveredIdx]}
        </span>
        {signal && hoveredIdx === data.length - 1 && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            signal.type === 'BUY' ? "bg-green-500/20 text-green-400" :
            signal.type === 'SELL' ? "bg-red-500/20 text-red-400" :
            "bg-gray-500/20 text-gray-400"
          )}>
            {signal.type}
          </span>
        )}
      </div>

      {/* Price Info */}
      <div className="p-3 space-y-2">
        {/* Main Price */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg font-bold text-white tabular-nums">
            {formatCurrency(currentData.close, market === 'japan' ? 'JPY' : 'USD')}
          </span>
          <span className={cn(
            "text-sm font-semibold tabular-nums flex items-center gap-1",
            isPositive ? "text-green-400" : "text-red-400"
          )}>
            {isPositive ? '+' : ''}{formatPercent(change)}
            <svg className={cn("w-3 h-3", isPositive ? "text-green-400" : "text-red-400")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </span>
        </div>

        {/* OHLC Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-[#92adc9]">Open</span>
            <span className="text-white tabular-nums">{formatCurrency(currentData.open, market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92adc9]">High</span>
            <span className="text-green-400 tabular-nums">{formatCurrency(currentData.high, market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92adc9]">Low</span>
            <span className="text-red-400 tabular-nums">{formatCurrency(currentData.low, market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92adc9]">Close</span>
            <span className="text-white tabular-nums">{formatCurrency(currentData.close, market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex justify-between items-center text-xs pt-1 border-t border-[#233648]">
          <span className="text-[#92adc9]">Volume</span>
          <span className="text-white tabular-nums">
            {currentData.volume.toLocaleString()}
          </span>
        </div>

        {/* SMA Info */}
        {showSMA && smaValue && (
          <div className="flex justify-between items-center text-xs pt-1 border-t border-[#233648]">
            <span className="text-yellow-500">SMA (20)</span>
            <span className="text-yellow-500 tabular-nums">{formatCurrency(smaValue, market === 'japan' ? 'JPY' : 'USD')}</span>
          </div>
        )}

        {/* Price Position Indicator */}
        <div className="pt-1">
          <div className="flex justify-between text-[10px] text-[#92adc9] mb-1">
            <span>Day Range</span>
            <span>{formatPercent(pricePosition)}</span>
          </div>
          <div className="h-1.5 bg-[#233648] rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all",
                isPositive ? "bg-green-500" : "bg-red-500"
              )}
              style={{ width: `${pricePosition}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});