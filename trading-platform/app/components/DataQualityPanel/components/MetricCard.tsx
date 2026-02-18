import React from 'react';
import { cn } from '@/app/lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  icon?: React.ElementType;
  trend?: number;
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  icon: Icon,
  trend,
  description
}) => {
  const statusColors = {
    excellent: 'bg-green-500/10 border-green-500/30 text-green-400',
    good: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    fair: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    poor: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={cn('p-4 rounded-lg border transition-all duration-300', statusColors[status])}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span className="text-[10px] uppercase tracking-wider text-[#92adc9]">{title}</span>
        </div>
        {trend !== undefined && (
          <span className={cn(
            'text-[10px] font-bold',
            trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-gray-400'
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white">{value}</span>
        {unit && <span className="text-xs text-[#92adc9]">{unit}</span>}
      </div>
      {description && (
        <p className="text-[10px] text-[#92adc9] mt-1">{description}</p>
      )}
    </div>
  );
};
