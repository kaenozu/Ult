'use client';

import { useMemo } from 'react';
import { OHLCV } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';

interface RSIChartProps {
  data: OHLCV[];
  period?: number;
  height?: number;
  width?: string;
}

export function RSIChart({ 
  data, 
  period = 14, 
  height = 96,
  width = '100%'
}: RSIChartProps) {
  const rsiData = useMemo(() => {
    if (!data || data.length < period + 1) return [];
    
    const closes = data.map(d => d.close);
    return technicalIndicatorService.calculateRSI(closes, period);
  }, [data, period]);

  const pathD = useMemo(() => {
    if (rsiData.length === 0) return '';
    
    // Filter out NaN values and get valid data points
    const validData = rsiData
      .map((value, index) => ({ value, index }))
      .filter(item => !isNaN(item.value));
    
    if (validData.length === 0) return '';
    
    const width = 1200; // SVG viewBox width
    const height = 100; // SVG viewBox height
    
    const stepX = width / (rsiData.length - 1 || 1);
    
    // RSI ranges from 0 to 100, map to SVG coordinates (inverted Y)
    const scaleY = (rsi: number) => height - (rsi / 100) * height;
    
    // Build path using valid data points
    let path = '';
    validData.forEach((point, i) => {
      const x = point.index * stepX;
      const y = scaleY(point.value);
      
      if (i === 0) {
        path += `M${x},${y}`;
      } else {
        // Use simple line to next point
        path += ` L${x},${y}`;
      }
    });
    
    return path;
  }, [rsiData]);

  const currentRSI = useMemo(() => {
    if (rsiData.length === 0) return null;
    const validRSI = rsiData.filter(v => !isNaN(v));
    return validRSI.length > 0 ? validRSI[validRSI.length - 1] : null;
  }, [rsiData]);

  if (rsiData.length === 0) {
    return (
      <div 
        className="h-24 mt-1 border border-[#233648] rounded bg-[#131b23] relative flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-[#92adc9] text-xs">RSIデータなし</span>
      </div>
    );
  }

  return (
    <div 
      className="h-24 mt-1 border border-[#233648] rounded bg-[#131b23] relative"
      style={{ height, width }}
    >
      {/* RSI Label */}
      <span className="absolute top-1 left-2 text-[10px] text-[#92adc9] font-medium z-10">
        RSI ({period}){currentRSI !== null && `: ${currentRSI.toFixed(1)}`}
      </span>
      
      {/* Overbought/Oversold Level Lines */}
      <div className="absolute top-0 left-0 right-0 bottom-0 grid grid-rows-2 grid-cols-1 pointer-events-none">
        {/* 70 line (overbought) */}
        <div 
          className="absolute w-full border-t border-dashed opacity-30"
          style={{ top: '30%', borderColor: '#ef4444' }}
        />
        {/* 50 line (neutral) */}
        <div 
          className="absolute w-full border-t border-dashed opacity-20"
          style={{ top: '50%', borderColor: '#92adc9' }}
        />
        {/* 30 line (oversold) */}
        <div 
          className="absolute w-full border-t border-dashed opacity-30"
          style={{ top: '70%', borderColor: '#22c55e' }}
        />
      </div>
      
      {/* RSI Line Chart */}
      <svg 
        className="w-full h-full" 
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        
        {/* Current value indicator */}
        {currentRSI !== null && (
          <>
            <line
              x1="0"
              y1={100 - currentRSI}
              x2="1200"
              y2={100 - currentRSI}
              stroke="#a855f7"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
            <circle
              cx="1180"
              cy={100 - currentRSI}
              r="4"
              fill="#a855f7"
            />
          </>
        )}
      </svg>
      
      {/* Level Labels */}
      <div className="absolute right-1 top-[28%] text-[8px] text-red-400 opacity-60">70</div>
      <div className="absolute right-1 top-[48%] text-[8px] text-[#92adc9] opacity-40">50</div>
      <div className="absolute right-1 top-[68%] text-[8px] text-green-400 opacity-60">30</div>
    </div>
  );
}
