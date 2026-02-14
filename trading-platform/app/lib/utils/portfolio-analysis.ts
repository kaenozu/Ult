/**
 * ポートフォリオ分析ユーティリティ
 * 
 * リスク調整後リターン指標の計算
 * - シャープレシオ
 * - ソルティノレシオ
 * - 最大ドローダウン
 * - 回復期間
 */

import { StoredTrade } from '../storage/IndexedDBService';

export interface PortfolioAnalysis {
  // リターン指標
  totalReturn: number;
  annualizedReturn: number;
  
  // リスク指標
  volatility: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  // リスク調整後リターン
  sharpeRatio: number;
  sortinoRatio: number;
  
  // 回復期間
  recoveryDays: number;
  
  // その他
  beta: number;
  alpha: number;
}

/**
 * シャープレシオを計算
 * (リターン - 無リスクレート) / ボラティリティ
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  if (volatility === 0) return 0;
  
  return excessReturn / volatility;
}

/**
 * ソルティノレシオを計算
 * (リターン - 無リスクレート) / 下方ボラティリティ
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.02,
  targetReturn: number = 0
): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturn = avgReturn - riskFreeRate;
  
  // 下方偏差（targetReturn以下のリターンのみ対象）
  const downsideReturns = returns.filter(r => r < targetReturn);
  if (downsideReturns.length === 0) return excessReturn > 0 ? Infinity : 0;
  
  const downsideVariance = downsideReturns.reduce(
    (sum, r) => sum + Math.pow(r - targetReturn, 2), 
    0
  ) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  if (downsideDeviation === 0) return 0;
  
  return excessReturn / downsideDeviation;
}

/**
 * 最大ドローダウンを計算
 */
export function calculateMaxDrawdown(equityCurve: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakIndex: number;
  troughIndex: number;
} {
  if (equityCurve.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0, peakIndex: 0, troughIndex: 0 };
  }
  
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  let currentPeak = equityCurve[0];
  let currentPeakIndex = 0;
  
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > currentPeak) {
      currentPeak = equityCurve[i];
      currentPeakIndex = i;
    }
    
    const drawdown = currentPeak - equityCurve[i];
    const drawdownPercent = drawdown / currentPeak;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
      peakIndex = currentPeakIndex;
      troughIndex = i;
    }
  }
  
  return { maxDrawdown, maxDrawdownPercent, peakIndex, troughIndex };
}

/**
 * 回復期間を計算
 */
export function calculateRecoveryDays(
  equityCurve: number[],
  troughIndex: number
): number {
  if (troughIndex >= equityCurve.length - 1) return -1; // 未回復
  
  const troughValue = equityCurve[troughIndex];
  
  for (let i = troughIndex + 1; i < equityCurve.length; i++) {
    if (equityCurve[i] >= troughValue) {
      return i - troughIndex;
    }
  }
  
  return -1; // 未回復
}

/**
 * ベータ値を計算（市場感応度）
 */
export function calculateBeta(
  portfolioReturns: number[],
  marketReturns: number[]
): number {
  if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length === 0) {
    return 1;
  }
  
  const n = portfolioReturns.length;
  const avgPortfolio = portfolioReturns.reduce((sum, r) => sum + r, 0) / n;
  const avgMarket = marketReturns.reduce((sum, r) => sum + r, 0) / n;
  
  let covariance = 0;
  let marketVariance = 0;
  
  for (let i = 0; i < n; i++) {
    const portfolioDiff = portfolioReturns[i] - avgPortfolio;
    const marketDiff = marketReturns[i] - avgMarket;
    covariance += portfolioDiff * marketDiff;
    marketVariance += marketDiff * marketDiff;
  }
  
  covariance /= n;
  marketVariance /= n;
  
  if (marketVariance === 0) return 1;
  
  return covariance / marketVariance;
}

/**
 * 取引履歴からポートフォリオ分析を実行
 * 
 * 注: 取引データに損益情報が含まれていない場合は、
      月次パフォーマンスデータを使用して分析します
 */
export function analyzePortfolio(
  trades: StoredTrade[],
  initialCapital: number = 100000
): PortfolioAnalysis {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      recoveryDays: 0,
      beta: 1,
      alpha: 0,
    };
  }
  
  // 月次パフォーマンスデータを取得
  const monthlyData = calculateMonthlyPerformance(trades);
  
  if (monthlyData.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      recoveryDays: 0,
      beta: 1,
      alpha: 0,
    };
  }
  
  // 月次リターンを計算
  const monthlyReturns = monthlyData.map(m => m.return / initialCapital);
  
  // エクイティカーブを構築
  const equityCurve: number[] = [initialCapital];
  for (const monthlyReturn of monthlyReturns) {
    const currentEquity = equityCurve[equityCurve.length - 1];
    equityCurve.push(currentEquity * (1 + monthlyReturn));
  }
  
  // 基本指標
  const finalEquity = equityCurve[equityCurve.length - 1];
  const totalReturn = (finalEquity - initialCapital) / initialCapital;
  
  // 月数を計算
  const months = monthlyData.length;
  const annualizedReturn = Math.pow(1 + totalReturn, 12 / months) - 1;
  
  // ドローダウン
  const { maxDrawdown, maxDrawdownPercent, troughIndex } = calculateMaxDrawdown(equityCurve);
  const recoveryDays = calculateRecoveryDays(equityCurve, troughIndex);
  
  // ボラティリティ（月次リターンの年率標準偏差）
  const avgMonthlyReturn = monthlyReturns.reduce((sum, r) => sum + r, 0) / monthlyReturns.length;
  const monthlyVariance = monthlyReturns.reduce((sum, r) => sum + Math.pow(r - avgMonthlyReturn, 2), 0) / monthlyReturns.length;
  const monthlyStdDev = Math.sqrt(monthlyVariance);
  const volatility = monthlyStdDev * Math.sqrt(12); // 年率化
  
  // シャープレシオ・ソルティノレシオ
  const sharpeRatio = calculateSharpeRatio(monthlyReturns.map(r => r * 12));
  const sortinoRatio = calculateSortinoRatio(monthlyReturns.map(r => r * 12));
  
  return {
    totalReturn,
    annualizedReturn,
    volatility,
    maxDrawdown,
    maxDrawdownPercent,
    sharpeRatio,
    sortinoRatio,
    recoveryDays,
    beta: 1, // TODO: 市場データとの連携
    alpha: 0, // TODO: 市場データとの連携
  };
}

/**
 * 月次パフォーマンスを計算
 */
export function calculateMonthlyPerformance(
  trades: StoredTrade[]
): Array<{
  month: string;
  return: number;
  trades: number;
  winRate: number;
}> {
  const monthlyData: Record<string, { trades: number }> = {};

  for (const trade of trades) {
    const date = new Date(trade.date || Date.now());
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { trades: 0 };
    }

    monthlyData[monthKey].trades += 1;
  }

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      return: 0, // TODO: 取引データに損益情報を追加
      trades: data.trades,
      winRate: 0, // TODO: 取引データに損益情報を追加
    }));
}

/**
 * 資産配分を計算
 */
export function calculateAssetAllocation(
  trades: StoredTrade[]
): Array<{
  symbol: string;
  value: number;
  percentage: number;
}> {
  const allocation: Record<string, number> = {};

  for (const trade of trades) {
    if (!allocation[trade.symbol]) {
      allocation[trade.symbol] = 0;
    }
    // 取引数量を資産配分の代わりに使用
    allocation[trade.symbol] += trade.quantity || 1;
  }

  const total = Object.values(allocation).reduce((sum, v) => sum + v, 0);

  return Object.entries(allocation)
    .sort(([, a], [, b]) => b - a)
    .map(([symbol, value]) => ({
      symbol,
      value,
      percentage: total !== 0 ? (value / total) * 100 : 0,
    }));
}
