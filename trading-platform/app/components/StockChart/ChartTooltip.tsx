/**
 * ChartTooltip.tsx
 * 
 * チャート上のツールチップ表示コンポーネント
 */

import React from 'react';

interface TooltipData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartTooltipProps {
  visible: boolean;
  data: TooltipData | null;
  pos: { x: number; y: number };
  containerWidth: number;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ visible, data, pos, containerWidth }) => {
  if (!visible || !data) return null;

  return (
    <div
      className="absolute z-50 bg-[#1a2632] border border-[#233648] rounded-lg p-3 shadow-lg pointer-events-none"
      style={{
        left: Math.min(pos.x + 10, (containerWidth || 300) - 150),
        top: Math.max(pos.y - 100, 10),
      }}
    >
      <div className="text-xs text-[#92adc9] mb-1">{data.time}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-400">始:</span>
        <span className="text-white">¥{data.open.toLocaleString()}</span>
        <span className="text-gray-400">高:</span>
        <span className="text-green-400">¥{data.high.toLocaleString()}</span>
        <span className="text-gray-400">安:</span>
        <span className="text-red-400">¥{data.low.toLocaleString()}</span>
        <span className="text-gray-400">終:</span>
        <span className="text-white">¥{data.close.toLocaleString()}</span>
      </div>
    </div>
  );
};
