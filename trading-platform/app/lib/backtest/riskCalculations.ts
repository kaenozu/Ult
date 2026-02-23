import { BacktestResult, BacktestTrade } from '@/app/types';
import { DrawdownAnalysis, DrawdownEvent, BenchmarkMetricsResult } from './types';

export function calculateEquityCurve(result: BacktestResult): number[] {
  const equity: number[] = [100];
  let currentEquity = 100;

  for (const trade of result.trades) {
    currentEquity *= (1 + (trade.profitPercent || 0) / 100);
    equity.push(parseFloat(currentEquity.toFixed(2)));
  }

  return equity;
}

export function calculateUlcerIndex(equity: number[]): number {
  let sumSquared = 0;
  let peak = equity[0];

  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      peak = equity[i];
    }
    const drawdown = ((peak - equity[i]) / peak) * 100;
    sumSquared += drawdown * drawdown;
  }

  return Math.sqrt(sumSquared / equity.length);
}

export function analyzeDrawdowns(equity: number[], trades: BacktestTrade[]): DrawdownAnalysis {
  const drawdowns: DrawdownEvent[] = [];
  let maxDrawdown = 0;
  let maxDrawdownStart = '';
  let maxDrawdownEnd = '';
  let maxDrawdownDuration = 0;
  let recoveryDuration = 0;

  let peak = equity[0];
  let peakIndex = 0;
  let inDrawdown = false;
  let drawdownStart = '';
  let drawdownStartIndex = 0;

  for (let i = 1; i < equity.length; i++) {
    if (equity[i] > peak) {
      if (inDrawdown) {
        const drawdownPercent = ((peak - Math.min(...equity.slice(drawdownStartIndex, i))) / peak) * 100;
        drawdowns.push({
          startDate: drawdownStart,
          endDate: trades[i - 1]?.exitDate || '',
          peakValue: peak,
          troughValue: Math.min(...equity.slice(drawdownStartIndex, i)),
          drawdownPercent: parseFloat(drawdownPercent.toFixed(2)),
          duration: i - drawdownStartIndex,
          recoveryDate: trades[i - 1]?.exitDate,
          recoveryDuration: i - drawdownStartIndex,
        });
        inDrawdown = false;
      }
      peak = equity[i];
      peakIndex = i;
    } else {
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = trades[i - 1]?.exitDate || '';
        drawdownStartIndex = i;
      }

      const currentDrawdown = ((peak - equity[i]) / peak) * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
        maxDrawdownStart = drawdownStart;
        maxDrawdownEnd = trades[i - 1]?.exitDate || '';
        maxDrawdownDuration = i - peakIndex;
        recoveryDuration = i - drawdownStartIndex;
      }
    }
  }

  const averageDrawdown = drawdowns.length > 0
    ? drawdowns.reduce((sum, d) => sum + d.drawdownPercent, 0) / drawdowns.length
    : 0;

  return {
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownStart,
    maxDrawdownEnd,
    maxDrawdownDuration,
    recoveryDuration,
    averageDrawdown: parseFloat(averageDrawdown.toFixed(2)),
    drawdownFrequency: drawdowns.length,
    drawdowns,
  };
}

export function calculateBenchmarkMetrics(
  strategyReturns: number[],
  benchmarkReturns: number[]
): BenchmarkMetricsResult {
  const n = Math.min(strategyReturns.length, benchmarkReturns.length);

  if (n === 0) {
    return {
      alpha: 0,
      beta: 0,
      correlation: 0,
      rSquared: 0,
      trackingError: 0,
      informationRatio: 0,
    };
  }

  const strategySlice = strategyReturns.slice(0, n);
  const benchmarkSlice = benchmarkReturns.slice(0, n);

  const avgStrategy = strategySlice.reduce((a, b) => a + b, 0) / n;
  const avgBenchmark = benchmarkSlice.reduce((a, b) => a + b, 0) / n;

  let covariance = 0;
  let varianceBenchmark = 0;
  let varianceStrategy = 0;

  for (let i = 0; i < n; i++) {
    const diffStrategy = strategySlice[i] - avgStrategy;
    const diffBenchmark = benchmarkSlice[i] - avgBenchmark;
    covariance += diffStrategy * diffBenchmark;
    varianceBenchmark += diffBenchmark * diffBenchmark;
    varianceStrategy += diffStrategy * diffStrategy;
  }

  covariance /= n;
  varianceBenchmark /= n;
  varianceStrategy /= n;

  const stdDevBenchmark = Math.sqrt(varianceBenchmark);
  const stdDevStrategy = Math.sqrt(varianceStrategy);

  const beta = varianceBenchmark > 0 ? covariance / varianceBenchmark : 0;
  const alpha = avgStrategy - beta * avgBenchmark;
  const correlation = stdDevBenchmark > 0 && stdDevStrategy > 0
    ? covariance / (stdDevBenchmark * stdDevStrategy)
    : 0;
  const rSquared = correlation * correlation;

  const excessReturns = strategySlice.map((s, i) => s - benchmarkSlice[i]);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / n;
  const varianceExcess = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / n;
  const trackingError = Math.sqrt(varianceExcess);
  const informationRatio = trackingError > 0 ? avgExcess / trackingError : 0;

  return {
    alpha,
    beta,
    correlation,
    rSquared,
    trackingError,
    informationRatio,
  };
}

export function calculateBasicMetrics(
  result: BacktestResult,
  returns: number[],
  equity: number[]
): { totalReturn: number; annualizedReturn: number; volatility: number } {
  const totalReturn = result.totalReturn;

  const startDate = new Date(result.startDate);
  const endDate = new Date(result.endDate);
  const years = Math.max(0.1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const annualizedReturn = (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;

  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
  };
}

export function calculateRiskMetrics(
  result: BacktestResult,
  returns: number[],
  equity: number[],
  benchmarkReturns?: number[]
): {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  treynorRatio: number;
  omegaRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  averageDrawdown: number;
  recoveryFactor: number;
  ulcerIndex: number;
  painRatio: number;
  alpha: number;
  beta: number;
  trackingError: number;
} {
  const riskFreeRate = 2;

  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 0
    ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252) : 0;

  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn * 252 - riskFreeRate) / (downsideDeviation * Math.sqrt(252)) : 0;

  const drawdownAnalysis = analyzeDrawdowns(equity, result.trades);
  const calmarRatio = drawdownAnalysis.maxDrawdown > 0
    ? (result.totalReturn / drawdownAnalysis.maxDrawdown)
    : 0;

  const recoveryFactor = drawdownAnalysis.maxDrawdown > 0
    ? result.totalReturn / drawdownAnalysis.maxDrawdown
    : 0;

  const ulcerIndex = calculateUlcerIndex(equity);
  const painRatio = ulcerIndex > 0 ? result.totalReturn / ulcerIndex : 0;

  const threshold = 0;
  const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + r - threshold, 0);
  const losses = returns.filter(r => r < threshold).reduce((sum, r) => sum + threshold - r, 0);
  const omegaRatio = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

  let alpha = 0, beta = 0, informationRatio = 0, trackingError = 0;

  if (benchmarkReturns && benchmarkReturns.length === returns.length) {
    const benchmarkStats = calculateBenchmarkMetrics(returns, benchmarkReturns);
    alpha = benchmarkStats.alpha;
    beta = benchmarkStats.beta;
    informationRatio = benchmarkStats.informationRatio;
    trackingError = benchmarkStats.trackingError;
  }

  return {
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
    calmarRatio: parseFloat(calmarRatio.toFixed(2)),
    informationRatio: parseFloat(informationRatio.toFixed(2)),
    treynorRatio: beta > 0 ? parseFloat((result.totalReturn / beta).toFixed(2)) : 0,
    omegaRatio: parseFloat(omegaRatio.toFixed(2)),
    maxDrawdown: parseFloat(drawdownAnalysis.maxDrawdown.toFixed(2)),
    maxDrawdownDuration: drawdownAnalysis.maxDrawdownDuration,
    averageDrawdown: parseFloat(drawdownAnalysis.averageDrawdown.toFixed(2)),
    recoveryFactor: parseFloat(recoveryFactor.toFixed(2)),
    ulcerIndex: parseFloat(ulcerIndex.toFixed(2)),
    painRatio: parseFloat(painRatio.toFixed(2)),
    alpha: parseFloat(alpha.toFixed(2)),
    beta: parseFloat(beta.toFixed(2)),
    trackingError: parseFloat(trackingError.toFixed(2)),
  };
}

export function calculateDistributionMetrics(returns: number[]): {
  skewness: number;
  kurtosis: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  kRatio: number;
  rSquared: number;
  upCaptureRatio: number;
  downCaptureRatio: number;
} {
  if (returns.length === 0) {
    return {
      skewness: 0,
      kurtosis: 0,
      valueAtRisk95: 0,
      valueAtRisk99: 0,
      conditionalVaR95: 0,
      kRatio: 0,
      rSquared: 0,
      upCaptureRatio: 0,
      downCaptureRatio: 0,
    };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var99Index = Math.floor(sortedReturns.length * 0.01);
  const valueAtRisk95 = sortedReturns[var95Index] || 0;
  const valueAtRisk99 = sortedReturns[var99Index] || 0;

  const cvar95Returns = sortedReturns.slice(0, var95Index);
  const conditionalVaR95 = cvar95Returns.length > 0
    ? cvar95Returns.reduce((a, b) => a + b, 0) / cvar95Returns.length
    : 0;

  return {
    skewness: parseFloat(skewness.toFixed(2)),
    kurtosis: parseFloat(kurtosis.toFixed(2)),
    valueAtRisk95: parseFloat(valueAtRisk95.toFixed(2)),
    valueAtRisk99: parseFloat(valueAtRisk99.toFixed(2)),
    conditionalVaR95: parseFloat(conditionalVaR95.toFixed(2)),
    kRatio: 0,
    rSquared: 0,
    upCaptureRatio: 0,
    downCaptureRatio: 0,
  };
}
