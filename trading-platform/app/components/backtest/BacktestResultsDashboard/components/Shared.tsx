import React from 'react';
import { Card, CardContent } from '@/app/components/ui/Card';
import { cn } from '@/app/lib/utils';

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  positive
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  positive: boolean;
}) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">{title}</p>
            <p className={cn("text-xl font-bold mt-1", positive ? 'text-green-400' : 'text-red-400')}>
              {value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <Icon className={cn("w-5 h-5", positive ? 'text-green-400' : 'text-red-400')} />
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricBadge({
  label,
  value,
  positive,
  icon: Icon
}: {
  label: string;
  value: string;
  positive: boolean;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] rounded-lg border border-[#334155]">
      <Icon className={cn("w-4 h-4", positive ? 'text-green-400' : 'text-red-400')} />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={cn("text-sm font-bold", positive ? 'text-green-400' : 'text-red-400')}>
          {value}
        </p>
      </div>
    </div>
  );
}
