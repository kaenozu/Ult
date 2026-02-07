/**
 * BacktestResultsDashboard.tsx
 *
 * バックテスト結果表示ダッシュボード
 * 包括的なバックテスト結果の可視化を提供します。
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import { BacktestResult, BacktestTrade } from '@/app/types';
import {
  AdvancedPerformanceMetrics,
  type AdvancedMetrics,
  type DrawdownAnalysis,
  type TradeAnalysis,
  type ReturnDistribution
} from '@/app/lib/backtest/index';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  Award,
  Percent,
  DollarSign,
  Shield,
  Zap
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface BacktestResultsDashboardProps {
  result?: BacktestResult | null;
  benchmarkReturns?: number[];
  className?: string;
}

export function BacktestResultsDashboard({
  result,
  benchmarkReturns,
  className
}: BacktestResultsDashboardProps) {
  // All hooks must be called before any early return
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate all metrics - memoized to avoid recalculation
  const metrics = useMemo(() => {
    if (!result) return null;
    return AdvancedPerformanceMetrics.calculateAllMetrics(result, benchmarkReturns);
  }, [result, benchmarkReturns]);

  // Calculate additional analyses
  const drawdownAnalysis = useMemo(() => {
    if (!result) return null;
    const equity = calculateEquityCurve(result);
    return AdvancedPerformanceMetrics.analyzeDrawdowns(equity, result.trades);
  }, [result]);

  const tradeAnalysis = useMemo(() => {
    if (!result) return null;
    return AdvancedPerformanceMetrics.analyzeTrades(result);
  }, [result]);

  const returnDistribution = useMemo(() => {
    if (!result) return null;
    // Filter undefined values and ensure type safety
    const returns = result.trades
      .map(t => t.profitPercent)
      .filter((p): p is number => typeof p === 'number');
    return AdvancedPerformanceMetrics.calculateReturnDistribution(returns);
  }, [result]);

  // Early return after all hooks are called
  if (!result || !metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          No backtest results available.
        </CardContent>
      </Card>
    );
  }

  const drawdownAnalysisValue = drawdownAnalysis ?? AdvancedPerformanceMetrics.analyzeDrawdowns([], []);
  const returnDistributionValue = returnDistribution ?? AdvancedPerformanceMetrics.calculateReturnDistribution([]);

  const rowCount = result.trades.length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">バックテスト結果</h2>
          <p className="text-sm text-gray-400">
            {result.symbol} | {result.startDate} ? {result.endDate}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MetricBadge
            label="総リターン"
            value={`${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`}
            positive={result.totalReturn > 0}
            icon={TrendingUp}
          />
          <MetricBadge
            label="シャープレシオ"
            value={metrics.sharpeRatio.toFixed(2)}
            positive={metrics.sharpeRatio > 1}
            icon={Activity}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-[#1e293b]">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="trades">取引</TabsTrigger>
          <TabsTrigger value="risk">リスク</TabsTrigger>
          <TabsTrigger value="distribution">分布</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
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
              subtitle={`期間: ${drawdownAnalysisValue.maxDrawdownDuration}日`}
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
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
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
                <div className="text-center p-4 bg-[#0f172a] rounded-lg">
                  <div className="text-2xl font-bold text-white">{metrics.sharpeRatio.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">シャープレシオ</div>
                  <div className={cn("text-xs mt-1", getSharpeRating(metrics.sharpeRatio))}>
                    {getSharpeLabel(metrics.sharpeRatio)}
                  </div>
                </div>
                <div className="text-center p-4 bg-[#0f172a] rounded-lg">
                  <div className="text-2xl font-bold text-white">{metrics.sortinoRatio.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">ソルティノレシオ</div>
                  <div className={cn("text-xs mt-1", getSharpeRating(metrics.sortinoRatio))}>
                    {getSharpeLabel(metrics.sortinoRatio)}
                  </div>
                </div>
                <div className="text-center p-4 bg-[#0f172a] rounded-lg">
                  <div className="text-2xl font-bold text-white">{metrics.calmarRatio.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">カルマーレシオ</div>
                  <div className={cn("text-xs mt-1", getSharpeRating(metrics.calmarRatio))}>
                    {getSharpeLabel(metrics.calmarRatio)}
                  </div>
                </div>
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
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          <TradeHistoryTable trades={result.trades} />
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
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
              subtitle={`頻度: ${drawdownAnalysisValue.drawdownFrequency}回`}
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

          <DrawdownAnalysisPanel analysis={drawdownAnalysisValue} />
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <ReturnDistributionPanel distribution={returnDistributionValue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateEquityCurve(result: BacktestResult): number[] {
  const equity: number[] = [100];
  let currentEquity = 100;

  for (const trade of result.trades) {
    if (trade.profitPercent !== undefined) {
      currentEquity *= (1 + trade.profitPercent / 100);
      equity.push(parseFloat(currentEquity.toFixed(2)));
    }
  }

  return equity;
}

function getSharpeRating(sharpe: number): string {
  if (sharpe > 2) return 'text-green-400';
  if (sharpe > 1) return 'text-blue-400';
  if (sharpe > 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

function getSharpeLabel(sharpe: number): string {
  if (sharpe > 2) return '優秀';
  if (sharpe > 1) return '良好';
  if (sharpe > 0.5) return '普通';
  return '改善必要';
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({
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

function MetricBadge({
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

function TradeHistoryTable({ trades }: { trades: BacktestTrade[] }) {
  const [sortField, setSortField] = useState<keyof BacktestTrade>('exitDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [trades, sortField, sortDirection]);

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          取引履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left py-2 text-gray-400">日付</th>
                <th className="text-left py-2 text-gray-400">タイプ</th>
                <th className="text-right py-2 text-gray-400">エントリー</th>
                <th className="text-right py-2 text-gray-400">イグジット</th>
                <th className="text-right py-2 text-gray-400">P&L</th>
                <th className="text-left py-2 text-gray-400">理由</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.slice(0, 20).map((trade, index) => (
                <tr key={index} className="border-b border-[#334155]/50">
                  <td className="py-2 text-gray-300">{trade.exitDate}</td>
                  <td className="py-2">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {trade.type === 'BUY' ? '買い' : '売り'}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-300">\{trade.entryPrice.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-300">{trade.exitPrice?.toLocaleString()}</td>
                  <td className={cn(
                    "py-2 text-right font-medium",
                    (trade.profitPercent || 0) > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {(trade.profitPercent || 0) > 0 ? '+' : ''}{(trade.profitPercent || 0).toFixed(2)}%
                  </td>
                  <td className="py-2 text-gray-400 text-xs">{trade.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trades.length > 20 && (
          <p className="text-center text-xs text-gray-500 mt-4">
            最新20件を表示 / 全{trades.length}件
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DrawdownAnalysisPanel({ analysis }: { analysis: DrawdownAnalysis }) {
  return (
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
              <div className="text-lg font-bold text-red-400">-{analysis.maxDrawdown}%</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <div className="text-xs text-gray-400">開始日</div>
              <div className="text-sm font-medium text-white">{analysis.maxDrawdownStart}</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <div className="text-xs text-gray-400">終了日</div>
              <div className="text-sm font-medium text-white">{analysis.maxDrawdownEnd}</div>
            </div>
            <div className="p-3 bg-[#0f172a] rounded-lg">
              <div className="text-xs text-gray-400">回復期間</div>
              <div className="text-lg font-bold text-yellow-400">{analysis.recoveryDuration}日</div>
            </div>
          </div>

          {analysis.drawdowns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">ドローダウン履歴</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.drawdowns.slice(0, 10).map((dd, index) => (
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
  );
}

function ReturnDistributionPanel({ distribution }: { distribution: ReturnDistribution }) {
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
              <div className="p-2 bg-[#0f172a] rounded text-center">
                <div className="text-xs text-gray-400">5%</div>
                <div className="text-sm font-bold text-red-400">{distribution.percentiles.p5.toFixed(2)}%</div>
              </div>
              <div className="p-2 bg-[#0f172a] rounded text-center">
                <div className="text-xs text-gray-400">25%</div>
                <div className="text-sm font-bold text-yellow-400">{distribution.percentiles.p25.toFixed(2)}%</div>
              </div>
              <div className="p-2 bg-[#0f172a] rounded text-center">
                <div className="text-xs text-gray-400">50%</div>
                <div className="text-sm font-bold text-white">{distribution.percentiles.p50.toFixed(2)}%</div>
              </div>
              <div className="p-2 bg-[#0f172a] rounded text-center">
                <div className="text-xs text-gray-400">75%</div>
                <div className="text-sm font-bold text-blue-400">{distribution.percentiles.p75.toFixed(2)}%</div>
              </div>
              <div className="p-2 bg-[#0f172a] rounded text-center">
                <div className="text-xs text-gray-400">95%</div>
                <div className="text-sm font-bold text-green-400">{distribution.percentiles.p95.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BacktestResultsDashboard;

