'use client';

import { useMemo, memo } from 'react';
import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

interface SimpleRSIChartProps {
  data: OHLCV[];
  height?: number;
}

export const SimpleRSIChart = memo(function SimpleRSIChart({ data, height = 96 }: SimpleRSIChartProps) {
  const rsiValues = useMemo(() => {
    if (!data || data.length === 0) return [];
    const closes = data.map(d => d.close);
    return technicalIndicatorService.calculateRSI(closes, 14);
  }, [data]);

  const points = useMemo(() => {
    if (!data || data.length === 0) return '';

    // Render only valid points
    // Map index 0 to x=0, index length-1 to x=width
    const width = 1000;

    return rsiValues.map((val, i) => {
      if (isNaN(val)) return null;
      const x = (i / (data.length - 1)) * width;
      const y = height - ((Math.max(0, Math.min(100, val))) / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean).join(' ');
  }, [rsiValues, data, height]);

  if (!data || data.length === 0) return null;

  // Map index 0 to x=0, index length-1 to x=width
  const width = 1000;

  return (
    <div className="w-full h-full relative">
        <span className="absolute top-1 left-2 text-[10px] text-[#92adc9] font-medium z-10">RSI (14)</span>

        {/* Threshold Lines (70 and 30) */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="w-full border-t border-dashed border-[#92adc9]/30 absolute" style={{ top: '30%' }}></div>
            <div className="w-full border-t border-dashed border-[#92adc9]/30 absolute" style={{ top: '70%' }}></div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    </div>
  );
});
