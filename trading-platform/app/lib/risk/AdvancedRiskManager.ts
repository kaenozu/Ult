/**
 * AdvancedRiskManager.ts
 * 
 * 高度なリスク管理システム。動的ポジションサイジング、ポートフォリオ最適化、
 * リアルタイムリスクモニタリングを提供します。
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  totalValue: number;
  marginUsed: number;
  marginAvailable: number;
  dailyPnL: number;
  totalPnL: number;
}

export interface RiskMetrics {
  var: number; // Value at Risk
  cvar: number; // Conditional VaR
  beta: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  correlationMatrix: Map<string, Map<string, number>>;
  concentrationRisk: number;
  leverage: number;
}

export interface PositionSizingParams {
  capital: number;
  entryPrice: number;
  stopLossPrice?: number;
  riskPercent?: number;
  method: 'fixed' | 'kelly' | 'optimal_f' | 'fixed_ratio' | 'volatility_based';
  volatility?: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
}

export interface PositionSizingResult {
  recommendedSize: number;
  riskAmount: number;
  riskPercent: number;
  positionValue: number;
  maxPositionSize: number;
  reasoning: string[];
}

export interface RiskLimits {
  maxPositionSize: number; // Max position as % of portfolio
  maxSectorExposure: number; // Max sector exposure as %
  maxSingleTradeRisk: number; // Max risk per trade as %
  maxDailyLoss: number; // Max daily loss as %
  maxDrawdown: number; // Max drawdown before trading halt
  maxLeverage: number; // Max leverage ratio
  minCashReserve: number; // Minimum cash reserve as %
}

export interface RiskAlert {
  type: 'position_limit' | 'drawdown' | 'correlation' | 'volatility' | 'concentration' | 'margin';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  symbol?: string;
  currentValue: number;
  limitValue: number;
  timestamp: number;
}

export interface PortfolioOptimizationParams {
  symbols: string[];
  expectedReturns: Map<string, number>;
  covariances: Map<string, Map<string, number>>;
  constraints: {
    minWeight?: number;
    maxWeight?: number;
    targetReturn?: number;
    maxRisk?: number;
  };
}

export interface OptimizationResult {
  weights: Map<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  efficientFrontier: Array<{ return: number; risk: number }>;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPositionSize: 20, // 20% of portfolio
  maxSectorExposure: 30, // 30% per sector
  maxSingleTradeRisk: 2, // 2% per trade
  maxDailyLoss: 5, // 5% daily loss limit
  maxDrawdown: 15, // 15% max drawdown
  maxLeverage: 2, // 2x leverage
  minCashReserve: 10, // 10% cash reserve
};

// ============================================================================
// Advanced Risk Manager
// ============================================================================

export class AdvancedRiskManager extends EventEmitter {
  private limits: RiskLimits;
  private portfolio: Portfolio;
  private metrics: RiskMetrics;
  private priceHistory: Map<string, number[]> = new Map();
  private returnsHistory: Map<string, number[]> = new Map();
  private alerts: RiskAlert[] = [];
  private isTradingHalted: boolean = false;

  constructor(limits: Partial<RiskLimits> = {}) {
    super();
    this.limits = { ...DEFAULT_RISK_LIMITS, ...limits };
    this.portfolio = {
      cash: 0,
      positions: [],
      totalValue: 0,
      marginUsed: 0,
      marginAvailable: 0,
      dailyPnL: 0,
      totalPnL: 0,
    };
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): RiskMetrics {
    return {
      var: 0,
      cvar: 0,
      beta: 1,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      volatility: 0,
      correlationMatrix: new Map(),
      concentrationRisk: 0,
      leverage: 0,
    };
  }

  // ============================================================================
  // Position Sizing Methods
  // ============================================================================

  /**
   * ポジションサイズを計算
   */
  calculatePositionSize(params: PositionSizingParams): PositionSizingResult {
    switch (params.method) {
      case 'fixed':
        return this.fixedPositionSizing(params);
      case 'kelly':
        return this.kellyCriterionSizing(params);
      case 'optimal_f':
        return this.optimalFSizing(params);
      case 'fixed_ratio':
        return this.fixedRatioSizing(params);
      case 'volatility_based':
        return this.volatilityBasedSizing(params);
      default:
        return this.fixedPositionSizing(params);
    }
  }

  /**
   * 固定ポジションサイジング
   */
  private fixedPositionSizing(params: PositionSizingParams): PositionSizingResult {
    const riskPercent = params.riskPercent || this.limits.maxSingleTradeRisk;
    const riskAmount = params.capital * (riskPercent / 100);
    
    let positionSize: number;
    let reasoning: string[] = [];

    if (params.stopLossPrice) {
      const riskPerShare = Math.abs(params.entryPrice - params.stopLossPrice);
      positionSize = Math.floor(riskAmount / riskPerShare);
      reasoning.push(`Stop loss based sizing: ${riskPerShare.toFixed(2)} risk per share`);
    } else {
      positionSize = Math.floor((params.capital * (riskPercent / 100)) / params.entryPrice);
      reasoning.push(`Fixed percentage sizing: ${riskPercent}% of capital`);
    }

    const positionValue = positionSize * params.entryPrice;
    const maxPositionSize = Math.floor((params.capital * (this.limits.maxPositionSize / 100)) / params.entryPrice);

    return {
      recommendedSize: Math.min(positionSize, maxPositionSize),
      riskAmount,
      riskPercent,
      positionValue,
      maxPositionSize,
      reasoning,
    };
  }

  /**
   * ケリー基準によるサイジング
   */
  private kellyCriterionSizing(params: PositionSizingParams): PositionSizingResult {
    const winRate = params.winRate || 0.5;
    const avgWin = params.avgWin || 0.02;
    const avgLoss = params.avgLoss || 0.01;

    // Kelly formula: f = (bp - q) / b
    // where b = avgWin/avgLoss, p = winRate, q = 1 - p
    const b = avgWin / avgLoss;
    const q = 1 - winRate;
    const kellyFraction = (b * winRate - q) / b;

    // Use half-Kelly for safety
    const safeFraction = Math.max(0, kellyFraction * 0.5);
    const riskPercent = safeFraction * 100;
    const riskAmount = params.capital * safeFraction;

    let positionSize: number;
    if (params.stopLossPrice) {
      const riskPerShare = Math.abs(params.entryPrice - params.stopLossPrice);
      positionSize = Math.floor(riskAmount / riskPerShare);
    } else {
      positionSize = Math.floor((params.capital * safeFraction) / params.entryPrice);
    }

    const positionValue = positionSize * params.entryPrice;
    const maxPositionSize = Math.floor((params.capital * (this.limits.maxPositionSize / 100)) / params.entryPrice);

    return {
      recommendedSize: Math.min(positionSize, maxPositionSize),
      riskAmount,
      riskPercent,
      positionValue,
      maxPositionSize,
      reasoning: [
        `Kelly Criterion: f = ${kellyFraction.toFixed(4)}`,
        `Win rate: ${(winRate * 100).toFixed(1)}%, Avg win/loss: ${(avgWin / avgLoss).toFixed(2)}`,
        `Using half-Kelly for safety: ${safeFraction.toFixed(4)}`,
      ],
    };
  }

  /**
   * Optimal F サイジング
   */
  private optimalFSizing(params: PositionSizingParams): PositionSizingResult {
    // Simplified Optimal F calculation
    // In production, this would use historical trade data
    const optimalF = 0.25; // Conservative default
    const riskPercent = optimalF * 100;
    const riskAmount = params.capital * optimalF;

    let positionSize: number;
    if (params.stopLossPrice) {
      const riskPerShare = Math.abs(params.entryPrice - params.stopLossPrice);
      positionSize = Math.floor(riskAmount / riskPerShare);
    } else {
      positionSize = Math.floor((params.capital * optimalF) / params.entryPrice);
    }

    const positionValue = positionSize * params.entryPrice;
    const maxPositionSize = Math.floor((params.capital * (this.limits.maxPositionSize / 100)) / params.entryPrice);

    return {
      recommendedSize: Math.min(positionSize, maxPositionSize),
      riskAmount,
      riskPercent,
      positionValue,
      maxPositionSize,
      reasoning: [`Optimal F sizing: f = ${optimalF}`],
    };
  }

  /**
   * 固定比率サイジング
   */
  private fixedRatioSizing(params: PositionSizingParams): PositionSizingResult {
    const delta = 0.1; // Fixed ratio delta
    const currentEquity = params.capital;
    const basePosition = Math.floor((currentEquity * 0.02) / params.entryPrice); // 2% base
    
    // Calculate number of deltas
    const deltas = Math.floor(currentEquity / (params.capital * delta));
    const positionSize = basePosition * Math.max(1, deltas);

    const riskPercent = 2 * Math.max(1, deltas);
    const riskAmount = params.capital * (riskPercent / 100);
    const positionValue = positionSize * params.entryPrice;
    const maxPositionSize = Math.floor((params.capital * (this.limits.maxPositionSize / 100)) / params.entryPrice);

    return {
      recommendedSize: Math.min(positionSize, maxPositionSize),
      riskAmount,
      riskPercent,
      positionValue,
      maxPositionSize,
      reasoning: [`Fixed ratio sizing: ${deltas} deltas, base position ${basePosition}`],
    };
  }

  /**
   * ボラティリティベースサイジング
   */
  private volatilityBasedSizing(params: PositionSizingParams): PositionSizingResult {
    const volatility = params.volatility || 20; // Default 20% annualized volatility
    const targetVolatility = 10; // Target 10% volatility
    
    // Scale position size inversely with volatility
    const volatilityFactor = targetVolatility / volatility;
    const baseRiskPercent = this.limits.maxSingleTradeRisk;
    const riskPercent = baseRiskPercent * volatilityFactor;
    const riskAmount = params.capital * (riskPercent / 100);

    let positionSize: number;
    if (params.stopLossPrice) {
      const riskPerShare = Math.abs(params.entryPrice - params.stopLossPrice);
      positionSize = Math.floor(riskAmount / riskPerShare);
    } else {
      positionSize = Math.floor((params.capital * (riskPercent / 100)) / params.entryPrice);
    }

    const positionValue = positionSize * params.entryPrice;
    const maxPositionSize = Math.floor((params.capital * (this.limits.maxPositionSize / 100)) / params.entryPrice);

    return {
      recommendedSize: Math.min(positionSize, maxPositionSize),
      riskAmount,
      riskPercent,
      positionValue,
      maxPositionSize,
      reasoning: [
        `Volatility based sizing: ${volatility.toFixed(2)}% volatility`,
        `Volatility factor: ${volatilityFactor.toFixed(2)}`,
      ],
    };
  }

  // ============================================================================
  // Risk Metrics Calculation
  // ============================================================================

  /**
   * リスクメトリクスを更新
   */
  updateRiskMetrics(portfolio: Portfolio): RiskMetrics {
    this.portfolio = portfolio;

    // Calculate returns
    const portfolioReturns = this.calculatePortfolioReturns();
    
    // VaR and CVaR
    const var95 = this.calculateVaR(portfolioReturns, 0.95);
    const cvar95 = this.calculateCVaR(portfolioReturns, 0.95);

    // Volatility
    const volatility = this.calculateVolatility(portfolioReturns);

    // Drawdown
    const { maxDrawdown, currentDrawdown } = this.calculateDrawdown();

    // Correlation matrix
    const correlationMatrix = this.calculateCorrelationMatrix();

    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk();

    // Leverage
    const leverage = portfolio.marginUsed / (portfolio.totalValue || 1);

    // Sharpe and Sortino ratios
    const sharpeRatio = this.calculateSharpeRatio(portfolioReturns);
    const sortinoRatio = this.calculateSortinoRatio(portfolioReturns);

    this.metrics = {
      var: var95,
      cvar: cvar95,
      beta: this.calculateBeta(),
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility,
      correlationMatrix,
      concentrationRisk,
      leverage,
    };

    // Check risk limits
    this.checkRiskLimits();

    this.emit('metrics_updated', this.metrics);
    return this.metrics;
  }

  /**
   * VaRを計算
   */
  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length < 30) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return -sorted[index] * this.portfolio.totalValue;
  }

  /**
   * CVaR (Expected Shortfall) を計算
   */
  private calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length < 30) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, varIndex);
    
    if (tailReturns.length === 0) return 0;
    
    const avgTailReturn = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    return -avgTailReturn * this.portfolio.totalValue;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * ドローダウンを計算
   */
  private calculateDrawdown(): { maxDrawdown: number; currentDrawdown: number } {
    const values = this.priceHistory.get('portfolio') || [];
    if (values.length < 2) return { maxDrawdown: 0, currentDrawdown: 0 };

    let peak = values[0];
    let maxDrawdown = 0;

    for (const value of values) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const currentDrawdown = (peak - values[values.length - 1]) / peak;

    return { maxDrawdown, currentDrawdown };
  }

  /**
   * ポートフォリオリターンを計算
   */
  private calculatePortfolioReturns(): number[] {
    const values = this.priceHistory.get('portfolio') || [];
    const returns: number[] = [];

    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }

    return returns;
  }

  /**
   * 相関行列を計算
   */
  private calculateCorrelationMatrix(): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    const symbols = Array.from(this.returnsHistory.keys());

    for (const symbol1 of symbols) {
      const row = new Map<string, number>();
      const returns1 = this.returnsHistory.get(symbol1) || [];

      for (const symbol2 of symbols) {
        const returns2 = this.returnsHistory.get(symbol2) || [];
        const correlation = this.calculateCorrelation(returns1, returns2);
        row.set(symbol2, correlation);
      }

      matrix.set(symbol1, row);
    }

    return matrix;
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 集中度リスクを計算
   */
  private calculateConcentrationRisk(): number {
    const totalValue = this.portfolio.totalValue;
    if (totalValue === 0) return 0;

    // Herfindahl-Hirschman Index
    let hhi = 0;
    for (const position of this.portfolio.positions) {
      const weight = (position.currentPrice * position.quantity) / totalValue;
      hhi += weight * weight;
    }

    // Normalize to 0-1 range
    const n = this.portfolio.positions.length || 1;
    return (hhi - 1 / n) / (1 - 1 / n);
  }

  /**
   * ベータを計算
   */
  private calculateBeta(): number {
    // Simplified beta calculation
    // In production, compare against market index
    return 1;
  }

  /**
   * シャープレシオを計算
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const riskFreeRate = 0.02 / 252; // Daily risk-free rate
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = this.calculateVolatility(returns) / Math.sqrt(252);
    
    return volatility === 0 ? 0 : (avgReturn - riskFreeRate) / volatility;
  }

  /**
   * ソルティノレシオを計算
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const riskFreeRate = 0.02 / 252;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    const downsideReturns = returns.filter((r) => r < 0);
    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    );
    
    return downsideDeviation === 0 ? 0 : (avgReturn - riskFreeRate) / downsideDeviation;
  }

  // ============================================================================
  // Risk Limit Checking
  // ============================================================================

  /**
   * リスク制限をチェック
   */
  private checkRiskLimits(): void {
    // Check drawdown
    if (this.metrics.currentDrawdown > this.limits.maxDrawdown / 100) {
      this.addAlert({
        type: 'drawdown',
        severity: 'critical',
        message: `Maximum drawdown exceeded: ${(this.metrics.currentDrawdown * 100).toFixed(2)}%`,
        currentValue: this.metrics.currentDrawdown,
        limitValue: this.limits.maxDrawdown / 100,
        timestamp: Date.now(),
      });
      this.haltTrading();
    }

    // Check leverage
    if (this.metrics.leverage > this.limits.maxLeverage) {
      this.addAlert({
        type: 'margin',
        severity: 'high',
        message: `Leverage limit exceeded: ${this.metrics.leverage.toFixed(2)}x`,
        currentValue: this.metrics.leverage,
        limitValue: this.limits.maxLeverage,
        timestamp: Date.now(),
      });
    }

    // Check concentration
    if (this.metrics.concentrationRisk > 0.5) {
      this.addAlert({
        type: 'concentration',
        severity: 'medium',
        message: `High concentration risk: ${(this.metrics.concentrationRisk * 100).toFixed(2)}%`,
        currentValue: this.metrics.concentrationRisk,
        limitValue: 0.5,
        timestamp: Date.now(),
      });
    }

    // Check position limits
    for (const position of this.portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const positionWeight = positionValue / this.portfolio.totalValue;

      if (positionWeight > this.limits.maxPositionSize / 100) {
        this.addAlert({
          type: 'position_limit',
          severity: 'high',
          message: `Position limit exceeded for ${position.symbol}`,
          symbol: position.symbol,
          currentValue: positionWeight,
          limitValue: this.limits.maxPositionSize / 100,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * アラートを追加
   */
  private addAlert(alert: RiskAlert): void {
    this.alerts.push(alert);
    this.emit('risk_alert', alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * 取引を停止
   */
  private haltTrading(): void {
    if (!this.isTradingHalted) {
      this.isTradingHalted = true;
      this.emit('trading_halted', { reason: 'Risk limit exceeded' });
    }
  }

  /**
   * 取引を再開
   */
  resumeTrading(): void {
    this.isTradingHalted = false;
    this.emit('trading_resumed');
  }

  // ============================================================================
  // Portfolio Optimization (Modern Portfolio Theory)
  // ============================================================================

  /**
   * ポートフォリオを最適化
   */
  optimizePortfolio(params: PortfolioOptimizationParams): OptimizationResult {
    const { symbols, expectedReturns, covariances, constraints } = params;
    const n = symbols.length;

    // Initialize equal weights
    const weights = new Map<string, number>();
    symbols.forEach((s) => weights.set(s, 1 / n));

    // Calculate expected portfolio return
    let expectedReturn = 0;
    symbols.forEach((s) => {
      expectedReturn += (expectedReturns.get(s) || 0) * (weights.get(s) || 0);
    });

    // Calculate portfolio risk
    let portfolioVariance = 0;
    symbols.forEach((s1) => {
      symbols.forEach((s2) => {
        const w1 = weights.get(s1) || 0;
        const w2 = weights.get(s2) || 0;
        const cov = covariances.get(s1)?.get(s2) || 0;
        portfolioVariance += w1 * w2 * cov;
      });
    });
    const expectedRisk = Math.sqrt(portfolioVariance);

    // Calculate Sharpe ratio
    const riskFreeRate = 0.02;
    const sharpeRatio = expectedRisk === 0 ? 0 : (expectedReturn - riskFreeRate) / expectedRisk;

    // Generate efficient frontier
    const efficientFrontier = this.calculateEfficientFrontier(params);

    return {
      weights,
      expectedReturn,
      expectedRisk,
      sharpeRatio,
      efficientFrontier,
    };
  }

  /**
   * 効率的フロンティアを計算
   */
  private calculateEfficientFrontier(params: PortfolioOptimizationParams): Array<{ return: number; risk: number }> {
    const frontier: Array<{ return: number; risk: number }> = [];
    const { symbols, expectedReturns, covariances } = params;

    // Generate portfolio combinations
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const targetReturn = (i / steps) * 0.3; // 0% to 30%
      
      // Simplified: find minimum risk portfolio for target return
      let minRisk = Infinity;
      
      // In production, use quadratic programming
      // For now, use random sampling
      for (let j = 0; j < 100; j++) {
        const weights = this.generateRandomWeights(symbols.length);
        const portfolioReturn = symbols.reduce((sum, s, idx) => 
          sum + (expectedReturns.get(s) || 0) * weights[idx], 0);
        
        if (Math.abs(portfolioReturn - targetReturn) < 0.01) {
          const risk = this.calculatePortfolioRisk(weights, symbols, covariances);
          if (risk < minRisk) minRisk = risk;
        }
      }

      if (minRisk !== Infinity) {
        frontier.push({ return: targetReturn, risk: minRisk });
      }
    }

    return frontier;
  }

  /**
   * ランダムな重みを生成
   */
  private generateRandomWeights(n: number): number[] {
    const weights = Array(n).fill(0).map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((w) => w / sum);
  }

  /**
   * ポートフォリオリスクを計算
   */
  private calculatePortfolioRisk(
    weights: number[],
    symbols: string[],
    covariances: Map<string, Map<string, number>>
  ): number {
    let variance = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        const cov = covariances.get(symbols[i])?.get(symbols[j]) || 0;
        variance += weights[i] * weights[j] * cov;
      }
    }
    return Math.sqrt(variance);
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * 価格データを追加
   */
  addPriceData(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);

    // Keep last 252 days (1 year)
    if (prices.length > 252) {
      this.priceHistory.set(symbol, prices.slice(-252));
    }

    // Calculate return
    if (prices.length > 1) {
      const return_value = (price - prices[prices.length - 2]) / prices[prices.length - 2];
      
      if (!this.returnsHistory.has(symbol)) {
        this.returnsHistory.set(symbol, []);
      }
      
      const returns = this.returnsHistory.get(symbol)!;
      returns.push(return_value);
      
      if (returns.length > 251) {
        this.returnsHistory.set(symbol, returns.slice(-251));
      }
    }
  }

  /**
   * リスクメトリクスを取得
   */
  getRiskMetrics(): RiskMetrics {
    return this.metrics;
  }

  /**
   * アラートを取得
   */
  getAlerts(): RiskAlert[] {
    return this.alerts;
  }

  /**
   * 取引停止状態を確認
   */
  isHalted(): boolean {
    return this.isTradingHalted;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalRiskManager: AdvancedRiskManager | null = null;

export function getGlobalRiskManager(limits?: Partial<RiskLimits>): AdvancedRiskManager {
  if (!globalRiskManager) {
    globalRiskManager = new AdvancedRiskManager(limits);
  }
  return globalRiskManager;
}

export function resetGlobalRiskManager(): void {
  globalRiskManager = null;
}

export default AdvancedRiskManager;
