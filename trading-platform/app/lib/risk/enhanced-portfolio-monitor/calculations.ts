export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateBeta(returns: number[], benchmarkReturns: number[]): number {
  if (returns.length < 2 || benchmarkReturns.length < 2) return 1;

  const minLength = Math.min(returns.length, benchmarkReturns.length);
  const ret = returns.slice(-minLength);
  const bench = benchmarkReturns.slice(-minLength);

  const meanRet = ret.reduce((sum, r) => sum + r, 0) / ret.length;
  const meanBench = bench.reduce((sum, r) => sum + r, 0) / bench.length;

  let covariance = 0;
  let benchVariance = 0;

  for (let i = 0; i < ret.length; i++) {
    covariance += (ret[i] - meanRet) * (bench[i] - meanBench);
    benchVariance += Math.pow(bench[i] - meanBench, 2);
  }

  return benchVariance > 0 ? covariance / benchVariance : 1;
}

export function calculateSharpeRatio(returns: number[], volatility: number): number {
  if (returns.length === 0 || volatility === 0) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const annualizedReturn = mean * 252;
  const riskFreeRate = 0.02;

  return (annualizedReturn - riskFreeRate) / volatility;
}

export function calculateSortinoRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const negativeReturns = returns.filter(r => r < 0);

  if (negativeReturns.length === 0) return 0;

  const downside = Math.sqrt(
    negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
  ) * Math.sqrt(252);

  const annualizedReturn = mean * 252;
  const riskFreeRate = 0.02;

  return downside > 0 ? (annualizedReturn - riskFreeRate) / downside : 0;
}

export function calculateCurrentDrawdownFromReturns(returns: number[]): number {
  if (returns.length === 0) return 0;

  let peak = 1;
  let cumulative = 1;

  for (const ret of returns) {
    cumulative *= (1 + ret);
    peak = Math.max(peak, cumulative);
  }

  return ((peak - cumulative) / peak) * 100;
}
