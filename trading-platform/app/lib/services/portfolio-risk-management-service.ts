/**
 * Portfolio Risk Management Service
 * 
 * このモジュールは、ポートフォリオ全体のリスクを管理する機能を提供します。
 * VaR計算、相関分析、最大ドローダウン制限、ポジション集中度制限などを含みます。
 */

import { Position, Stock, OHLCV } from '@/app/types';
import { calculateATR } from '@/app/lib/utils';

export interface PortfolioRiskMetrics {
  valueAtRisk: number;           // リスク価値 (VaR)
  expectedShortfall: number;     // 期待ショートフォール
  maxDrawdown: number;          // 最大ドローダウン
  volatility: number;           // ポ合ボラティリティ
  beta: number;                 // ポ合ベータ
  sharpeRatio: number;          // シャープレシオ
  sortinoRatio: number;         // ソートリノレシオ
  correlationMatrix: number[][]; // 相関行列
  concentrationRisk: number;    // 集中リスク
  diversificationRatio: number; // 分散化レシオ
  marginUtilization: number;    // マージン利用率
}

export interface RiskLimits {
  maxVaR: number;              // 最大VaR
  maxDrawdown: number;         // 最大ドローダウン制限
  maxPositionConcentration: number; // 最大ポジション集中度
  maxSectorExposure: number;   // 最大セクター暴露
  maxBeta: number;             // 最大ベータ
  minDiversificationRatio: number; // 最小分散化レシオ
}

export interface PositionRisk {
  symbol: string;
  value: number;
  contributionToVaR: number;
  contributionToVolatility: number;
  beta: number;
  correlationToPortfolio: number;
  riskMetrics: {
    volatility: number;
    beta: number;
    valueAtRisk: number;
  };
}

class PortfolioRiskManagementService {
  private riskFreeRate: number = 0.01; // 無リスクレート 1%

  /**
   * ポ合リスクメトリクスを計算
   */
  calculatePortfolioRiskMetrics(
    positions: Position[],
    stocks: Stock[],
    priceHistory: Record<string, OHLCV[]>,
    benchmarkReturns: number[] = []
  ): PortfolioRiskMetrics {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
    
    if (totalValue === 0 || positions.length === 0) {
      return this.getDefaultRiskMetrics();
    }

    // 重量を計算
    const weights = positions.map(pos => (pos.currentPrice * pos.quantity) / totalValue);

    // 収益率を計算
    const returnsMatrix = this.calculateReturnsMatrix(positions, priceHistory);

    // ポ合収益率
    const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);

    // ボラティリティ（標準偏差）
    const volatility = this.calculateStandardDeviation(portfolioReturns);

    // Value at Risk (VaR) - 95%信頼水準
    const valueAtRisk = this.calculateValueAtRisk(portfolioReturns, 0.95);

    // 期待ショートフォール
    const expectedShortfall = this.calculateExpectedShortfall(portfolioReturns, 0.95);

    // 最大ドローダウン
    const maxDrawdown = this.calculateMaxDrawdown(portfolioReturns);

    // シャープレシオ
    const sharpeRatio = this.calculateSharpeRatio(portfolioReturns, this.riskFreeRate);

    // ソートリノレシオ
    const sortinoRatio = this.calculateSortinoRatio(portfolioReturns, this.riskFreeRate);

    // 相関行列
    const correlationMatrix = this.calculateCorrelationMatrix(returnsMatrix);

    // 集中リスク（最大ポジションの重量）
    const maxPositionWeight = Math.max(...weights);
    const concentrationRisk = maxPositionWeight;

    // 分散化レシオ
    const diversificationRatio = this.calculateDiversificationRatio(returnsMatrix, weights);

    // ベータ（ベンチマークがある場合）
    let beta = 0;
    if (benchmarkReturns.length > 0) {
      beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
    }

    // マージン利用率（ポジションの平均）
    const marginUtilization = positions.reduce((sum, pos) => sum + pos.quantity, 0) / positions.length;

    return {
      valueAtRisk,
      expectedShortfall,
      maxDrawdown,
      volatility,
      beta,
      sharpeRatio,
      sortinoRatio,
      correlationMatrix,
      concentrationRisk,
      diversificationRatio,
      marginUtilization
    };
  }

  /**
   * ポ合の個別ポジションリスクを計算
   */
  calculatePositionRisk(
    position: Position,
    positions: Position[],
    priceHistory: Record<string, OHLCV[]>
  ): PositionRisk {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
    const positionValue = position.currentPrice * position.quantity;
    const weight = positionValue / totalValue;

    // ポ合との相関を計算
    const portfolioReturns = this.calculatePortfolioReturns(
      this.calculateReturnsMatrix(positions, priceHistory),
      positions.map(pos => (pos.currentPrice * pos.quantity) / totalValue)
    );
    
    const positionReturns = this.calculateAssetReturns(position.symbol, priceHistory);
    const correlationToPortfolio = this.calculateCorrelation(positionReturns, portfolioReturns);

    // ポ合ボラティリティ
    const portfolioVol = this.calculateStandardDeviation(portfolioReturns);

    // ポ合VaR
    const portfolioVaR = this.calculateValueAtRisk(portfolioReturns, 0.95);

    // ポ合リスク指標
    const contributionToVaR = (weight * correlationToPortfolio) * portfolioVaR;
    const contributionToVolatility = (weight * correlationToPortfolio) * portfolioVol;

    // 個人資産のリスク指標
    const assetVol = this.calculateStandardDeviation(positionReturns);
    const assetBeta = this.calculateBeta(positionReturns, portfolioReturns);

    return {
      symbol: position.symbol,
      value: positionValue,
      contributionToVaR,
      contributionToVolatility,
      beta: assetBeta,
      correlationToPortfolio,
      riskMetrics: {
        volatility: assetVol,
        beta: assetBeta,
        valueAtRisk: this.calculateValueAtRisk(positionReturns, 0.95)
      }
    };
  }

  /**
   * リスクリミットをチェック
   */
  checkRiskLimits(
    portfolioRiskMetrics: PortfolioRiskMetrics,
    riskLimits: RiskLimits
  ): {
    isWithinLimits: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // VaR制限
    if (portfolioRiskMetrics.valueAtRisk > riskLimits.maxVaR) {
      violations.push(`VaR exceeds limit: ${portfolioRiskMetrics.valueAtRisk.toFixed(2)} > ${riskLimits.maxVaR}`);
      recommendations.push('Reduce position sizes or hedge with derivatives');
    }

    // 最大ドローダウン制限
    if (portfolioRiskMetrics.maxDrawdown > riskLimits.maxDrawdown) {
      violations.push(`Max Drawdown exceeds limit: ${portfolioRiskMetrics.maxDrawdown.toFixed(2)} > ${riskLimits.maxDrawdown}`);
      recommendations.push('Implement tighter stop losses or reduce leverage');
    }

    // 集中リスク制限
    if (portfolioRiskMetrics.concentrationRisk > riskLimits.maxPositionConcentration) {
      violations.push(`Concentration risk exceeds limit: ${portfolioRiskMetrics.concentrationRisk.toFixed(2)} > ${riskLimits.maxPositionConcentration}`);
      recommendations.push('Diversify portfolio by reducing largest positions');
    }

    // 分散化レシオ制限
    if (portfolioRiskMetrics.diversificationRatio < riskLimits.minDiversificationRatio) {
      violations.push(`Diversification ratio below minimum: ${portfolioRiskMetrics.diversificationRatio.toFixed(2)} < ${riskLimits.minDiversificationRatio}`);
      recommendations.push('Add uncorrelated assets to increase diversification');
    }

    // ベータ制限
    if (portfolioRiskMetrics.beta > riskLimits.maxBeta) {
      violations.push(`Beta exceeds limit: ${portfolioRiskMetrics.beta.toFixed(2)} > ${riskLimits.maxBeta}`);
      recommendations.push('Reduce exposure to high-beta assets');
    }

    return {
      isWithinLimits: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * リスコ調整後のポジションサイズを提案
   */
  suggestPositionAdjustments(
    positions: Position[],
    riskLimits: RiskLimits,
    portfolioRiskMetrics: PortfolioRiskMetrics
  ): {
    symbol: string;
    currentSize: number;
    suggestedSize: number;
    reason: string;
  }[] {
    const suggestions = [];

    // 集中リスクが高い場合の調整
    if (portfolioRiskMetrics.concentrationRisk > riskLimits.maxPositionConcentration) {
      // 最大ポジションを特定
      const maxValue = Math.max(...positions.map(p => p.currentPrice * p.quantity));
      const maxPosition = positions.find(p => (p.currentPrice * p.quantity) === maxValue);

      if (maxPosition) {
        const currentSize = maxPosition.currentPrice * maxPosition.quantity;
        const suggestedSize = riskLimits.maxPositionConcentration * 
                             positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
        
        suggestions.push({
          symbol: maxPosition.symbol,
          currentSize,
          suggestedSize,
          reason: 'High concentration risk - reducing position size'
        });
      }
    }

    // ボラティリティが高い場合の調整
    if (portfolioRiskMetrics.volatility > riskLimits.maxVaR * 2) { // 簡易的なボラティリティ制限
      // 各資産のボラティリティを計算して高ボラティリティ資産を特定
      // （実際には各資産のボラティリティを計算する必要がある）
    }

    return suggestions;
  }

  /**
   * 収益率行列を計算
   */
  private calculateReturnsMatrix(
    positions: Position[],
    priceHistory: Record<string, OHLCV[]>
  ): number[][] {
    const returnsMatrix: number[][] = [];
    
    // 最も長い価格履歴を持つ期間を基準にする
    const maxPeriod = Math.max(...Object.values(priceHistory).map(history => history.length));
    
    for (const position of positions) {
      const history = priceHistory[position.symbol];
      if (!history) continue;
      
      const assetReturns: number[] = [];
      for (let i = 1; i < history.length; i++) {
        const returnVal = (history[i].close - history[i-1].close) / history[i-1].close;
        assetReturns.push(returnVal);
      }
      
      // 镰期間のデータを埋める（ゼロで）
      while (assetReturns.length < maxPeriod - 1) {
        assetReturns.unshift(0);
      }
      
      returnsMatrix.push(assetReturns);
    }
    
    return returnsMatrix;
  }

  /**
   * ポ合収益率を計算
   */
  private calculatePortfolioReturns(returnsMatrix: number[][], weights: number[]): number[] {
    const portfolioReturns: number[] = [];
    
    for (let i = 0; i < returnsMatrix[0].length; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < returnsMatrix.length; j++) {
        portfolioReturn += returnsMatrix[j][i] * weights[j];
      }
      portfolioReturns.push(portfolioReturn);
    }
    
    return portfolioReturns;
  }

  /**
   * 資産の収益率を計算
   */
  private calculateAssetReturns(symbol: string, priceHistory: Record<string, OHLCV[]>): number[] {
    const history = priceHistory[symbol];
    if (!history) return [];
    
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const returnVal = (history[i].close - history[i-1].close) / history[i-1].close;
      returns.push(returnVal);
    }
    
    return returns;
  }

  /**
   * 標準偏差を計算
   */
  private calculateStandardDeviation(data: number[]): number {
    if (data.length === 0) return 0;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    
    return Math.sqrt(variance);
  }

  /**
   * VaRを計算（ヒストリカル法）
   */
  private calculateValueAtRisk(returns: number[], confidenceLevel: number): number {
    if (returns.length === 0) return 0;
    
    // 収益率をソート
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // 信頼水準に対応するインデックスを計算
    const index = Math.floor((1 - confidenceLevel) * returns.length);
    
    // VaRを計算（負の値を返す）
    return -sortedReturns[Math.max(0, index)];
  }

  /**
   * 期待ショートフォールを計算
   */
  private calculateExpectedShortfall(returns: number[], confidenceLevel: number): number {
    if (returns.length === 0) return 0;
    
    // VaRを計算
    const varValue = this.calculateValueAtRisk(returns, confidenceLevel);
    
    // VaRを超える損失の平均を計算
    const extremeLosses = returns.filter(r => r < -varValue);
    if (extremeLosses.length === 0) return varValue;
    
    const avgExtremeLoss = extremeLosses.reduce((sum, val) => sum + val, 0) / extremeLosses.length;
    
    return -avgExtremeLoss;
  }

  /**
   * 最大ドローダウンを計算
   */
  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    let peak = 1;
    let maxDrawdown = 0;
    let currentEquity = 1;
    
    for (const returnVal of returns) {
      currentEquity *= (1 + returnVal);
      
      if (currentEquity > peak) {
        peak = currentEquity;
      }
      
      const drawdown = (peak - currentEquity) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  /**
   * シャープレシオを計算
   */
  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const volatility = this.calculateStandardDeviation(returns);
    
    if (volatility === 0) return 0;
    
    return (meanReturn - riskFreeRate) / volatility;
  }

  /**
   * ソートリノレシオを計算
   */
  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    
    // マウンサイドリスク（負の収益率の標準偏差）
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length === 0) return 0;
    
    const downsideDeviation = this.calculateStandardDeviation(downsideReturns);
    
    if (downsideDeviation === 0) return 0;
    
    return (meanReturn - riskFreeRate) / downsideDeviation;
  }

  /**
   * 相関行列を計算
   */
  private calculateCorrelationMatrix(returnsMatrix: number[][]): number[][] {
    const n = returnsMatrix.length;
    const correlationMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          correlationMatrix[i][j] = this.calculateCorrelation(returnsMatrix[i], returnsMatrix[j]);
        }
      }
    }
    
    return correlationMatrix;
  }

  /**
   * 2つの系列の相関を計算
   */
  private calculateCorrelation(series1: number[], series2: number[]): number {
    if (series1.length !== series2.length || series1.length === 0) return 0;
    
    const n = series1.length;
    const sum1 = series1.reduce((sum, val) => sum + val, 0);
    const sum2 = series2.reduce((sum, val) => sum + val, 0);
    const sum1Sq = series1.reduce((sum, val) => sum + val * val, 0);
    const sum2Sq = series2.reduce((sum, val) => sum + val * val, 0);
    const pSum = series1.reduce((sum, val, idx) => sum + val * series2[idx], 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    if (den === 0) return 0;
    
    return num / den;
  }

  /**
   * 分散化レシオを計算
   */
  private calculateDiversificationRatio(returnsMatrix: number[][], weights: number[]): number {
    if (returnsMatrix.length === 0) return 0;
    
    // ポ合ボラティリティ
    const portfolioVol = this.calculateStandardDeviation(
      this.calculatePortfolioReturns(returnsMatrix, weights)
    );
    
    // 重量付き個別資産ボラティリティ
    let weightedIndividualVol = 0;
    for (let i = 0; i < returnsMatrix.length; i++) {
      const assetVol = this.calculateStandardDeviation(returnsMatrix[i]);
      weightedIndividualVol += weights[i] * assetVol;
    }
    
    if (weightedIndividualVol === 0) return 0;
    
    return portfolioVol / weightedIndividualVol;
  }

  /**
   * ベータを計算
   */
  private calculateBeta(assetReturns: number[], benchmarkReturns: number[]): number {
    if (assetReturns.length !== benchmarkReturns.length || assetReturns.length === 0) return 0;
    
    // 共分散と分散を計算
    const n = assetReturns.length;
    const assetMean = assetReturns.reduce((sum, val) => sum + val, 0) / n;
    const benchMean = benchmarkReturns.reduce((sum, val) => sum + val, 0) / n;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < n; i++) {
      covariance += (assetReturns[i] - assetMean) * (benchmarkReturns[i] - benchMean);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - benchMean, 2);
    }
    
    if (benchmarkVariance === 0) return 0;
    
    return covariance / benchmarkVariance;
  }

  /**
   * デフォルトリスクメトリクスを返す
   */
  private getDefaultRiskMetrics(): PortfolioRiskMetrics {
    return {
      valueAtRisk: 0,
      expectedShortfall: 0,
      maxDrawdown: 0,
      volatility: 0,
      beta: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      correlationMatrix: [],
      concentrationRisk: 0,
      diversificationRatio: 1,
      marginUtilization: 0
    };
  }
}

export const portfolioRiskManagementService = new PortfolioRiskManagementService();