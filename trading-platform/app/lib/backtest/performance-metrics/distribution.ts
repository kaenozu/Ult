import {
  BenchmarkMetricsResult,
  ReturnDistribution,
  BenchmarkComparison,
  HistogramBin,
} from './types';

export function calculateBenchmarkMetrics(
  strategyReturns: number[],
  benchmarkReturns: number[]
): BenchmarkMetricsResult {
  const n = Math.min(strategyReturns.length, benchmarkReturns.length);
  const strategySlice = strategyReturns.slice(0, n);
  const benchmarkSlice = benchmarkReturns.slice(0, n);
  const avgStrategy = strategySlice.reduce((a, b) => a + b, 0) / n;
  const avgBenchmark = benchmarkSlice.reduce((a, b) => a + b, 0) / n;

  let covariance = 0, varianceBenchmark = 0, varianceStrategy = 0;
  for (let i = 0; i < n; i++) {
    const diffStrategy = strategySlice[i] - avgStrategy;
    const diffBenchmark = benchmarkSlice[i] - avgBenchmark;
    covariance += diffStrategy * diffBenchmark;
    varianceBenchmark += diffBenchmark * diffBenchmark;
    varianceStrategy += diffStrategy * diffStrategy;
  }
  covariance /= n; varianceBenchmark /= n; varianceStrategy /= n;

  const stdDevBenchmark = Math.sqrt(varianceBenchmark);
  const stdDevStrategy = Math.sqrt(varianceStrategy);
  const beta = varianceBenchmark > 0 ? covariance / varianceBenchmark : 0;
  const alpha = avgStrategy - beta * avgBenchmark;
  const correlation = stdDevBenchmark > 0 && stdDevStrategy > 0 ? covariance / (stdDevBenchmark * stdDevStrategy) : 0;
  const rSquared = correlation * correlation;

  const excessReturns = strategySlice.map((s, i) => s - benchmarkSlice[i]);
  const avgExcess = excessReturns.reduce((a, b) => a + b, 0) / n;
  const varianceExcess = excessReturns.reduce((sum, r) => sum + Math.pow(r - avgExcess, 2), 0) / n;
  const trackingError = Math.sqrt(varianceExcess);
  const informationRatio = trackingError > 0 ? avgExcess / trackingError : 0;

  return { alpha, beta, correlation, rSquared, trackingError, informationRatio };
}

export function computeReturnDistribution(returns: number[], binCount = 20): ReturnDistribution {
  if (returns.length === 0) {
    return {
      histogram: [],
      stats: { mean: 0, median: 0, stdDev: 0, skewness: 0, kurtosis: 0, min: 0, max: 0 },
      percentiles: { p1: 0, p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
    };
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const min = sorted[0], max = sorted[sorted.length - 1], binWidth = (max - min) / binCount;
  const histogram: HistogramBin[] = [];

  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth, binEnd = binStart + binWidth;
    const count = returns.filter((r) => r >= binStart && (i === binCount - 1 ? r <= binEnd : r < binEnd)).length;
    histogram.push({
      binStart: parseFloat(binStart.toFixed(2)), binEnd: parseFloat(binEnd.toFixed(2)),
      count, frequency: parseFloat((count / returns.length).toFixed(4)),
    });
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;
  const getPercentile = (p: number) => sorted[Math.floor((sorted.length * p) / 100)] || 0;

  return {
    histogram,
    stats: {
      mean: parseFloat(mean.toFixed(2)), median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)), skewness: parseFloat(skewness.toFixed(2)),
      kurtosis: parseFloat(kurtosis.toFixed(2)), min: parseFloat(min.toFixed(2)), max: parseFloat(max.toFixed(2)),
    },
    percentiles: {
      p1: parseFloat(getPercentile(1).toFixed(2)), p5: parseFloat(getPercentile(5).toFixed(2)),
      p10: parseFloat(getPercentile(10).toFixed(2)), p25: parseFloat(getPercentile(25).toFixed(2)),
      p50: parseFloat(getPercentile(50).toFixed(2)), p75: parseFloat(getPercentile(75).toFixed(2)),
      p90: parseFloat(getPercentile(90).toFixed(2)), p95: parseFloat(getPercentile(95).toFixed(2)),
      p99: parseFloat(getPercentile(99).toFixed(2)),
    },
  };
}

export function computeBenchmarkComparison(
  strategyReturns: number[],
  benchmarkReturns: number[],
  dates: string[]
): BenchmarkComparison {
  const comparison = calculateBenchmarkMetrics(strategyReturns, benchmarkReturns);
  const upMonths = strategyReturns.filter((r, i) => r > 0 && benchmarkReturns[i] > 0).length;
  const downMonths = strategyReturns.filter((r, i) => r < 0 && benchmarkReturns[i] < 0).length;
  const benchmarkUpMonths = benchmarkReturns.filter((r) => r > 0).length;
  const benchmarkDownMonths = benchmarkReturns.filter((r) => r < 0).length;
  const upCapture = benchmarkUpMonths > 0 ? (upMonths / benchmarkUpMonths) * 100 : 0;
  const downCapture = benchmarkDownMonths > 0 ? (downMonths / benchmarkDownMonths) * 100 : 0;
  const monthlyReturns = dates.map((date, i) => ({
    date, strategy: strategyReturns[i], benchmark: benchmarkReturns[i],
    excess: strategyReturns[i] - benchmarkReturns[i],
  }));
  const strategyReturn = strategyReturns.reduce((a, b) => a + b, 0);
  const benchmarkReturn = benchmarkReturns.reduce((a, b) => a + b, 0);

  return {
    strategyReturn: parseFloat(strategyReturn.toFixed(2)),
    benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
    excessReturn: parseFloat((strategyReturn - benchmarkReturn).toFixed(2)),
    alpha: parseFloat(comparison.alpha.toFixed(2)), beta: parseFloat(comparison.beta.toFixed(2)),
    correlation: parseFloat(comparison.correlation.toFixed(2)), rSquared: parseFloat(comparison.rSquared.toFixed(2)),
    trackingError: parseFloat(comparison.trackingError.toFixed(2)),
    informationRatio: parseFloat(comparison.informationRatio.toFixed(2)),
    upCapture: parseFloat(upCapture.toFixed(2)), downCapture: parseFloat(downCapture.toFixed(2)),
    upMonths, downMonths, upRatio: parseFloat(((upMonths / (upMonths + downMonths)) * 100).toFixed(2)),
    monthlyReturns,
  };
}
