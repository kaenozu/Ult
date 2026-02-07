/**
 * AdvancedRiskManager.ts
 * 
 * 高度なリスク管理システム。動的ポジションサイジング、ポートフォリオ最適化、
 * リアルタイムリスクモニタリングを提供します。
 */

import { EventEmitter } from 'events';
import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

// Position and Portfolio types are now imported from '@/app/types' to avoid duplication
export type { Position, Portfolio };

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
  type: 'position_limit' | 'drawdown' | 'correlation' | 'volatility' | 'concentration' | 'margin' | 'daily_loss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  symbol?: string;
  currentValue: number;
  limitValue: number;
  timestamp: number;
}

export interface OrderValidationResult {
  allowed: boolean;
  reasons: string[];
  violations: RiskAlert[];
  action: 'allow' | 'alert' | 'reject' | 'halt';
}

export interface OrderRequest {
  symbol: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  stopLoss?: number;
  type: 'MARKET' | 'LIMIT' | 'STOP';
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
  private dailyStartValue: number = 0;
  private dailyPnL: number = 0;
  private lastResetDate: Date = new Date();

  constructor(limits: Partial<RiskLimits> = {}) {
    super();
    this.limits = { ...DEFAULT_RISK_LIMITS, ...limits };
    this.portfolio = {
      cash: 0,
      positions: [],
      totalValue: 0,
      dailyPnL: 0,
      totalProfit: 0,
      orders: [],
    };
    this.metrics = this.initializeMetrics();
    this.dailyStartValue = 0;
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
    const reasoning: string[] = [];

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

  /**
   * 最適なポジションサイズを計算 (WinningTradingSystem互換)
   */
  calculateOptimalPositionSize(params: {
    accountBalance: number;
    entryPrice: number;
    stopLossPrice: number;
    takeProfitPrice: number;
    volatility: number;
    marketRegime: string;
  }): PositionSizingResult {
    return this.calculatePositionSize({
      capital: params.accountBalance,
      entryPrice: params.entryPrice,
      stopLossPrice: params.stopLossPrice,
      riskPercent: this.limits.maxSingleTradeRisk,
      method: params.marketRegime === 'BULL' ? 'kelly' : 'fixed',
      volatility: params.volatility * 100
    });
  }

  /**
   * リスクリワード比を検証
   */
  validateRiskRewardRatio(entry: number, stop: number, target: number): { valid: boolean; ratio: number } {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    const ratio = risk > 0 ? reward / risk : 0;
    return {
      valid: ratio >= 1.5,
      ratio
    };
  }

  /**
   * 損失を記録
   */
  recordLoss(amount: number): void {
  }

  // ============================================================================
  // Risk Metrics Calculation
  // ============================================================================

  /**
   * リスクメトリクスを更新
   */
  updateRiskMetrics(portfolio: Portfolio): RiskMetrics {
    this.portfolio = portfolio;

    // Initialize daily start value if not set
    if (this.dailyStartValue === 0 && portfolio.totalValue > 0) {
      this.dailyStartValue = portfolio.totalValue;
    }

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

    // Leverage (calculated from positions value vs total value)
    const positionsValue = portfolio.positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
    const leverage = positionsValue / (portfolio.totalValue || 1);

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
    if (!isFinite(hhi)) return 0;

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
  // Order Validation and Enforcement
  // ============================================================================

  /**
   * 注文を検証してリスク制限に違反していないかチェック
   */
  validateOrder(order: OrderRequest): OrderValidationResult {
    const violations: RiskAlert[] = [];
    const reasons: string[] = [];
    
    // Check if trading is halted
    if (this.isTradingHalted) {
      violations.push({
        type: 'daily_loss',
        severity: 'critical',
        message: 'Trading is halted due to risk limit violation',
        currentValue: 0,
        limitValue: 0,
        timestamp: Date.now(),
      });
      return {
        allowed: false,
        reasons: ['Trading is halted'],
        violations,
        action: 'halt',
      };
    }

    // Reset daily P&L if needed
    this.checkAndResetDailyPnL();

    // Check daily loss limit
    const dailyLoss = this.getDailyLoss();
    const dailyLossPercent = (dailyLoss / this.portfolio.totalValue) * 100;
    if (dailyLossPercent >= this.limits.maxDailyLoss && order.side === 'BUY') {
      violations.push({
        type: 'daily_loss',
        severity: 'critical',
        message: `Daily loss limit reached: ${dailyLossPercent.toFixed(2)}%`,
        currentValue: dailyLossPercent,
        limitValue: this.limits.maxDailyLoss,
        timestamp: Date.now(),
      });
      this.haltTrading();
      return {
        allowed: false,
        reasons: [`Daily loss limit reached: ${dailyLossPercent.toFixed(2)}%`],
        violations,
        action: 'halt',
      };
    }

    // Check position size limit
    const orderValue = order.quantity * order.price;
    const positionWeight = orderValue / this.portfolio.totalValue;
    
    if (order.side === 'BUY') {
      // Check if this would exceed max position size
      const existingPosition = this.portfolio.positions.find((p) => p.symbol === order.symbol);
      const currentPositionValue = existingPosition 
        ? existingPosition.currentPrice * existingPosition.quantity 
        : 0;
      const totalPositionValue = currentPositionValue + orderValue;
      const totalPositionWeight = totalPositionValue / this.portfolio.totalValue;

      if (totalPositionWeight > this.limits.maxPositionSize / 100) {
        violations.push({
          type: 'position_limit',
          severity: 'high',
          message: `Position size limit would be exceeded for ${order.symbol}`,
          symbol: order.symbol,
          currentValue: totalPositionWeight,
          limitValue: this.limits.maxPositionSize / 100,
          timestamp: Date.now(),
        });
        reasons.push(`Position size limit: ${(totalPositionWeight * 100).toFixed(2)}% > ${this.limits.maxPositionSize}%`);
      }
    }

    // Check single trade risk limit
    if (order.stopLoss) {
      const riskPerShare = Math.abs(order.price - order.stopLoss);
      const tradeRisk = (riskPerShare * order.quantity) / this.portfolio.totalValue * 100;
      
      if (tradeRisk > this.limits.maxSingleTradeRisk) {
        violations.push({
          type: 'position_limit',
          severity: 'high',
          message: `Single trade risk limit exceeded: ${tradeRisk.toFixed(2)}%`,
          symbol: order.symbol,
          currentValue: tradeRisk,
          limitValue: this.limits.maxSingleTradeRisk,
          timestamp: Date.now(),
        });
        reasons.push(`Trade risk: ${tradeRisk.toFixed(2)}% > ${this.limits.maxSingleTradeRisk}%`);
      }
    }

    // Check leverage limit
    if (order.side === 'BUY') {
      const totalPositionsValue = this.portfolio.positions.reduce(
        (sum, pos) => sum + pos.currentPrice * pos.quantity,
        0
      );
      const newLeverage = (totalPositionsValue + orderValue) / this.portfolio.totalValue;
      
      if (newLeverage > this.limits.maxLeverage) {
        violations.push({
          type: 'margin',
          severity: 'high',
          message: `Leverage limit would be exceeded: ${newLeverage.toFixed(2)}x`,
          currentValue: newLeverage,
          limitValue: this.limits.maxLeverage,
          timestamp: Date.now(),
        });
        reasons.push(`Leverage: ${newLeverage.toFixed(2)}x > ${this.limits.maxLeverage}x`);
      }
    }

    // Check cash reserve
    if (order.side === 'BUY') {
      const remainingCash = this.portfolio.cash - orderValue;
      const cashReservePercent = (remainingCash / this.portfolio.totalValue) * 100;
      
      if (cashReservePercent < this.limits.minCashReserve) {
        violations.push({
          type: 'margin',
          severity: 'medium',
          message: `Minimum cash reserve would not be maintained: ${cashReservePercent.toFixed(2)}%`,
          currentValue: cashReservePercent,
          limitValue: this.limits.minCashReserve,
          timestamp: Date.now(),
        });
        reasons.push(`Cash reserve: ${cashReservePercent.toFixed(2)}% < ${this.limits.minCashReserve}%`);
      }
    }

    // Determine action based on violations
    let action: 'allow' | 'alert' | 'reject' | 'halt' = 'allow';
    
    if (violations.length > 0) {
      const criticalViolations = violations.filter((v) => v.severity === 'critical');
      const highViolations = violations.filter((v) => v.severity === 'high');
      
      if (criticalViolations.length > 0) {
        action = 'halt';
      } else if (highViolations.length > 0) {
        action = 'reject';
      } else {
        action = 'alert';
      }
    }

    // Add alerts for violations
    violations.forEach((violation) => this.addAlert(violation));

    return {
      allowed: action === 'allow' || action === 'alert',
      reasons: reasons.length > 0 ? reasons : ['Order passed all risk checks'],
      violations,
      action,
    };
  }

  /**
   * 日次P&Lをリセット
   */
  private checkAndResetDailyPnL(): void {
    const today = new Date();
    if (today.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyStartValue = this.portfolio.totalValue;
      this.dailyPnL = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * 本日の損失を取得
   */
  getDailyLoss(): number {
    this.checkAndResetDailyPnL();
    const currentPnL = this.portfolio.totalValue - this.dailyStartValue;
    this.dailyPnL = currentPnL;
    return currentPnL < 0 ? Math.abs(currentPnL) : 0;
  }

  /**
   * 本日のP&L（パーセント）を取得
   */
  getDailyPnLPercent(): number {
    const pnl = this.portfolio.totalValue - this.dailyStartValue;
    return (pnl / this.dailyStartValue) * 100;
  }

  // ============================================================================
  // Risk Limit Checking
  // ============================================================================

  /**
   * リスク制限をチェック
   */
  private checkRiskLimits(): void {
    // Check daily loss
    const dailyLoss = this.getDailyLoss();
    const dailyLossPercent = (dailyLoss / this.portfolio.totalValue) * 100;
    if (dailyLossPercent >= this.limits.maxDailyLoss) {
      this.addAlert({
        type: 'daily_loss',
        severity: 'critical',
        message: `Maximum daily loss reached: ${dailyLossPercent.toFixed(2)}%`,
        currentValue: dailyLossPercent,
        limitValue: this.limits.maxDailyLoss,
        timestamp: Date.now(),
      });
      this.haltTrading();
    }

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

  /**
   * 現在のリスク状態を取得
   */
  getRiskStatus(): {
    limits: RiskLimits;
    usage: {
      dailyLossPercent: number;
      maxDrawdownPercent: number;
      leverageRatio: number;
      concentrationRisk: number;
      cashReservePercent: number;
    };
    isHalted: boolean;
    recentAlerts: RiskAlert[];
  } {
    this.checkAndResetDailyPnL();
    
    const dailyLoss = this.getDailyLoss();
    const dailyLossPercent = (dailyLoss / this.portfolio.totalValue) * 100;
    const cashReservePercent = (this.portfolio.cash / this.portfolio.totalValue) * 100;

    return {
      limits: this.limits,
      usage: {
        dailyLossPercent,
        maxDrawdownPercent: this.metrics.currentDrawdown * 100,
        leverageRatio: this.metrics.leverage,
        concentrationRisk: this.metrics.concentrationRisk,
        cashReservePercent,
      },
      isHalted: this.isTradingHalted,
      recentAlerts: this.alerts.slice(-10),
    };
  }

  /**
   * リスク制限を更新
   */
  updateLimits(limits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...limits };
    this.emit('limits_updated', this.limits);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (limits?: Partial<RiskLimits>) => new AdvancedRiskManager(limits)
);

export const getGlobalRiskManager = getInstance;
export const resetGlobalRiskManager = resetInstance;

export default AdvancedRiskManager;
