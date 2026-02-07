/**
 * StrategyDashboard.tsx
 * 
 * 戦略評価ダッシュボード - 複数戦略の包括的な比較・分析
 * 
 * 【表示項目】
 * - 累積リターン曲線（対数スケール）
 * - ドローダウンチャート
 * - 月次・年次リターンヒートマップ
 * - シャープレート推移
 * - 勝率分布（PnLヒストグラム）
 * - 相関マトリックス
 * - 特徴量重要度
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  TooltipItem,
  Legend,
  LogarithmicScale,
} from 'chart.js';
import { BacktestResult } from '@/app/lib/backtest/AdvancedBacktestEngine';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ============================================================================
// Types
// ============================================================================

export interface StrategyPerformance {
  name: string;
  result: BacktestResult;
  color: string;
}

export interface StrategyDashboardProps {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
  showComparison?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function StrategyDashboard({
  strategies,
  buyAndHoldResult,
  showComparison = true,
}: StrategyDashboardProps) {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(
    strategies.map(s => s.name)
  );
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');

  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => selectedStrategies.includes(s.name));
  }, [strategies, selectedStrategies]);

  const toggleStrategy = (name: string) => {
    setSelectedStrategies(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            戦略評価ダッシュボード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {strategies.map(strategy => (
              <Button
                key={strategy.name}
                onClick={() => toggleStrategy(strategy.name)}
                variant={selectedStrategies.includes(strategy.name) ? 'default' : 'outline'}
                className={`text-sm ${
                  selectedStrategies.includes(strategy.name)
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: strategy.color }}
                />
                {strategy.name}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setViewMode('overview')}
              variant={viewMode === 'overview' ? 'default' : 'outline'}
              className="text-sm"
            >
              概要
            </Button>
            <Button
              onClick={() => setViewMode('detailed')}
              variant={viewMode === 'detailed' ? 'default' : 'outline'}
              className="text-sm"
            >
              詳細
            </Button>
            {showComparison && (
              <Button
                onClick={() => setViewMode('comparison')}
                variant={viewMode === 'comparison' ? 'default' : 'outline'}
                className="text-sm"
              >
                比較分析
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          <PerformanceMetricsGrid strategies={filteredStrategies} buyAndHoldResult={buyAndHoldResult} />
          <CumulativeReturnChart strategies={filteredStrategies} buyAndHoldResult={buyAndHoldResult} />
          <DrawdownChart strategies={filteredStrategies} />
        </>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <>
          <MonthlyReturnsHeatmap strategies={filteredStrategies} />
          <SharpeRatioProgressChart strategies={filteredStrategies} />
          <PnLHistogram strategies={filteredStrategies} />
        </>
      )}

      {/* Comparison Mode */}
      {viewMode === 'comparison' && (
        <>
          <CorrelationMatrix strategies={filteredStrategies} />
          <StrategyComparisonTable strategies={filteredStrategies} buyAndHoldResult={buyAndHoldResult} />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * パフォーマンスメトリクスグリッド
 */
function PerformanceMetricsGrid({
  strategies,
  buyAndHoldResult,
}: {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {strategies.map(strategy => (
        <Card key={strategy.name} className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: strategy.color }}
              />
              {strategy.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <MetricRow
                label="Total Return"
                value={`${strategy.result.metrics.totalReturn.toFixed(2)}%`}
                positive={strategy.result.metrics.totalReturn > 0}
              />
              <MetricRow
                label="Sharpe Ratio"
                value={strategy.result.metrics.sharpeRatio.toFixed(2)}
                positive={strategy.result.metrics.sharpeRatio > 1}
              />
              <MetricRow
                label="Max Drawdown"
                value={`${strategy.result.metrics.maxDrawdown.toFixed(2)}%`}
                positive={false}
              />
              <MetricRow
                label="Win Rate"
                value={`${strategy.result.metrics.winRate.toFixed(1)}%`}
                positive={strategy.result.metrics.winRate > 50}
              />
              {buyAndHoldResult && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400">
                    vs Buy & Hold:{' '}
                    <span
                      className={
                        strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                        ? '勝'
                        : '負'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 累積リターン曲線
 */
function CumulativeReturnChart({
  strategies,
  buyAndHoldResult,
}: {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}) {
  const chartData = useMemo(() => {
    const datasets = strategies.map(strategy => ({
      label: strategy.name,
      data: strategy.result.equityCurve,
      borderColor: strategy.color,
      backgroundColor: strategy.color + '20',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1,
    }));

    if (buyAndHoldResult) {
      datasets.push({
        label: 'Buy & Hold',
        data: buyAndHoldResult.equityCurve,
        borderColor: '#94a3b8',
        backgroundColor: '#94a3b820',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      });
    }

    return {
      labels: Array.from({ length: strategies[0]?.result.equityCurve.length || 0 }, (_, i) => i),
      datasets,
    };
  }, [strategies, buyAndHoldResult]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'logarithmic' as const,
        ticks: {
          color: '#94a3b8',
          callback: (value: number | string) => {
            if (typeof value === 'number') {
              return value.toLocaleString();
            }
            return value;
          },
        },
        grid: {
          color: '#334155',
        },
      },
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
  };

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          累積リターン曲線（対数スケール）
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ドローダウンチャート
 */
function DrawdownChart({ strategies }: { strategies: StrategyPerformance[] }) {
  const chartData = useMemo(() => {
    const datasets = strategies.map(strategy => {
      const drawdowns = calculateDrawdowns(strategy.result.equityCurve);
      return {
        label: strategy.name,
        data: drawdowns,
        borderColor: strategy.color,
        backgroundColor: strategy.color + '40',
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      };
    });

    return {
      labels: Array.from({ length: strategies[0]?.result.equityCurve.length || 0 }, (_, i) => i),
      datasets,
    };
  }, [strategies]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        reverse: true,
        ticks: {
          color: '#94a3b8',
          callback: (value: number | string) => {
            if (typeof value === 'number') {
              return `${value.toFixed(1)}%`;
            }
            return value;
          },
        },
        grid: {
          color: '#334155',
        },
      },
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          },
        },
      },
    },
  };

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          ドローダウンチャート
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 月次リターンヒートマップ（簡易版）
 */
function MonthlyReturnsHeatmap({ strategies }: { strategies: StrategyPerformance[] }) {
  // 簡易実装: 実際にはデータから月次リターンを計算
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">月次リターンヒートマップ</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm">
          月次リターンの視覚化（実装中）
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * シャープレシオ推移
 */
function SharpeRatioProgressChart({ strategies }: { strategies: StrategyPerformance[] }) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          シャープレシオ推移
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {strategies.map(strategy => (
            <div key={strategy.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{strategy.name}</span>
                <span className="text-sm font-medium text-white">
                  {strategy.result.metrics.sharpeRatio.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (strategy.result.metrics.sharpeRatio / 3) * 100)}%`,
                    backgroundColor: strategy.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * PnLヒストグラム
 */
function PnLHistogram({ strategies }: { strategies: StrategyPerformance[] }) {
  const chartData = useMemo(() => {
    if (strategies.length === 0) return null;

    const strategy = strategies[0]; // 最初の戦略のみ表示
    const pnls = strategy.result.trades.map(t => t.pnlPercent);
    
    // ヒストグラムのビンを作成
    const bins = createHistogramBins(pnls, 20);

    return {
      labels: bins.map(b => `${b.min.toFixed(1)}%`),
      datasets: [
        {
          label: '取引回数',
          data: bins.map(b => b.count),
          backgroundColor: strategy.color + '80',
          borderColor: strategy.color,
          borderWidth: 1,
        },
      ],
    };
  }, [strategies]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
      x: {
        ticks: {
          color: '#94a3b8',
        },
        grid: {
          color: '#334155',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#e2e8f0',
        },
      },
    },
  };

  if (!chartData) return null;

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">PnL分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 相関マトリックス
 */
function CorrelationMatrix({ strategies }: { strategies: StrategyPerformance[] }) {
  const correlations = useMemo(() => {
    return calculateCorrelations(strategies);
  }, [strategies]);

  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">戦略間相関マトリックス</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-gray-400 p-2"></th>
                {strategies.map(s => (
                  <th key={s.name} className="text-center text-gray-400 p-2">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map((s1, i) => (
                <tr key={s1.name}>
                  <td className="text-left text-gray-300 p-2 font-medium">{s1.name}</td>
                  {strategies.map((s2, j) => {
                    const corr = correlations[i][j];
                    const color = getCorrelationColor(corr);
                    return (
                      <td
                        key={s2.name}
                        className="text-center p-2"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-white font-medium">
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
      </CardContent>
    </Card>
  );
}

/**
 * 戦略比較テーブル
 */
function StrategyComparisonTable({
  strategies,
  buyAndHoldResult,
}: {
  strategies: StrategyPerformance[];
  buyAndHoldResult?: BacktestResult;
}) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
      <CardHeader>
        <CardTitle className="text-white">戦略比較</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 p-3">戦略</th>
                <th className="text-right text-gray-400 p-3">Total Return</th>
                <th className="text-right text-gray-400 p-3">Sharpe</th>
                <th className="text-right text-gray-400 p-3">Sortino</th>
                <th className="text-right text-gray-400 p-3">Max DD</th>
                <th className="text-right text-gray-400 p-3">Win Rate</th>
                <th className="text-right text-gray-400 p-3">Trades</th>
                <th className="text-center text-gray-400 p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map(strategy => {
                const beatsBuyHold = buyAndHoldResult
                  ? strategy.result.metrics.totalReturn > buyAndHoldResult.metrics.totalReturn
                  : false;

                return (
                  <tr key={strategy.name} className="border-b border-gray-800">
                    <td className="p-3 text-white font-medium">{strategy.name}</td>
                    <td className={`p-3 text-right ${strategy.result.metrics.totalReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {strategy.result.metrics.totalReturn.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.sortinoRatio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-red-400">
                      {strategy.result.metrics.maxDrawdown.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.winRate.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-gray-300">
                      {strategy.result.metrics.totalTrades}
                    </td>
                    <td className="p-3 text-center">
                      {beatsBuyHold ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {buyAndHoldResult && (
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  <td className="p-3 text-gray-400 font-medium">Buy & Hold</td>
                  <td className={`p-3 text-right ${buyAndHoldResult.metrics.totalReturn > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {buyAndHoldResult.metrics.totalReturn.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right text-gray-400">
                    {buyAndHoldResult.metrics.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-gray-400">
                    {buyAndHoldResult.metrics.sortinoRatio.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-red-400">
                    {buyAndHoldResult.metrics.maxDrawdown.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right text-gray-400">-</td>
                  <td className="p-3 text-right text-gray-400">-</td>
                  <td className="p-3 text-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * メトリック行
 */
function MetricRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium ${
          positive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateDrawdowns(equityCurve: number[]): number[] {
  const drawdowns: number[] = [];
  let peak = equityCurve[0];

  for (const equity of equityCurve) {
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = ((peak - equity) / peak) * 100;
    drawdowns.push(drawdown);
  }

  return drawdowns;
}

function createHistogramBins(
  data: number[],
  numBins: number
): Array<{ min: number; max: number; count: number }> {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / numBins;

  const bins: Array<{ min: number; max: number; count: number }> = [];

  for (let i = 0; i < numBins; i++) {
    const binMin = min + i * binWidth;
    const binMax = binMin + binWidth;
    const count = data.filter(v => v >= binMin && v < binMax).length;
    bins.push({ min: binMin, max: binMax, count });
  }

  return bins;
}

function calculateCorrelations(strategies: StrategyPerformance[]): number[][] {
  const n = strategies.length;
  const correlations: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        correlations[i][j] = 1.0;
      } else {
        const returns1 = calculateReturns(strategies[i].result.equityCurve);
        const returns2 = calculateReturns(strategies[j].result.equityCurve);
        correlations[i][j] = pearsonCorrelation(returns1, returns2);
      }
    }
  }

  return correlations;
}

function calculateReturns(equityCurve: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  return returns;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumXSq = 0;
  let sumYSq = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumXSq += diffX * diffX;
    sumYSq += diffY * diffY;
  }

  const denominator = Math.sqrt(sumXSq * sumYSq);
  return denominator === 0 ? 0 : numerator / denominator;
}

function getCorrelationColor(corr: number): string {
  const absCorr = Math.abs(corr);
  if (absCorr > 0.7) return '#dc2626'; // 強い相関 - 赤
  if (absCorr > 0.5) return '#f97316'; // 中程度の相関 - オレンジ
  if (absCorr > 0.3) return '#eab308'; // 弱い相関 - 黄色
  return '#22c55e'; // 相関なし - 緑
}
