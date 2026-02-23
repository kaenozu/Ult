import { AssetData, CovarianceOptions } from './types';

export class CalculationUtils {
  static calculatePairwiseCovariance(returns1: number[], returns2: number[]): number {
    const len = Math.min(returns1.length, returns2.length);
    if (len === 0) return 0;
    const slice1 = returns1.slice(-len), slice2 = returns2.slice(-len);
    const mean1 = slice1.reduce((a, b) => a + b, 0) / len;
    const mean2 = slice2.reduce((a, b) => a + b, 0) / len;
    let covariance = 0;
    for (let i = 0; i < len; i++) covariance += (slice1[i] - mean1) * (slice2[i] - mean2);
    return covariance / (len - 1);
  }

  static calculateAnnualizedReturn(dailyReturns: number[], tradingDaysPerYear: number): number {
    if (dailyReturns.length === 0) return 0;
    let product = 1;
    for (const r of dailyReturns) if (r > -1) product *= (1 + r);
    const result = (Math.pow(product, tradingDaysPerYear / dailyReturns.length) - 1) * 100;
    return isNaN(result) || !isFinite(result) ? 0 : result;
  }

  static calculateAnnualizedVolatility(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0;
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  static calculatePortfolioReturn(weights: Map<string, number>, expectedReturns: Map<string, number>): number {
    let result = 0;
    weights.forEach((weight, symbol) => result += weight * (expectedReturns.get(symbol) || 0));
    return result;
  }

  static calculatePortfolioVolatility(weights: Map<string, number>, covarianceMatrix: Map<string, Map<string, number>>): number {
    let variance = 0;
    weights.forEach((w1, s1) => weights.forEach((w2, s2) => variance += w1 * w2 * (covarianceMatrix.get(s1)?.get(s2) || 0)));
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  static calculateDownsideRisk(assets: AssetData[], weights: Map<string, number>): number {
    let downsideVariance = 0, totalWeight = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && weight > 0) {
        const meanReturn = asset.returns.reduce((a, b) => a + b, 0) / asset.returns.length;
        for (const r of asset.returns) if (r < meanReturn) downsideVariance += weight * Math.pow(r - meanReturn, 2);
        totalWeight += weight;
      }
    });
    return totalWeight === 0 || downsideVariance === 0 ? 0 : Math.sqrt(downsideVariance / totalWeight) * Math.sqrt(252) * 100;
  }

  static calculateMaxDrawdown(assets: AssetData[], weights: Map<string, number>): number {
    let portfolioValue = 100, peak = 100, maxDrawdown = 0;
    const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;
    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset?.returns[i] !== undefined) dailyReturn += weight * asset.returns[i];
      });
      portfolioValue *= (1 + dailyReturn);
      peak = Math.max(peak, portfolioValue);
      maxDrawdown = Math.max(maxDrawdown, (peak - portfolioValue) / peak);
    }
    return maxDrawdown * 100;
  }

  static calculateVaR(assets: AssetData[], weights: Map<string, number>, confidence: number): number {
    const returns = this.getPortfolioReturns(assets, weights);
    returns.sort((a, b) => a - b);
    return returns[Math.floor((1 - confidence) * returns.length)] * 100 * Math.sqrt(252);
  }

  static calculateCVaR(assets: AssetData[], weights: Map<string, number>, confidence: number): number {
    const returns = this.getPortfolioReturns(assets, weights);
    returns.sort((a, b) => a - b);
    const tailReturns = returns.slice(0, Math.floor((1 - confidence) * returns.length));
    return tailReturns.length === 0 ? 0 : (tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) * 100 * Math.sqrt(252);
  }

  static calculateBeta(assets: AssetData[], weights: Map<string, number>, benchmarkReturns: number[], riskFreeRate: number): { beta: number; alpha: number } {
    const portfolioReturns = this.getPortfolioReturns(assets, weights, benchmarkReturns.length);
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
    const benchmarkVar = benchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / benchmarkReturns.length;
    const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    let covariance = 0;
    for (let i = 0; i < portfolioReturns.length; i++) covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
    covariance /= portfolioReturns.length;
    const beta = benchmarkVar > 0 ? covariance / benchmarkVar : 1;
    const dailyRfRate = riskFreeRate / 252;
    const alpha = (portfolioMean - dailyRfRate) - beta * (benchmarkMean - dailyRfRate);
    return { beta, alpha };
  }

  static calculateCovarianceMatrix(assets: AssetData[], options: CovarianceOptions): Map<string, Map<string, number>> {
    const lookback = options.lookbackPeriod || Math.min(...assets.map(a => a.returns.length));
    const l2Reg = options.l2Regularization || 0;
    const matrix = new Map<string, Map<string, number>>();
    for (const a1 of assets) {
      matrix.set(a1.symbol, new Map());
      for (const a2 of assets) {
        const cov = this.calculatePairwiseCovariance(a1.returns.slice(-lookback), a2.returns.slice(-lookback));
        matrix.get(a1.symbol)!.set(a2.symbol, a1.symbol === a2.symbol ? cov + l2Reg : cov);
      }
    }
    return matrix;
  }

  static calculateExpectedReturns(assets: AssetData[], tradingDays: number): Map<string, number> {
    const returns = new Map<string, number>();
    for (const asset of assets) returns.set(asset.symbol, this.calculateAnnualizedReturn(asset.returns, tradingDays));
    return returns;
  }

  private static getPortfolioReturns(assets: AssetData[], weights: Map<string, number>, maxDays?: number): number[] {
    const returns: number[] = [];
    const numDays = maxDays ?? (assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0);
    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset?.returns[i] !== undefined) dailyReturn += weight * asset.returns[i];
      });
      returns.push(dailyReturn);
    }
    return returns;
  }

  static optimizeSingleAsset(asset: AssetData, riskFreeRate: number): { return: number; volatility: number; sharpe: number } {
    const avgReturn = asset.returns.reduce((a, b) => a + b, 0) / asset.returns.length;
    const annualizedReturn = avgReturn * 252 * 100;
    const variance = asset.returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / asset.returns.length;
    const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
    return { return: annualizedReturn, volatility: annualizedVol, sharpe: annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0 };
  }
}
