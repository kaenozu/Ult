'use client';

import { useMemo } from 'react';

// Pre-generate deterministic heights for volume bars (outside component to avoid impure render)
const VOLUME_HEIGHTS = [45, 62, 38, 85, 23, 56, 71, 34, 67, 89, 12, 54, 76, 43, 68, 91, 28, 55, 73, 41, 69, 87, 15, 58, 82, 36, 64, 79, 47, 53];

export interface ChartLoadingProps {
  height: number;
  showVolume?: boolean;
}

export const ChartLoading = function ChartLoading({ 
  height, 
  showVolume = true 
}: ChartLoadingProps) {
  const mainHeight = height - (showVolume ? 100 : 20);
  
  // Use deterministic heights instead of random
  const volumeHeights = useMemo(() => VOLUME_HEIGHTS, []);
  
  return (
    <div className="relative w-full bg-[#131b23] border border-[#233648] rounded overflow-hidden animate-pulse">
      {/* Toolbar Skeleton */}
      <div className="h-10 bg-[#192633]/30 border-b border-[#233648] px-4 flex items-center gap-4">
        <div className="h-4 w-24 bg-[#233648]/30 rounded"></div>
        <div className="flex gap-1">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-6 w-8 bg-[#233648]/30 rounded"></div>
          ))}
        </div>
        <div className="h-4 w-32 bg-[#233648]/30 rounded"></div>
      </div>
      
      {/* Chart Area Skeleton */}
      <div className="relative" style={{ height: mainHeight }}>
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 opacity-20">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-full h-px bg-[#92adc9]" />
          ))}
        </div>
        
        {/* Fake Line Chart */}
        <div className="absolute inset-0 flex items-end px-4 pb-4">
          <svg className="w-full h-2/3" preserveAspectRatio="none">
            <path
              d={`M 0,${height * 0.6} Q ${height * 0.2},${height * 0.3} ${height * 0.4},${height * 0.5} T ${height * 0.6},${height * 0.4} T ${height},${height * 0.55}`}
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
              className="animate-pulse"
            />
          </svg>
        </div>
        
        {/* Loading Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 bg-[#1a2632]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#233648]">
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-xs text-[#92adc9]">読み込み中...</span>
          </div>
        </div>
      </div>

      {/* Volume Skeleton */}
      {showVolume && (
        <div className="h-20 border-t border-[#233648] relative bg-[#131b23]/50">
          <div className="absolute inset-0 flex items-end px-2 pb-2 gap-px opacity-30">
            {volumeHeights.map((heightValue, i) => (
              <div 
                key={i} 
                className="flex-1 bg-[#3b82f6] rounded-t-sm transition-all"
                style={{ height: `${heightValue}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
