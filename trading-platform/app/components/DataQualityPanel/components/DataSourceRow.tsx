import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { formatLatency } from '../utils';
import { DataSourceHealth } from '../types';

export interface DataSourceRowProps {
  name: string;
  health: DataSourceHealth;
}

export const DataSourceRow: React.FC<DataSourceRowProps> = ({ name, health }) => {
  // Render status icon directly to avoid creating components during render
  const renderStatusIcon = () => {
    const iconClass = cn('w-4 h-4 shrink-0',
      health.status === 'healthy' ? 'text-green-400' :
        health.status === 'degraded' ? 'text-yellow-400' :
          'text-red-400'
    );

    switch (health.status) {
      case 'healthy':
        return <CheckCircle2 className={iconClass} />;
      case 'degraded':
        return <AlertTriangle className={iconClass} />;
      case 'offline':
      default:
        return <WifiOff className={iconClass} />;
    }
  };

  const statusColorClass =
    health.status === 'healthy' ? 'text-green-400' :
      health.status === 'degraded' ? 'text-yellow-400' :
        'text-red-400';

  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-[#1a1a2e] rounded-lg border border-[#233648]">
      {renderStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">{name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f3460] text-[#92adc9]">
            {health.qualityScore.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn('text-[10px]', statusColorClass)}>
            {health.status === 'healthy' ? '正常' : health.status === 'degraded' ? '劣化' : 'オフライン'}
          </span>
          <span className="text-[10px] text-[#92adc9]">·</span>
          <span className="text-[10px] text-[#92adc9]">{formatLatency(health.latency)}</span>
        </div>
      </div>
    </div>
  );
};
