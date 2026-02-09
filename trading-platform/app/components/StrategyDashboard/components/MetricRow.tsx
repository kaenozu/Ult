/**
 * MetricRow Component
 * 
 * メトリック行表示コンポーネント
 */

import React, { memo } from 'react';

interface MetricRowProps {
  label: string;
  value: string;
  positive: boolean;
}

/**
 * メトリック行コンポーネント
 */
export const MetricRow = memo(function MetricRow({
  label,
  value,
  positive,
}: MetricRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          positive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
});
