/**
 * BacktestPanel.tsx
 *
 * Backtest runner + results dashboard.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { AlertTriangle, BarChart3, Play, Loader2 } from 'lucide-react';
import BacktestResultsDashboard from '@/app/components/backtest/BacktestResultsDashboard';
import type { BacktestResult } from '@/app/types';

type Market = 'usa' | 'japan';
type StrategyId = 'sma' | 'rsi' | 'buy_hold';
type TimeframeId = '1y' | '3y' | '5y';

interface DataQualitySummary {
  totalPoints: number;
  validPoints: number;
  completeness: number;
  freshness: {
    lastUpdate: number;
    ageMs: number;
    staleness: 'fresh' | 'acceptable' | 'stale' | 'expired';
  };
  avgLatencyMs: number;
  warnings: string[];
  errors: string[];
}

interface OverfittingAnalysis {
  overfit: boolean;
  overfittingScore: number;
  confidence: number;
  indicators: Record<string, number>;
  recommendations: string[];
  warnings: string[];
}

interface BacktestDiagnostics {
  overfitting?: OverfittingAnalysis;
  inSample?: number;
  outOfSample?: number;
}

const TIMEFRAME_OPTIONS: Array<{ id: TimeframeId; label: string; years: number }> = [
  { id: '1y', label: '1Y', years: 1 },
  { id: '3y', label: '3Y', years: 3 },
  { id: '5y', label: '5Y', years: 5 },
];

export function BacktestPanel() {
  const [symbol, setSymbol] = useState('AAPL');
  const [market, setMarket] = useState<Market>('usa');
  const [strategy, setStrategy] = useState<StrategyId>('sma');
  const [timeframe, setTimeframe] = useState<TimeframeId>('5y');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualitySummary | null>(null);
  const [diagnostics, setDiagnostics] = useState<BacktestDiagnostics | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const startDate = useMemo(() => {
    const selected = TIMEFRAME_OPTIONS.find((option) => option.id === timeframe);
    const years = selected?.years ?? 5;
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split('T')[0];
  }, [timeframe]);

  const runBacktest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError(null);
    setWarnings([]);

    try {
      if (!symbol.trim()) {
        throw new Error('Symbol is required.');
      }
      const params = new URLSearchParams({
        symbol: symbol.trim().toUpperCase(),
        market,
        strategy,
        startDate,
      });

      const response = await fetch(`/api/backtest?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Backtest failed.');
      }

      setResult(payload?.result ?? null);
      setDataQuality(payload?.dataQuality ?? null);
      setDiagnostics(payload?.diagnostics ?? null);
      setWarnings(Array.isArray(payload?.warnings) ? payload.warnings : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            バックテスト実行
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy={isRunning}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label htmlFor="symbol-input" className="text-xs text-gray-400">銘柄</label>
              <input
                id="symbol-input"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="w-full px-3 py-2 rounded bg-[#0f172a] border border-[#334155] text-white text-sm"
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="market-select" className="text-xs text-gray-400">市場</label>
              <select
                id="market-select"
                value={market}
                onChange={(event) => setMarket(event.target.value as Market)}
                className="w-full px-3 py-2 rounded bg-[#0f172a] border border-[#334155] text-white text-sm"
              >
                <option value="usa">米国市場</option>
                <option value="japan">日本市場</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="strategy-select" className="text-xs text-gray-400">戦略</label>
              <select
                id="strategy-select"
                value={strategy}
                onChange={(event) => setStrategy(event.target.value as StrategyId)}
                className="w-full px-3 py-2 rounded bg-[#0f172a] border border-[#334155] text-white text-sm"
              >
                <option value="sma">SMAクロスオーバー</option>
                <option value="rsi">RSI逆張り</option>
                <option value="buy_hold">バイ・アンド・ホールド</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="timeframe-select" className="text-xs text-gray-400">期間</label>
              <select
                id="timeframe-select"
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value as TimeframeId)}
                className="w-full px-3 py-2 rounded bg-[#0f172a] border border-[#334155] text-white text-sm"
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label === 'Daily' ? '日足' : option.label === 'Hourly' ? '1時間足' : option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={runBacktest}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 transition-all"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? '実行中...' : 'バックテスト実行'}
            </Button>
            <div className="text-xs text-gray-400">
              開始日: {startDate}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400" role="alert">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-yellow-200">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`} className="bg-[#0f172a] px-3 py-2 rounded">
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {dataQuality && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white">Data Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Points</div>
                <div className="text-lg font-semibold text-white">{dataQuality.totalPoints}</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Valid Points</div>
                <div className="text-lg font-semibold text-white">{dataQuality.validPoints}</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Completeness</div>
                <div className="text-lg font-semibold text-white">{dataQuality.completeness.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Freshness</div>
                <div className="text-lg font-semibold text-white">{dataQuality.freshness.staleness}</div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Last Update</div>
                <div className="text-sm font-semibold text-white">
                  {dataQuality.freshness.lastUpdate > 0
                    ? new Date(dataQuality.freshness.lastUpdate).toLocaleDateString()
                    : '-'}
                </div>
              </div>
              <div className="p-3 bg-[#0f172a] rounded">
                <div className="text-xs text-gray-400">Age (days)</div>
                <div className="text-lg font-semibold text-white">
                  {dataQuality.freshness.ageMs === Number.POSITIVE_INFINITY
                    ? '-'
                    : (dataQuality.freshness.ageMs / 86400000).toFixed(1)}
                </div>
              </div>
            </div>

            {dataQuality.errors.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Errors</div>
                <ul className="space-y-2 text-xs text-red-200">
                  {dataQuality.errors.map((errorItem, index) => (
                    <li key={`dq-error-${index}`} className="bg-[#0f172a] px-3 py-2 rounded">
                      {errorItem}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {diagnostics?.overfitting && (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="text-white">Overfitting Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-200">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={diagnostics.overfitting.overfit ? 'text-red-400' : 'text-green-400'}>
                {diagnostics.overfitting.overfit ? 'High Risk' : 'OK'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Overfit Score</span>
              <span>{diagnostics.overfitting.overfittingScore.toFixed(2)}</span>
            </div>
            {typeof diagnostics.inSample === 'number' && typeof diagnostics.outOfSample === 'number' && (
              <div className="flex items-center justify-between">
                <span>Win Rate (IS / OOS)</span>
                <span>{diagnostics.inSample.toFixed(1)}% / {diagnostics.outOfSample.toFixed(1)}%</span>
              </div>
            )}
            {diagnostics.overfitting.warnings.length > 0 && (
              <ul className="space-y-2">
                {diagnostics.overfitting.warnings.map((warning, index) => (
                  <li key={`overfit-${index}`} className="bg-[#0f172a] px-3 py-2 rounded text-yellow-200">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
            {diagnostics.overfitting.recommendations.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Recommendations</div>
                <ul className="space-y-2 text-xs text-blue-200">
                  {diagnostics.overfitting.recommendations.map((rec, index) => (
                    <li key={`overfit-rec-${index}`} className="bg-[#0f172a] px-3 py-2 rounded">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <BacktestResultsDashboard result={result} />
    </div>
  );
}

export default BacktestPanel;
