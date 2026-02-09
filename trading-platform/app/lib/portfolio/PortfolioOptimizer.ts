/**
 * PortfolioOptimizer.ts
 * 
 * ポートフォリオ最適化モジュール。
 * 現代ポートフォリオ理論（Modern Portfolio Theory: MPT）に基づいて、
 * リスクとリターンのバランスを最適化したポートフォリオを提案します。
 */

import { EventEmitter } from 'events';
import { PORTFOLIO_OPTIMIZATION_DEFAULTS, PORTFOLIO_CONSTRAINTS } from '../constants/portfolio';

// ============================================================================
// Types
// ============================================================================

/**
 * 最適化制約
 */
export interface OptimizationConstraints {
  /** 最小ウェイト */
  minWeight: number;
  /** 最大ウェイト */
  maxWeight: number;
  /** 目標リターン（%） */
  targetReturn?: number;
  /** 最大リスク（%） */
  maxRisk?: number;
  /** 部門別制限: Map<部門名, 最大ウェイト> */
  sectorLimits?: Map<string, number>;
  /** 最低リターン閾値（%） */
  minReturnThreshold?: number;
}

/**
 * 最適化結果
 */
export interface OptimizationResult {
  /** シンボルごとのウェイト: Map<シンボル, ウェイト> */
  weights: Map<string, number>;
  /** 期待リターン（%） */
  expectedReturn: number;
  /** 期待ボラティリティ（%） */
  expectedVolatility: number;
  /** シャープレシオ */
  sharpeRatio: number;
  /** インフォメーションレシオ */
  informationRatio?: number;
  /** トレイノレシオ */
  sortinoRatio?: number;
  /** 最大下落率（%） */
  maxDrawdown?: number;
  /** 効率的フロンティア上のポイント */
  efficientFrontier: EfficientFrontierPoint[];
  /** 最適化タイプ */
  optimizationType: 'MAX_SHARPE' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'TARGET_RETURN';
  /** 信頼度 */
  confidence: number;
}

/**
 * 効率的フロンティアのポイント
 */
export interface EfficientFrontierPoint {
  /** 期待リターン（%） */
  return: number;
  /** リスク/ボラティリティ（%） */
  volatility: number;
  /** シャープレシオ */
  sharpeRatio: number;
  /** ウェイト配分: Map<シンボル, ウェイト> */
  weights: Map<string, number>;
}

/**
 * 資産データ
 */
export interface AssetData {
  /** シンボル */
  symbol: string;
  /** 部門 */
  sector?: string;
  /** 歷史リターン配列（日次） */
  returns: number[];
  /** 現在価格 */
  currentPrice?: number;
  /** 会社名 */
  companyName?: string;
}

/**
 * 共分散行列計算オプション
 */
export interface CovarianceOptions {
  /** 使用するデータ点数 */
  lookbackPeriod?: number;
  /** 年間交易日数 */
  tradingDaysPerYear?: number;
  /** リスクフリーレート（%） */
  riskFreeRate?: number;
  /** L2正則化係数（共分散行列の正定値性を確保） */
  l2Regularization?: number;
}

/**
 * ポートフォリオ関連リスク指標
 */
export interface PortfolioRiskMetrics {
  /** ポートフォリオ全体のリターン（%） */
  portfolioReturn: number;
  /** ポートフォリオ全体のリスク（%） */
  portfolioVolatility: number;
  /** リスク_freeレートの超過リターン（%） */
  excessReturn: number;
  /** シャープレシオ */
  sharpeRatio: number;
  /** 下方リスク（%） */
  downsideRisk: number;
  /** トレイノレシオ */
  sortinoRatio: number;
  /** 最大下落率（%） */
  maxDrawdown: number;
  /** VaR（バリュー・アット・リスク）（%） */
  valueAtRisk: Map<number, number>; // confidence level -> VaR
  /** CVaR（条件付きVaR）（%） */
  conditionalVaR: Map<number, number>; // confidence level -> CVaR
  /** ベータ */
  beta?: number;
  /** アルファ */
  alpha?: number;
}

/**
 * 最適化設定
 */
export interface OptimizerConfig {
  /** リスクフリーレート（%） */
  riskFreeRate: number;
  /** 年間交易日数 */
  tradingDaysPerYear: number;
  /** 最適化アルゴリズムの反復上限 */
  maxIterations: number;
  /** 収束閾値 */
  convergenceThreshold: number;
  /** 許容される最大相関 */
  maxCorrelation: number;
  /** 部門集中制限（%） */
  sectorConcentrationLimit: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: OptimizerConfig = {
  riskFreeRate: PORTFOLIO_OPTIMIZATION_DEFAULTS.RISK_FREE_RATE,
  tradingDaysPerYear: PORTFOLIO_OPTIMIZATION_DEFAULTS.TRADING_DAYS_PER_YEAR,
  maxIterations: PORTFOLIO_OPTIMIZATION_DEFAULTS.MAX_ITERATIONS,
  convergenceThreshold: PORTFOLIO_OPTIMIZATION_DEFAULTS.CONVERGENCE_THRESHOLD,
  maxCorrelation: 0.99, // correlation-specific, not consolidated
  sectorConcentrationLimit: 0.4, // sector-specific, not consolidated
};

const DEFAULT_CONSTRAINTS: OptimizationConstraints = {
  minWeight: PORTFOLIO_CONSTRAINTS.DEFAULT_MIN_WEIGHTS / 100, // Convert percentage to decimal
  maxWeight: PORTFOLIO_CONSTRAINTS.DEFAULT_MAX_WEIGHTS / 100, // Convert percentage to decimal
  minReturnThreshold: -10, // strategy-specific, not consolidated
};

// ============================================================================
// PortfolioOptimizer Class
// ============================================================================

export class PortfolioOptimizer extends EventEmitter {
  private config: OptimizerConfig;
  private cachedCovarianceMatrices: Map<string, Map<string, Map<string, number>>> = new Map();

  constructor(config: Partial<OptimizerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * ポートフォリオを最適化
   */
  optimize(
    assets: AssetData[],
    constraints: Partial<OptimizationConstraints> = {},
    options: Partial<CovarianceOptions> = {}
  ): OptimizationResult {
    if (assets.length === 0) {
      return this.createEmptyResult();
    }

    if (assets.length === 1) {
      return this.optimizeSingleAsset(assets[0]);
    }

    const mergedConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };

    // 共分散行列を計算
    const covarianceMatrix = this.calculateCovarianceMatrix(assets, mergedOptions);
    
    // 期待リターンを計算
    const expectedReturns = this.calculateExpectedReturns(assets, mergedOptions);

    // 最適化タイプを決定
    const optimizationType = this.determineOptimizationType(mergedConstraints);

    // 最適化を実行
    switch (optimizationType) {
      case 'MAX_SHARPE':
        return this.optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints);
      case 'MIN_VARIANCE':
        return this.optimizeMinVariance(assets, covarianceMatrix, expectedReturns, mergedConstraints);
      case 'RISK_PARITY':
        return this.optimizeRiskParity(assets, covarianceMatrix, mergedConstraints);
      case 'TARGET_RETURN':
        return this.optimizeTargetReturn(assets, covarianceMatrix, expectedReturns, mergedConstraints);
      default:
        return this.optimizeMaxSharpe(assets, covarianceMatrix, expectedReturns, mergedConstraints);
    }
  }

  /**
   * 効率的フロンティアを生成
   */
  generateEfficientFrontier(
    assets: AssetData[],
    points: number = 50,
    options: Partial<CovarianceOptions> = {}
  ): EfficientFrontierPoint[] {
    if (assets.length === 0) return [];

    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    const covarianceMatrix = this.calculateCovarianceMatrix(assets, mergedOptions);
    const expectedReturns = this.calculateExpectedReturns(assets, mergedOptions);

    // リターンの範囲を計算 (Optimized: single pass for min/max)
    const returns = assets.map(a => this.calculateAnnualizedReturn(a.returns, mergedOptions.tradingDaysPerYear));
    let minReturn = Infinity;
    let maxReturn = -Infinity;
    for (const ret of returns) {
      if (ret < minReturn) minReturn = ret;
      if (ret > maxReturn) maxReturn = ret;
    }

    const frontier: EfficientFrontierPoint[] = [];
    const step = (maxReturn - minReturn) / (points - 1);

    for (let i = 0; i < points; i++) {
      const targetReturn = minReturn + step * i;
      
      const result = this.optimizeTargetReturn(
        assets,
        covarianceMatrix,
        expectedReturns,
        { ...DEFAULT_CONSTRAINTS, targetReturn }
      );

      frontier.push({
        return: targetReturn,
        volatility: result.expectedVolatility,
        sharpeRatio: result.sharpeRatio,
        weights: result.weights,
      });
    }

    return frontier;
  }

  /**
   * ポートフォリオのリスク指標を計算
   */
  calculateRiskMetrics(
    assets: AssetData[],
    weights: Map<string, number>,
    benchmarkReturns?: number[],
    options: Partial<CovarianceOptions> = {}
  ): PortfolioRiskMetrics {
    const mergedOptions = { tradingDaysPerYear: 252, riskFreeRate: this.config.riskFreeRate, ...options };
    const covarianceMatrix = this.calculateCovarianceMatrix(assets, mergedOptions);
    const expectedReturns = this.calculateExpectedReturns(assets, mergedOptions);

    // ポートフォリオのリターンとリスクを計算
    const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
    const portfolioVolatility = this.calculatePortfolioVolatility(weights, covarianceMatrix);

    // リスクフリーレート超過リターン
    const excessReturn = portfolioReturn - mergedOptions.riskFreeRate;

    // シャープレシオ
    const sharpeRatio = portfolioVolatility > 0 ? excessReturn / portfolioVolatility : 0;

    // 下方リスクとトレイノレシオ
    const downsideRisk = this.calculateDownsideRisk(assets, weights);
    const sortinoRatio = downsideRisk > 0 ? excessReturn / downsideRisk : 0;

    // 最大下落率
    const maxDrawdown = this.calculateMaxDrawdown(assets, weights);

    // VaRとCVaR
    const valueAtRisk = new Map<number, number>();
    const conditionalVaR = new Map<number, number>();
    
    for (const confidence of [0.95, 0.99]) {
      const var95 = this.calculateVaR(assets, weights, confidence);
      const cvar95 = this.calculateCVaR(assets, weights, confidence);
      valueAtRisk.set(confidence, var95);
      conditionalVaR.set(confidence, cvar95);
    }

    // ベータとアルファ（ベンチマークがある場合）
    let beta: number | undefined;
    let alpha: number | undefined;
    if (benchmarkReturns && benchmarkReturns.length > 0) {
      const betaResult = this.calculateBeta(assets, weights, benchmarkReturns, mergedOptions);
      beta = betaResult.beta;
      alpha = betaResult.alpha;
    }

    return {
      portfolioReturn,
      portfolioVolatility,
      excessReturn,
      sharpeRatio,
      downsideRisk,
      sortinoRatio,
      maxDrawdown,
      valueAtRisk,
      conditionalVaR,
      beta,
      alpha,
    };
  }

  /**
   * 部門別の配分を集計
   */
  aggregateBySector(assets: AssetData[], weights: Map<string, number>): Map<string, number> {
    const sectorWeights = new Map<string, number>();

    for (const asset of assets) {
      const sector = asset.sector || 'Unknown';
      const weight = weights.get(asset.symbol) || 0;
      sectorWeights.set(sector, (sectorWeights.get(sector) || 0) + weight);
    }

    return sectorWeights;
  }

  /**
   * リスク分散度を計算
   */
  calculateDiversificationRatio(assets: AssetData[], weights: Map<string, number>): number {
    const covarianceMatrix = this.calculateCovarianceMatrix(assets, { tradingDaysPerYear: 252 });
    const portfolioVol = this.calculatePortfolioVolatility(weights, covarianceMatrix);
    
    let weightedVolSum = 0;
    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset) {
        const vol = this.calculateAnnualizedVolatility(asset.returns);
        weightedVolSum += weight * vol;
      }
    });

    return portfolioVol > 0 ? weightedVolSum / portfolioVol : 1;
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 共分散行列を計算
   */
  private calculateCovarianceMatrix(
    assets: AssetData[],
    options: CovarianceOptions
  ): Map<string, Map<string, number>> {
    const cacheKey = assets.map(a => a.symbol).join('_');
    
    // キャッシュをチェック
    if (this.cachedCovarianceMatrices.has(cacheKey)) {
      return this.cachedCovarianceMatrices.get(cacheKey)!;
    }

    const lookback = options.lookbackPeriod || Math.min(...assets.map(a => a.returns.length));
    const l2Reg = options.l2Regularization || 0;

    const covarianceMatrix = new Map<string, Map<string, number>>();

    for (const asset1 of assets) {
      covarianceMatrix.set(asset1.symbol, new Map());
      
      for (const asset2 of assets) {
        const covariance = this.calculatePairwiseCovariance(
          asset1.returns.slice(-lookback),
          asset2.returns.slice(-lookback)
        );

        // L2正則化を適用
        const regularizedCovariance = asset1.symbol === asset2.symbol
          ? covariance + l2Reg
          : covariance;

        covarianceMatrix.get(asset1.symbol)!.set(asset2.symbol, regularizedCovariance);
      }
    }

    this.cachedCovarianceMatrices.set(cacheKey, covarianceMatrix);
    return covarianceMatrix;
  }

  /**
   * 2資産間の共分散を計算
   */
  private calculatePairwiseCovariance(returns1: number[], returns2: number[]): number {
    const len = Math.min(returns1.length, returns2.length);
    if (len === 0) return 0;

    const slice1 = returns1.slice(-len);
    const slice2 = returns2.slice(-len);

    const mean1 = slice1.reduce((a, b) => a + b, 0) / len;
    const mean2 = slice2.reduce((a, b) => a + b, 0) / len;

    let covariance = 0;
    for (let i = 0; i < len; i++) {
      covariance += (slice1[i] - mean1) * (slice2[i] - mean2);
    }

    return covariance / (len - 1);
  }

  /**
   * 年次化を伴う期待リターンを計算
   */
  private calculateExpectedReturns(
    assets: AssetData[],
    options: CovarianceOptions
  ): Map<string, number> {
    const returns = new Map<string, number>();
    const tradingDays = options.tradingDaysPerYear || 252;

    for (const asset of assets) {
      const annualReturn = this.calculateAnnualizedReturn(asset.returns, tradingDays);
      returns.set(asset.symbol, annualReturn);
    }

    return returns;
  }

  /**
   * 年次リターンを計算
   */
  private calculateAnnualizedReturn(dailyReturns: number[], tradingDaysPerYear: number): number {
    if (dailyReturns.length === 0) return 0;

    // 幾何平均を使用
    let product = 1;
    for (const r of dailyReturns) {
      if (r > -1) {
        product *= (1 + r);
      }
    }

    const annualizedReturn = (Math.pow(product, tradingDaysPerYear / dailyReturns.length) - 1) * 100;
    return isNaN(annualizedReturn) || !isFinite(annualizedReturn) ? 0 : annualizedReturn;
  }

  /**
   * 年次ボラティリティを計算
   */
  private calculateAnnualizedVolatility(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0;

    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const squaredDiffs = dailyReturns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (dailyReturns.length - 1);

    const dailyVol = Math.sqrt(variance);
    return dailyVol * Math.sqrt(252) * 100;
  }

  /**
   * ポートフォリオのリターンを計算
   */
  private calculatePortfolioReturn(
    weights: Map<string, number>,
    expectedReturns: Map<string, number>
  ): number {
    let return_ = 0;
    weights.forEach((weight, symbol) => {
      const expReturn = expectedReturns.get(symbol) || 0;
      return_ += weight * expReturn;
    });
    return return_;
  }

  /**
   * ポートフォリオのボラティリティを計算
   */
  private calculatePortfolioVolatility(
    weights: Map<string, number>,
    covarianceMatrix: Map<string, Map<string, number>>
  ): number {
    let variance = 0;

    weights.forEach((weight1, symbol1) => {
      weights.forEach((weight2, symbol2) => {
        const cov = covarianceMatrix.get(symbol1)?.get(symbol2) || 0;
        variance += weight1 * weight2 * cov;
      });
    });

    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  /**
   * 下方リスクを計算
   */
  private calculateDownsideRisk(assets: AssetData[], weights: Map<string, number>): number {
    let downsideVariance = 0;
    let totalWeight = 0;

    weights.forEach((weight, symbol) => {
      const asset = assets.find(a => a.symbol === symbol);
      if (asset && weight > 0) {
        const meanReturn = asset.returns.reduce((a, b) => a + b, 0) / asset.returns.length;
        
        for (const r of asset.returns) {
          if (r < meanReturn) {
            downsideVariance += weight * Math.pow(r - meanReturn, 2);
          }
        }
        totalWeight += weight;
      }
    });

    if (totalWeight === 0 || downsideVariance === 0) return 0;

    return Math.sqrt(downsideVariance / totalWeight) * Math.sqrt(252) * 100;
  }

  /**
   * 最大下落率を計算
   */
  private calculateMaxDrawdown(assets: AssetData[], weights: Map<string, number>): number {
    // 加重ポートフォリオの価値変動を計算
    let portfolioValue = 100;
    let peak = 100;
    let maxDrawdown = 0;

    const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset && asset.returns[i] !== undefined) {
          dailyReturn += weight * asset.returns[i];
        }
      });

      portfolioValue *= (1 + dailyReturn);
      peak = Math.max(peak, portfolioValue);
      const drawdown = (peak - portfolioValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown * 100;
  }

  /**
   * VaR（バリュー・アット・リスク）を計算
   */
  private calculateVaR(
    assets: AssetData[],
    weights: Map<string, number>,
    confidence: number
  ): number {
    const returns: number[] = [];
    const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset && asset.returns[i] !== undefined) {
          dailyReturn += weight * asset.returns[i];
        }
      });
      returns.push(dailyReturn);
    }

    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return returns[index] * 100 * Math.sqrt(252);
  }

  /**
   * CVaR（条件付きVaR）を計算
   */
  private calculateCVaR(
    assets: AssetData[],
    weights: Map<string, number>,
    confidence: number
  ): number {
    const returns: number[] = [];
    const numDays = assets.length > 0 ? Math.min(...assets.map(a => a.returns.length)) : 0;

    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset && asset.returns[i] !== undefined) {
          dailyReturn += weight * asset.returns[i];
        }
      });
      returns.push(dailyReturn);
    }

    returns.sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * returns.length);
    const tailReturns = returns.slice(0, cutoffIndex);
    
    if (tailReturns.length === 0) return 0;

    const avgTailReturn = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    return avgTailReturn * 100 * Math.sqrt(252);
  }

  /**
   * ベータとアルファを計算
   */
  private calculateBeta(
    assets: AssetData[],
    weights: Map<string, number>,
    benchmarkReturns: number[],
    options: CovarianceOptions
  ): { beta: number; alpha: number } {
    // ポートフォリオのリターンを計算
    const portfolioReturns: number[] = [];
    const numDays = Math.min(...assets.map(a => a.returns.length), benchmarkReturns.length);

    for (let i = 0; i < numDays; i++) {
      let dailyReturn = 0;
      weights.forEach((weight, symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        if (asset && asset.returns[i] !== undefined) {
          dailyReturn += weight * asset.returns[i];
        }
      });
      portfolioReturns.push(dailyReturn);
    }

    // ベータを計算（共分散/ベンチマークの分散）
    const benchmarkMean = benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length;
    const benchmarkVar = benchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / benchmarkReturns.length;

    let covariance = 0;
    const portfolioMean = portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length;
    for (let i = 0; i < portfolioReturns.length; i++) {
      covariance += (portfolioReturns[i] - portfolioMean) * (benchmarkReturns[i] - benchmarkMean);
    }
    covariance /= portfolioReturns.length;

    const beta = benchmarkVar > 0 ? covariance / benchmarkVar : 1;

    // アルファを計算
    const riskFreeRate = (options.riskFreeRate || 0) / 252;
    const alpha = (portfolioMean - riskFreeRate) - beta * (benchmarkMean - riskFreeRate);

    return { beta, alpha };
  }

  /**
   * 最適化タイプを決定
   */
  private determineOptimizationType(constraints: OptimizationConstraints): OptimizationResult['optimizationType'] {
    if (constraints.targetReturn !== undefined) {
      return 'TARGET_RETURN';
    }
    if (constraints.maxRisk !== undefined) {
      return 'TARGET_RETURN';
    }
    return 'MAX_SHARPE';
  }

  /**
   * 最大シャープレシオポートフォリオを最適化
   */
  private optimizeMaxSharpe(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    expectedReturns: Map<string, number>,
    constraints: OptimizationConstraints
  ): OptimizationResult {
    // グリッドサーチを使用して最適解を近似
    const frontier = this.generateEfficientFrontier(assets, 50);

    let bestSharpe = -Infinity;
    let bestPoint = frontier[0];
    const weights = new Map<string, number>();

    for (const point of frontier) {
      if (point.sharpeRatio > bestSharpe) {
        bestSharpe = point.sharpeRatio;
        bestPoint = point;
        // 重み付けを更新
        point.weights.forEach((w, s) => weights.set(s, w));
      }
    }

    // 制約を適用
    const adjustedWeights = this.applyConstraints(weights, assets, constraints);

    return {
      weights: adjustedWeights,
      expectedReturn: this.calculatePortfolioReturn(adjustedWeights, expectedReturns),
      expectedVolatility: this.calculatePortfolioVolatility(adjustedWeights, covarianceMatrix),
      sharpeRatio: bestSharpe,
      efficientFrontier: frontier,
      optimizationType: 'MAX_SHARPE',
      confidence: 0.85,
    };
  }

  /**
   * 最小分散ポートフォリオを最適化
   */
  private optimizeMinVariance(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    expectedReturns: Map<string, number>,
    constraints: OptimizationConstraints
  ): OptimizationResult {
    const frontier = this.generateEfficientFrontier(assets, 50);

    // 最小分散点を見つける
    let minVol = Infinity;
    let bestPoint = frontier[0];
    const weights = new Map<string, number>();

    for (const point of frontier) {
      if (point.volatility < minVol) {
        minVol = point.volatility;
        bestPoint = point;
        point.weights.forEach((w, s) => weights.set(s, w));
      }
    }

    const adjustedWeights = this.applyConstraints(weights, assets, constraints);

    return {
      weights: adjustedWeights,
      expectedReturn: this.calculatePortfolioReturn(adjustedWeights, expectedReturns),
      expectedVolatility: minVol,
      sharpeRatio: minVol > 0 
        ? (this.calculatePortfolioReturn(adjustedWeights, expectedReturns) - this.config.riskFreeRate) / minVol 
        : 0,
      efficientFrontier: frontier,
      optimizationType: 'MIN_VARIANCE',
      confidence: 0.85,
    };
  }

  /**
   * リスクパリティポートフォリオを最適化
   */
  private optimizeRiskParity(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    constraints: OptimizationConstraints
  ): OptimizationResult {
    // 各資産のリスク寄与を等しくする
    const weights = new Map<string, number>();
    const symbolList = assets.map(a => a.symbol);
    const n = symbolList.length;

    // 均等配分から開始
    const initialWeight = 1 / n;
    symbolList.forEach(s => weights.set(s, initialWeight));

    // 反復的にリスクを均等に調整
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      const marginalRisks = new Map<string, number>();
      let totalRisk = 0;

      // 限界リスク寄与を計算
      weights.forEach((w1, s1) => {
        let marginalRisk = 0;
        weights.forEach((w2, s2) => {
          const cov = covarianceMatrix.get(s1)?.get(s2) || 0;
          marginalRisk += w2 * cov;
        });
        marginalRisks.set(s1, marginalRisk);
        totalRisk += w1 * marginalRisk;
      });

      // リスクパリティに近づける
      const newWeights = new Map<string, number>();
      let weightSum = 0;

      weights.forEach((w, s) => {
        const targetRisk = totalRisk / n;
        const mr = marginalRisks.get(s) || 1;
        let newWeight = w * (targetRisk / mr);

        // 制約を適用
        newWeight = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, newWeight));
        newWeights.set(s, newWeight);
        weightSum += newWeight;
      });

      // 正規化
      newWeights.forEach((w, s) => {
        newWeights.set(s, w / weightSum);
      });

      // 収束チェック
      let maxDiff = 0;
      weights.forEach((w, s) => {
        const diff = Math.abs(w - (newWeights.get(s) || 0));
        maxDiff = Math.max(maxDiff, diff);
      });

      if (maxDiff < this.config.convergenceThreshold) break;

      // Weightsを更新
      weights.forEach((_, s) => weights.set(s, newWeights.get(s) || 0));
    }

    const frontier = this.generateEfficientFrontier(assets, 50);
    const avgSharpe = frontier.reduce((sum, p) => sum + p.sharpeRatio, 0) / frontier.length;

    return {
      weights,
      expectedReturn: 0,
      expectedVolatility: this.calculatePortfolioVolatility(weights, covarianceMatrix),
      sharpeRatio: avgSharpe,
      efficientFrontier: frontier,
      optimizationType: 'RISK_PARITY',
      confidence: 0.8,
    };
  }

  /**
   * 目標リターンポートフォリオを最適化
   */
  private optimizeTargetReturn(
    assets: AssetData[],
    covarianceMatrix: Map<string, Map<string, number>>,
    expectedReturns: Map<string, number>,
    constraints: OptimizationConstraints
  ): OptimizationResult {
    const targetReturn = constraints.targetReturn || 0;

    // 線形計画法またはグリッドサーチを使用
    const frontier = this.generateEfficientFrontier(assets, 50);

    // 目標リターンに最も近い点を見つける
    let closestPoint = frontier[0];
    let minDiff = Infinity;

    for (const point of frontier) {
      const diff = Math.abs(point.return - targetReturn);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    const adjustedWeights = this.applyConstraints(closestPoint.weights, assets, constraints);

    return {
      weights: adjustedWeights,
      expectedReturn: closestPoint.return,
      expectedVolatility: closestPoint.volatility,
      sharpeRatio: closestPoint.sharpeRatio,
      efficientFrontier: frontier,
      optimizationType: 'TARGET_RETURN',
      confidence: 0.8,
    };
  }

  /**
   * 単一資産の最適化
   */
  private optimizeSingleAsset(asset: AssetData): OptimizationResult {
    const weights = new Map<string, number>();
    weights.set(asset.symbol, 1);

    const returns = asset.returns;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const annualizedReturn = avgReturn * 252 * 100;

    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

    return {
      weights,
      expectedReturn: annualizedReturn,
      expectedVolatility: annualizedVol,
      sharpeRatio: annualizedVol > 0 ? (annualizedReturn - this.config.riskFreeRate) / annualizedVol : 0,
      efficientFrontier: [],
      optimizationType: 'MIN_VARIANCE',
      confidence: 1.0,
    };
  }

  /**
   * 空の結果を返す
   */
  private createEmptyResult(): OptimizationResult {
    return {
      weights: new Map(),
      expectedReturn: 0,
      expectedVolatility: 0,
      sharpeRatio: 0,
      efficientFrontier: [],
      optimizationType: 'MAX_SHARPE',
      confidence: 0,
    };
  }

  /**
   * 制約を適用
   */
  private applyConstraints(
    weights: Map<string, number>,
    assets: AssetData[],
    constraints: OptimizationConstraints
  ): Map<string, number> {
    const result = new Map<string, number>();
    let totalWeight = 0;

    // 最小/最大ウェイトを適用
    for (const asset of assets) {
      const currentWeight = weights.get(asset.symbol) || 0;
      const newWeight = Math.max(constraints.minWeight, Math.min(constraints.maxWeight, currentWeight));
      result.set(asset.symbol, newWeight);
      totalWeight += newWeight;
    }

    // 部門別制限を適用
    if (constraints.sectorLimits && constraints.sectorLimits.size > 0) {
      const sectorWeights = this.aggregateBySector(assets, result);
      
      for (const [sector, weight] of sectorWeights) {
        const limit = constraints.sectorLimits!.get(sector);
        if (limit && weight > limit) {
          // 部門重量が制限を超えている場合、比例して削減
          const excessRatio = limit / weight;
          assets.filter(a => a.sector === sector).forEach(asset => {
            const currentW = result.get(asset.symbol) || 0;
            result.set(asset.symbol, currentW * excessRatio);
          });
        }
      }
    }

    // 正規化（合計を1に）
    let newTotal = 0;
    result.forEach(w => newTotal += w);
    
    if (newTotal > 0) {
      result.forEach((w, s) => result.set(s, w / newTotal));
    } else {
      // 均等配分
      const equalWeight = 1 / assets.length;
      assets.forEach(a => result.set(a.symbol, equalWeight));
    }

    return result;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const portfolioOptimizer = new PortfolioOptimizer();
