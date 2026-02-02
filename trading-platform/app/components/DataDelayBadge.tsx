'use client';

import { memo } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface DataDelayBadgeProps {
  /** Market type */
  market: 'japan' | 'usa';
  /** Whether fallback to daily data was applied */
  fallbackApplied?: boolean;
  /** Data delay in minutes */
  delayMinutes?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge component to display data delay information
 * Specifically for Japanese market data which has a 15-20 minute delay
 * and lacks intraday data support
 */
export const DataDelayBadge = memo(function DataDelayBadge({
  market,
  fallbackApplied = false,
  delayMinutes,
  size = 'md',
  className
}: DataDelayBadgeProps) {
  // Only show for Japanese market
  if (market !== 'japan') {
    return null;
  }

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5' 
    : 'text-xs px-2 py-1 gap-1';

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div className="flex items-center gap-2">
      {/* Data Delay Badge */}
      <div
        className={cn(
          'inline-flex items-center rounded font-medium',
          'bg-orange-500/10 text-orange-500 border border-orange-500/20',
          sizeClasses,
          className
        )}
        title={`Japanese market data has a ${delayMinutes || 20} minute delay due to data provider limitations`}
      >
        <Clock className="shrink-0" size={iconSize} />
        <span>遅延{delayMinutes || 20}分</span>
      </div>

      {/* Fallback Warning Badge - when intraday was requested but daily provided */}
      {fallbackApplied && (
        <div
          className={cn(
            'inline-flex items-center rounded font-medium',
            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
            sizeClasses
          )}
          title="分足データが利用できないため、日足データを表示しています"
        >
          <svg 
            className="shrink-0" 
            width={iconSize} 
            height={iconSize} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>日足のみ</span>
        </div>
      )}
    </div>
  );
});

DataDelayBadge.displayName = 'DataDelayBadge';
