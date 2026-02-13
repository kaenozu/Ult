import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { AdvancedMetrics, DrawdownAnalysis } from '@/app/lib/backtest/index';
import { AlertTriangle, TrendingDown, Activity, Shield } from 'lucide-react';
import { MetricCard } from './Shared';

interface RiskTabProps {
  metrics: AdvancedMetrics;
  drawdownAnalysis: DrawdownAnalysis;
}

export function RiskTab({ metrics, drawdownAnalysis }: RiskTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="最大ドローダウン"
          value={`-${metrics.maxDrawdown.toFixed(2)}%`}
          subtitle={`期間: ${metrics.maxDrawdownDuration}日`}
          icon={AlertTriangle}
          positive={false}
        />
        <MetricCard
          title="平均ドローダウン"
          value={`-${metrics.averageDrawdown.toFixed(2)}%`}
          subtitle={`頻度: ${drawdownAnalysis.drawdownFrequency}回`}
          icon={TrendingDown}
          positive={false}
        />
        <MetricCard
          title="アルサー指数"
          value={metrics.ulcerIndex.toFixed(2)}
          subtitle="深さと期間の組み合わせ"
          icon={Activity}
          positive={metrics.ulcerIndex < 5}
        />
        <MetricCard
          title="VaR (95%)"
          value={`${metrics.valueAtRisk95.toFixed(2)}%`}
          subtitle="1日の最大損失想定"
          icon={Shield}
          positive={metrics.valueAtRisk95 > -5}
        />
      </div>

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            ドローダウン分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <div className="text-xs text-gray-400">最大ドローダウン</div>
                <div className="text-lg font-bold text-red-400">-{drawdownAnalysis.maxDrawdown}%</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <div className="text-xs text-gray-400">開始日</div>
                <div className="text-sm font-medium text-white">{drawdownAnalysis.maxDrawdownStart}</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <div className="text-xs text-gray-400">終了日</div>
                <div className="text-sm font-medium text-white">{drawdownAnalysis.maxDrawdownEnd}</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded-lg">
                <div className="text-xs text-gray-400">回復期間</div>
                <div className="text-lg font-bold text-yellow-400">{drawdownAnalysis.recoveryDuration}日</div>
              </div>
            </div>

            {drawdownAnalysis.drawdowns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-3">ドローダウン履歴</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {drawdownAnalysis.drawdowns.slice(0, 10).map((dd, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#0f172a] rounded">
                      <div className="text-xs text-gray-400">
                        {dd.startDate} ? {dd.endDate}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-500">{dd.duration}日</div>
                        <div className="text-sm font-bold text-red-400">-{dd.drawdownPercent}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
