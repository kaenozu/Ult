import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { BacktestResult } from '@/app/types';
import { AdvancedMetrics, DrawdownAnalysis } from '@/app/lib/backtest/index';
import { TrendingUp, Target, BarChart3, AlertTriangle, Activity, Clock } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { MetricCard } from './Shared';

interface OverviewTabProps {
  result: BacktestResult;
  metrics: AdvancedMetrics;
  drawdownAnalysis: DrawdownAnalysis;
}

export function OverviewTab({ result, metrics, drawdownAnalysis }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="総リターン"
          value={`${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`}
          subtitle={`年率: ${metrics.annualizedReturn.toFixed(1)}%`}
          icon={TrendingUp}
          positive={result.totalReturn > 0}
        />
        <MetricCard
          title="勝率"
          value={`${result.winRate}%`}
          subtitle={`${result.winningTrades}勝 / ${result.losingTrades}敗`}
          icon={Target}
          positive={result.winRate > 50}
        />
        <MetricCard
          title="プロフィットファクター"
          value={result.profitFactor?.toFixed(2) || '0.00'}
          subtitle={`ペイオフ比: ${metrics.payoffRatio.toFixed(2)}`}
          icon={BarChart3}
          positive={(result.profitFactor || 0) > 1}
        />
        <MetricCard
          title="最大ドローダウン"
          value={`-${result.maxDrawdown}%`}
          subtitle={`期間: ${drawdownAnalysis.maxDrawdownDuration}日`}
          icon={AlertTriangle}
          positive={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              取引サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">総取引数</span>
                  <span className="text-white font-medium">{result.totalTrades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">勝ちトレード</span>
                  <span className="text-green-400 font-medium">{result.winningTrades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">負けトレード</span>
                  <span className="text-red-400 font-medium">{result.losingTrades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">連勝記録</span>
                  <span className="text-green-400 font-medium">{metrics.maxConsecutiveWins}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">連敗記録</span>
                  <span className="text-red-400 font-medium">{metrics.maxConsecutiveLosses}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">平均利益</span>
                  <span className="text-green-400 font-medium">+{result.avgProfit?.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">平均損失</span>
                  <span className="text-red-400 font-medium">{result.avgLoss?.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">最大利益</span>
                  <span className="text-green-400 font-medium">+{metrics.largestWin.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">最大損失</span>
                  <span className="text-red-400 font-medium">{metrics.largestLoss.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">期待値</span>
                  <span className={cn("font-medium", metrics.expectancy > 0 ? 'text-green-400' : 'text-red-400')}>
                    {metrics.expectancy > 0 ? '+' : ''}{metrics.expectancy.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              保有期間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">平均保有期間</span>
                <span className="text-white font-medium">{metrics.averageHoldingPeriod.toFixed(1)} 日</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">勝ちトレード平均</span>
                <span className="text-green-400 font-medium">{metrics.averageWinHoldingPeriod.toFixed(1)} 日</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">負けトレード平均</span>
                <span className="text-red-400 font-medium">{metrics.averageLossHoldingPeriod.toFixed(1)} 日</span>
              </div>
              <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-red-500"
                  style={{
                    width: '100%',
                    background: `linear-gradient(to right, #22c55e ${metrics.winRate}%, #ef4444 ${metrics.winRate}%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>勝率 {metrics.winRate.toFixed(1)}%</span>
                <span>敗率 {metrics.lossRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
