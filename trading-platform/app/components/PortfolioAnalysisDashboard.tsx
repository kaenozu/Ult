'use client';

/**
 * PortfolioAnalysisDashboard.tsx
 * 
 * ポートフォリオ分析ダッシュボード
 * - シャープレシオ・ソルティノレシオ表示
 * - ドローダウン分析
 * - 資産配分可視化
 * - 月次パフォーマンス
 */

import React, { useMemo } from 'react';
import { useTradeHistory } from '@/app/lib/hooks/useTradeHistory';
import { analyzePortfolio, calculateMonthlyPerformance, calculateAssetAllocation } from '@/app/lib/utils/portfolio-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { formatCurrency, formatPercent } from '@/app/lib/utils';
import { TrendingUp, TrendingDown, Activity, PieChart, Calendar, AlertTriangle } from 'lucide-react';

// リスク指標カード
function MetricCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  trend,
  trendUp,
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            {trend && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 bg-slate-800 rounded-lg">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ドローダウンインジケーター
function DrawdownIndicator({ 
  maxDrawdown, 
  maxDrawdownPercent,
  recoveryDays 
}: { 
  maxDrawdown: number; 
  maxDrawdownPercent: number;
  recoveryDays: number;
}) {
  const severity = maxDrawdownPercent > 0.2 ? 'high' : maxDrawdownPercent > 0.1 ? 'medium' : 'low';
  const colorClass = severity === 'high' ? 'text-red-400' : severity === 'medium' ? 'text-yellow-400' : 'text-green-400';
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          最大ドローダウン
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl font-bold text-white">
                {formatPercent(maxDrawdownPercent * 100)}
              </span>
              <span className={`text-sm font-medium ${colorClass}`}>
                {severity === 'high' ? '高リスク' : severity === 'medium' ? '中リスク' : '低リスク'}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(maxDrawdownPercent * 100 * 2, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <p className="text-xs text-slate-500">ドローダウン額</p>
              <p className="text-lg font-semibold text-white">{formatCurrency(maxDrawdown)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">回復期間</p>
              <p className="text-lg font-semibold text-white">
                {recoveryDays > 0 ? `${recoveryDays}日` : recoveryDays === -1 ? '未回復' : 'なし'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 月次パフォーマンステーブル
function MonthlyPerformanceTable({ 
  monthlyData 
}: { 
  monthlyData: Array<{ month: string; return: number; trades: number; winRate: number }> 
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          月次パフォーマンス
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 text-slate-400 font-medium">月</th>
                <th className="text-right py-2 text-slate-400 font-medium">損益</th>
                <th className="text-right py-2 text-slate-400 font-medium">取引数</th>
                <th className="text-right py-2 text-slate-400 font-medium">勝率</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.slice(-6).reverse().map((data, index) => (
                <tr key={index} className="border-b border-slate-800/50">
                  <td className="py-2 text-white">{data.month}</td>
                  <td className={`text-right py-2 font-medium ${data.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(data.return)}
                  </td>
                  <td className="text-right py-2 text-slate-300">{data.trades}</td>
                  <td className="text-right py-2 text-slate-300">{data.winRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// 資産配分チャート（簡易版）
function AssetAllocationChart({ 
  allocation 
}: { 
  allocation: Array<{ symbol: string; value: number; percentage: number }> 
}) {
  const topAssets = allocation.slice(0, 5);
  
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          資産配分（損益ベース）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topAssets.map((asset) => (
            <div key={asset.symbol}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white">{asset.symbol}</span>
                <span className="text-slate-400">{formatCurrency(asset.value)} ({asset.percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.abs(asset.percentage)}%` }}
                />
              </div>
            </div>
          ))}
          {allocation.length > 5 && (
            <p className="text-xs text-slate-500 text-center pt-2">
              他 {allocation.length - 5} 銘柄
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// メインダッシュボード
export function PortfolioAnalysisDashboard() {
  const { trades, isLoading } = useTradeHistory();
  
  const analysis = useMemo(() => {
    return analyzePortfolio(trades);
  }, [trades]);
  
  const monthlyData = useMemo(() => {
    return calculateMonthlyPerformance(trades);
  }, [trades]);
  
  const allocation = useMemo(() => {
    return calculateAssetAllocation(trades);
  }, [trades]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }
  
  if (trades.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-12 text-center">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">データがありません</h3>
          <p className="text-slate-400">取引履歴が登録されると、ポートフォリオ分析が表示されます。</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">ポートフォリオ分析</h1>
        <p className="text-slate-400 mt-1">リスク調整後リターンと資産配分の詳細分析</p>
      </div>
      
      {/* 主要指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="シャープレシオ"
          value={analysis.sharpeRatio.toFixed(2)}
          subtitle="リスク調整後リターン"
          icon={Activity}
          trend={analysis.sharpeRatio > 1 ? '良好' : analysis.sharpeRatio > 0 ? '普通' : '要改善'}
          trendUp={analysis.sharpeRatio > 1}
        />
        <MetricCard
          title="ソルティノレシオ"
          value={analysis.sortinoRatio.toFixed(2)}
          subtitle="下方リスク調整後リターン"
          icon={TrendingUp}
          trend={analysis.sortinoRatio > 2 ? '良好' : analysis.sortinoRatio > 1 ? '普通' : '要改善'}
          trendUp={analysis.sortinoRatio > 2}
        />
        <MetricCard
          title="年率リターン"
          value={formatPercent(analysis.annualizedReturn * 100)}
          subtitle="推移リターン（年率）"
          icon={TrendingUp}
          trend={analysis.annualizedReturn > 0 ? 'プラス' : 'マイナス'}
          trendUp={analysis.annualizedReturn > 0}
        />
        <MetricCard
          title="ボラティリティ"
          value={formatPercent(analysis.volatility * 100)}
          subtitle="年率ボラティリティ"
          icon={Activity}
          trend={analysis.volatility < 0.2 ? '低リスク' : analysis.volatility < 0.3 ? '中リスク' : '高リスク'}
          trendUp={analysis.volatility < 0.2}
        />
      </div>
      
      {/* ドローダウンと資産配分 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DrawdownIndicator
          maxDrawdown={analysis.maxDrawdown}
          maxDrawdownPercent={analysis.maxDrawdownPercent}
          recoveryDays={analysis.recoveryDays}
        />
        <AssetAllocationChart allocation={allocation} />
      </div>
      
      {/* 月次パフォーマンス */}
      <MonthlyPerformanceTable monthlyData={monthlyData} />
    </div>
  );
}

export default PortfolioAnalysisDashboard;
