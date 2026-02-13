/**
 * BacktestResultsDashboard - エントリーポイント
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/app/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import { BacktestResult } from '@/app/types';
import { AdvancedPerformanceMetrics } from '@/app/lib/backtest/index';
import { TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/app/lib/utils';

import { MetricBadge } from './components/Shared';
import { OverviewTab } from './components/OverviewTab';
import { PerformanceTab } from './components/PerformanceTab';
import { TradesTab } from './components/TradesTab';
import { RiskTab } from './components/RiskTab';
import { DistributionTab } from './components/DistributionTab';

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
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!result) return null;
    return AdvancedPerformanceMetrics.calculateAllMetrics(result, benchmarkReturns);
  }, [result, benchmarkReturns]);

  const drawdownAnalysis = useMemo(() => {
    if (!result) return null;
    const equity = calculateEquityCurve(result);
    return AdvancedPerformanceMetrics.analyzeDrawdowns(equity, result.trades);
  }, [result]);

  const returnDistribution = useMemo(() => {
    if (!result) return null;
    const returns = result.trades
      .map(t => t.profitPercent)
      .filter((p): p is number => typeof p === 'number');
    return AdvancedPerformanceMetrics.calculateReturnDistribution(returns);
  }, [result]);

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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">バックテスト結果</h2>
          <p className="text-sm text-gray-400">
            {result.symbol} | {result.startDate} ～ {result.endDate}
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

        <TabsContent value="overview">
          <OverviewTab result={result} metrics={metrics} drawdownAnalysis={drawdownAnalysisValue} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab metrics={metrics} />
        </TabsContent>

        <TabsContent value="trades">
          <TradesTab trades={result.trades} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskTab metrics={metrics} drawdownAnalysis={drawdownAnalysisValue} />
        </TabsContent>

        <TabsContent value="distribution">
          <DistributionTab distribution={returnDistributionValue} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
