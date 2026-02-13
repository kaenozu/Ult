import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { ReturnDistribution } from '@/app/lib/backtest/index';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface DistributionTabProps {
  distribution: ReturnDistribution;
}

export function DistributionTab({ distribution }: DistributionTabProps) {
  const maxCount = Math.max(...distribution.histogram.map(h => h.count));

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          リターン分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Histogram */}
          <div className="space-y-2">
            {distribution.histogram.map((bin, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-400 text-right">
                  {bin.binStart.toFixed(1)}% ? {bin.binEnd.toFixed(1)}%
                </div>
                <div className="flex-1 h-6 bg-[#0f172a] rounded overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      bin.binStart >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'
                    )}
                    style={{ width: `${(bin.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-400 text-right">
                  {bin.count}
                </div>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#0f172a] rounded-lg text-center">
              <div className="text-xs text-gray-400">平均</div>
              <div className="text-lg font-bold text-white">{distribution.stats.mean.toFixed(2)}%</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg text-center">
              <div className="text-xs text-gray-400">中央値</div>
              <div className="text-lg font-bold text-white">{distribution.stats.median.toFixed(2)}%</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg text-center">
              <div className="text-xs text-gray-400">標準偏差</div>
              <div className="text-lg font-bold text-white">{distribution.stats.stdDev.toFixed(2)}%</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg text-center">
              <div className="text-xs text-gray-400">歪度</div>
              <div className={cn(
                "text-lg font-bold",
                distribution.stats.skewness > 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {distribution.stats.skewness.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Percentiles */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">パーセンタイル</h4>
            <div className="grid grid-cols-5 gap-2">
              <PercentileItem label="5%" value={distribution.percentiles.p5} color="text-red-400" />
              <PercentileItem label="25%" value={distribution.percentiles.p25} color="text-yellow-400" />
              <PercentileItem label="50%" value={distribution.percentiles.p50} color="text-white" />
              <PercentileItem label="75%" value={distribution.percentiles.p75} color="text-blue-400" />
              <PercentileItem label="95%" value={distribution.percentiles.p95} color="text-green-400" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PercentileItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-2 bg-[#0f172a] rounded text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={cn("text-sm font-bold", color)}>{value.toFixed(2)}%</div>
    </div>
  );
}
