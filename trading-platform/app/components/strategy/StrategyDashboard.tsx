/**
 * StrategyDashboard.tsx
 * 
 * Strategy evaluation dashboard for comparing and analyzing trading strategies
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/Tabs';
import type { StrategyPerformance, CorrelationMatrix } from '@/app/lib/strategy/types';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Award,
  Percent,
  Target,
  AlertTriangle,
  Shield
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface StrategyDashboardProps {
  strategies: StrategyPerformance[];
  correlationMatrix?: CorrelationMatrix;
  benchmarkReturn?: number;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({ label, value, subtitle, icon, trend, className = '' }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                    trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null;

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${trendColor}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {icon && <div className="text-gray-400">{icon}</div>}
            {trendIcon && <div className={trendColor}>{trendIcon}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Strategy Comparison Table
// ============================================================================

function StrategyComparisonTable({ strategies, benchmarkReturn }: { 
  strategies: StrategyPerformance[];
  benchmarkReturn?: number;
}) {
  const sortedStrategies = useMemo(() => {
    return [...strategies].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  }, [strategies]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Strategy</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Total Return</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Annual Return</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Sharpe</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Max DD</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Win Rate</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Trades</th>
            {benchmarkReturn !== undefined && (
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">vs Benchmark</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedStrategies.map((strategy, index) => {
            const isTop = index === 0;
            const outperformance = benchmarkReturn !== undefined 
              ? strategy.totalReturn - benchmarkReturn 
              : 0;
            
            return (
              <tr 
                key={strategy.strategyName} 
                className={`border-b border-gray-700 hover:bg-gray-800 ${isTop ? 'bg-green-900/10' : ''}`}
              >
                <td className="py-3 px-4 flex items-center gap-2">
                  <span className="text-white font-medium">{strategy.strategyName}</span>
                  {isTop && <Award className="w-4 h-4 text-yellow-500" />}
                  <span className="text-xs text-gray-500 uppercase">{strategy.strategyType}</span>
                </td>
                <td className={`text-right py-3 px-4 ${strategy.totalReturn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {strategy.totalReturn > 0 ? '+' : ''}{strategy.totalReturn.toFixed(2)}%
                </td>
                <td className={`text-right py-3 px-4 ${strategy.annualizedReturn > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {strategy.annualizedReturn > 0 ? '+' : ''}{strategy.annualizedReturn.toFixed(2)}%
                </td>
                <td className="text-right py-3 px-4 text-white font-medium">
                  {strategy.sharpeRatio.toFixed(2)}
                </td>
                <td className="text-right py-3 px-4 text-red-400">
                  -{strategy.maxDrawdown.toFixed(2)}%
                </td>
                <td className="text-right py-3 px-4 text-white">
                  {strategy.winRate.toFixed(1)}%
                </td>
                <td className="text-right py-3 px-4 text-gray-400">
                  {strategy.totalTrades}
                </td>
                {benchmarkReturn !== undefined && (
                  <td className={`text-right py-3 px-4 ${outperformance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {outperformance > 0 ? '+' : ''}{outperformance.toFixed(2)}%
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Correlation Matrix Display
// ============================================================================

function CorrelationMatrixDisplay({ matrix }: { matrix: CorrelationMatrix }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Average Correlation"
          value={matrix.avgCorrelation.toFixed(3)}
          icon={<Activity className="w-5 h-5" />}
          trend={Math.abs(matrix.avgCorrelation) < 0.5 ? 'up' : 'down'}
        />
        <MetricCard
          label="Max Correlation"
          value={matrix.maxCorrelation.toFixed(3)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          label="Min Correlation"
          value={matrix.minCorrelation.toFixed(3)}
          icon={<TrendingDown className="w-5 h-5" />}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-sm font-semibold text-gray-400">Strategy</th>
              {matrix.strategies.map((name, i) => (
                <th key={i} className="text-center py-2 px-3 text-sm font-semibold text-gray-400">
                  {name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.strategies.map((rowName, i) => (
              <tr key={i} className="border-t border-gray-700">
                <td className="py-2 px-3 text-sm text-white font-medium">
                  {rowName.split(' ')[0]}
                </td>
                {matrix.matrix[i].map((corr, j) => {
                  const intensity = Math.abs(corr);
                  const color = corr > 0 
                    ? `rgba(34, 197, 94, ${intensity})` 
                    : `rgba(239, 68, 68, ${intensity})`;
                  
                  return (
                    <td 
                      key={j} 
                      className="py-2 px-3 text-center text-sm"
                      style={{ backgroundColor: color }}
                    >
                      <span className={intensity > 0.5 ? 'text-white' : 'text-gray-300'}>
                        {corr.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <p className="text-sm text-gray-400">
          Lower correlations indicate better diversification. 
          Strategies with low correlation can reduce portfolio volatility.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Risk Metrics Panel
// ============================================================================

function RiskMetricsPanel({ strategies }: { strategies: StrategyPerformance[] }) {
  const avgVolatility = strategies.reduce((sum, s) => sum + s.volatility, 0) / strategies.length;
  const maxDrawdown = Math.max(...strategies.map(s => s.maxDrawdown));
  const avgSharpe = strategies.reduce((sum, s) => sum + s.sharpeRatio, 0) / strategies.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Portfolio Volatility"
        value={`${avgVolatility.toFixed(2)}%`}
        subtitle="Annualized"
        icon={<Activity className="w-5 h-5" />}
        trend="neutral"
      />
      <MetricCard
        label="Worst Drawdown"
        value={`-${maxDrawdown.toFixed(2)}%`}
        subtitle="Among all strategies"
        icon={<TrendingDown className="w-5 h-5" />}
        trend="down"
      />
      <MetricCard
        label="Average Sharpe"
        value={avgSharpe.toFixed(2)}
        subtitle="Risk-adjusted return"
        icon={<Shield className="w-5 h-5" />}
        trend={avgSharpe > 1 ? 'up' : 'neutral'}
      />
      <MetricCard
        label="Total Strategies"
        value={strategies.length}
        subtitle="Active strategies"
        icon={<BarChart3 className="w-5 h-5" />}
        trend="neutral"
      />
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export function StrategyDashboard({
  strategies,
  correlationMatrix,
  benchmarkReturn,
  className = ''
}: StrategyDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate best strategy
  const bestStrategy = useMemo(() => {
    return strategies.reduce((best, current) => 
      current.sharpeRatio > best.sharpeRatio ? current : best
    , strategies[0]);
  }, [strategies]);

  // Check if any strategy beats benchmark
  const strategiesBeatBenchmark = useMemo(() => {
    if (benchmarkReturn === undefined) return strategies.length;
    return strategies.filter(s => s.totalReturn > benchmarkReturn).length;
  }, [strategies, benchmarkReturn]);

  if (strategies.length === 0) {
    return (
      <Card className={`bg-gray-900 border-gray-800 ${className}`}>
        <CardContent className="p-6 text-center text-gray-500">
          No strategies to display. Add strategies to see performance metrics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            Strategy Evaluation Dashboard
          </CardTitle>
          <p className="text-sm text-gray-400">
            Analyzing {strategies.length} trading strategies
          </p>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Best Strategy"
          value={bestStrategy.strategyName.split(' ')[0]}
          subtitle={`Sharpe: ${bestStrategy.sharpeRatio.toFixed(2)}`}
          icon={<Award className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          label="Best Return"
          value={`${Math.max(...strategies.map(s => s.totalReturn)).toFixed(2)}%`}
          subtitle="Total return"
          icon={<TrendingUp className="w-5 h-5" />}
          trend="up"
        />
        {benchmarkReturn !== undefined && (
          <MetricCard
            label="Beat Benchmark"
            value={`${strategiesBeatBenchmark}/${strategies.length}`}
            subtitle={`Benchmark: ${benchmarkReturn.toFixed(2)}%`}
            icon={<Target className="w-5 h-5" />}
            trend={strategiesBeatBenchmark > strategies.length / 2 ? 'up' : 'down'}
          />
        )}
        <MetricCard
          label="Avg Win Rate"
          value={`${(strategies.reduce((sum, s) => sum + s.winRate, 0) / strategies.length).toFixed(1)}%`}
          subtitle="Across all strategies"
          icon={<Percent className="w-5 h-5" />}
          trend="neutral"
        />
      </div>

      {/* Tabs */}
      <Card className="bg-gray-900 border-gray-800">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            {correlationMatrix && (
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
            )}
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Performance Overview</h3>
              <StrategyComparisonTable 
                strategies={strategies} 
                benchmarkReturn={benchmarkReturn} 
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Detailed Comparison</h3>
              <StrategyComparisonTable 
                strategies={strategies} 
                benchmarkReturn={benchmarkReturn} 
              />
              
              {benchmarkReturn !== undefined && strategiesBeatBenchmark < strategies.length && (
                <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-500">
                      {strategies.length - strategiesBeatBenchmark} strateg{strategies.length - strategiesBeatBenchmark === 1 ? 'y' : 'ies'} underperform benchmark
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Consider optimizing parameters or combining strategies for better results
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {correlationMatrix && (
            <TabsContent value="correlation" className="p-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Strategy Correlation Analysis</h3>
                <CorrelationMatrixDisplay matrix={correlationMatrix} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="risk" className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Risk Metrics</h3>
              <RiskMetricsPanel strategies={strategies} />
              
              <div className="mt-6">
                <h4 className="text-md font-medium text-white mb-4">Individual Strategy Risk</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {strategies.map((strategy) => (
                    <Card key={strategy.strategyName} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <h5 className="font-medium text-white mb-3">
                          {strategy.strategyName}
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Volatility:</span>
                            <span className="text-white">{strategy.volatility.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Max Drawdown:</span>
                            <span className="text-red-400">-{strategy.maxDrawdown.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sharpe Ratio:</span>
                            <span className="text-white">{strategy.sharpeRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Sortino Ratio:</span>
                            <span className="text-white">{strategy.sortinoRatio.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Calmar Ratio:</span>
                            <span className="text-white">{strategy.calmarRatio.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

export default StrategyDashboard;
