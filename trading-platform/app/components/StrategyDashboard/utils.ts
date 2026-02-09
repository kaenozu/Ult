/**
 * StrategyDashboard Utility Functions
 * 
 * 戦略評価ダッシュボードのユーティリティ関数
 */

import { StrategyPerformance, HistogramBin } from './types';

/**
 * ドローダウンを計算
 */
export function calculateDrawdowns(equityCurve: number[]): number[] {
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

/**
 * ヒストグラムのビンを作成
 */
export function createHistogramBins(
  data: number[],
  numBins: number
): HistogramBin[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / numBins;

  const bins: HistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const binMin = min + i * binWidth;
    const binMax = binMin + binWidth;
    const count = data.filter(v => v >= binMin && v < binMax).length;
    bins.push({ min: binMin, max: binMax, count });
  }

  return bins;
}

/**
 * 戦略間の相関を計算
 */
export function calculateCorrelations(strategies: StrategyPerformance[]): number[][] {
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

/**
 * リターンを計算
 */
export function calculateReturns(equityCurve: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  return returns;
}

/**
 * ピアソン相関係数を計算
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
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

/**
 * 相関の強さに基づいて色を取得
 */
export function getCorrelationColor(corr: number): string {
  const absCorr = Math.abs(corr);
  if (absCorr > 0.7) return '#dc2626'; // 強い相関 - 赤
  if (absCorr > 0.5) return '#f97316'; // 中程度の相関 - オレンジ
  if (absCorr > 0.3) return '#eab308'; // 弱い相関 - 黄色
  return '#22c55e'; // 相関なし - 緑
}
