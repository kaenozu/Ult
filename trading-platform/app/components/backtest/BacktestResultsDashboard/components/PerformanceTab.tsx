import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { AdvancedMetrics } from '@/app/lib/backtest/index';
import { Activity, TrendingDown, Shield, Zap, PieChart, Percent, Award } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { MetricCard } from './Shared';

interface PerformanceTabProps {
  metrics: AdvancedMetrics;
}

export function PerformanceTab({ metrics }: PerformanceTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          title="シャープレシオ"
          value={metrics.sharpeRatio.toFixed(2)}
          subtitle="リスク調整後リターン"
          icon={Activity}
          positive={metrics.sharpeRatio > 1}
        />
        <MetricCard
          title="ソルティノレシオ"
          value={metrics.sortinoRatio.toFixed(2)}
          subtitle="下方リスク調整後"
          icon={TrendingDown}
          positive={metrics.sortinoRatio > 1}
        />
        <MetricCard
          title="カルマーレシオ"
          value={metrics.calmarRatio.toFixed(2)}
          subtitle="最大DD調整後"
          icon={Shield}
          positive={metrics.calmarRatio > 1}
        />
        <MetricCard
          title="リカバリーファクター"
          value={metrics.recoveryFactor.toFixed(2)}
          subtitle="リターン / 最大DD"
          icon={Zap}
          positive={metrics.recoveryFactor > 1}
        />
        <MetricCard
          title="オメガレシオ"
          value={metrics.omegaRatio.toFixed(2)}
          subtitle="上方ポテンシャル / 下方リスク"
          icon={PieChart}
          positive={metrics.omegaRatio > 1}
        />
        <MetricCard
          title="ペイントレシオ"
          value={metrics.painRatio.toFixed(2)}
          subtitle="アルサー指数調整後"
          icon={Percent}
          positive={metrics.painRatio > 1}
        />
      </div>

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            リスク調整後パフォーマンス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PerformanceMetricItem label="シャープレシオ" value={metrics.sharpeRatio} />
            <PerformanceMetricItem label="ソルティノレシオ" value={metrics.sortinoRatio} />
            <PerformanceMetricItem label="カルマーレシオ" value={metrics.calmarRatio} />
            <div className="text-center p-4 bg-[#0f172a] rounded-lg">
              <div className="text-2xl font-bold text-white">{metrics.recoveryFactor.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">リカバリーファクター</div>
              <div className={cn("text-xs mt-1", metrics.recoveryFactor > 1 ? 'text-green-400' : 'text-yellow-400')}>
                {metrics.recoveryFactor > 1 ? '良好' : '注意'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceMetricItem({ label, value }: { label: string; value: number }) {
  const getRating = (v: number) => {
    if (v > 2) return 'text-green-400';
    if (v > 1) return 'text-blue-400';
    if (v > 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLabel = (v: number) => {
    if (v > 2) return '優秀';
    if (v > 1) return '良好';
    if (v > 0.5) return '普通';
    return '改善必要';
  };

  return (
    <div className="text-center p-4 bg-[#0f172a] rounded-lg">
      <div className="text-2xl font-bold text-white">{value.toFixed(2)}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      <div className={cn("text-xs mt-1", getRating(value))}>
        {getLabel(value)}
      </div>
    </div>
  );
}
