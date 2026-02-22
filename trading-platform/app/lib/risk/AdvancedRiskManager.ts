/**
 * AdvancedRiskManager.ts
 * 
 * 高度なリスク管理システム。動的ポジションサイジング、ポートフォリオ最適化、
 * リアルタイムリスクモニタリングを提供します。
 */

import { EventEmitter } from 'events';
import { Position, Portfolio } from '@/app/types';
import { 
  RiskMetrics, 
  PositionSizingParams, 
  PositionSizingResult, 
  RiskLimits, 
  RiskAlert, 
  OrderValidationResult, 
  OrderRequest, 
  PortfolioOptimizationParams, 
  OptimizationResult,
  DEFAULT_RISK_LIMITS
} from './types';
import { PositionSizer } from './PositionSizer';
import { RiskMetricsCalculator } from './RiskMetricsCalculator';
import { PortfolioOptimizer } from './PortfolioOptimizer';

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

  // Helper classes
  private positionSizer: PositionSizer;
  private metricsCalculator: RiskMetricsCalculator;
  private portfolioOptimizer: PortfolioOptimizer;

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
    
    this.positionSizer = new PositionSizer(this.limits);
    this.metricsCalculator = new RiskMetricsCalculator();
    this.portfolioOptimizer = new PortfolioOptimizer();
    
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

  calculatePositionSize(params: PositionSizingParams): PositionSizingResult {
    return this.positionSizer.calculatePositionSize(params);
  }

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

  validateRiskRewardRatio(entry: number, stop: number, target: number): { valid: boolean; ratio: number } {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    const ratio = risk > 0 ? reward / risk : 0;
    return {
      valid: ratio >= 1.5,
      ratio
    };
  }

  recordLoss(amount: number): void {
    // Implementation placeholder
  }

  // ============================================================================
  // Risk Metrics Calculation
  // ============================================================================

  updateRiskMetrics(portfolio: Portfolio): RiskMetrics {
    this.portfolio = portfolio;

    if (this.dailyStartValue === 0 && portfolio.totalValue > 0) {
      this.dailyStartValue = portfolio.totalValue;
    }

    this.metrics = this.metricsCalculator.calculate(
      this.portfolio,
      this.priceHistory,
      this.returnsHistory
    );

    this.checkRiskLimits();
    this.emit('metrics_updated', this.metrics);
    return this.metrics;
  }

  // ============================================================================
  // Order Validation and Enforcement
  // ============================================================================

  validateOrder(order: OrderRequest): OrderValidationResult {
    const haltedViolation = this.checkTradingHalted();
    if (haltedViolation) {
      return {
        allowed: false,
        reasons: ['Trading is halted'],
        violations: [haltedViolation],
        action: 'halt',
      };
    }

    this.checkAndResetDailyPnL();

    const violations = this.validateAllRiskLimits(order);
    const reasons = this.generateViolationReasons(violations);
    const action = this.determineViolationAction(violations);

    violations.forEach((violation) => this.addAlert(violation));

    return {
      allowed: action === 'allow' || action === 'alert',
      reasons: reasons.length > 0 ? reasons : ['Order passed all risk checks'],
      violations,
      action,
    };
  }

  private checkTradingHalted(): RiskAlert | null {
    if (!this.isTradingHalted) return null;

    return {
      type: 'daily_loss',
      severity: 'critical',
      message: 'Trading is halted due to risk limit violation',
      currentValue: 0,
      limitValue: 0,
      timestamp: Date.now(),
    };
  }

  private validateAllRiskLimits(order: OrderRequest): RiskAlert[] {
    const violations: RiskAlert[] = [];

    const dailyLossViolation = this.validateDailyLossLimit(order);
    if (dailyLossViolation) {
      this.haltTrading();
      return [dailyLossViolation];
    }

    violations.push(...this.validatePositionSizeLimit(order));
    violations.push(...this.validateSingleTradeRisk(order));
    violations.push(...this.validateLeverageLimit(order));
    violations.push(...this.validateCashReserve(order));

    return violations;
  }

  private validateDailyLossLimit(order: OrderRequest): RiskAlert | null {
    if (order.side !== 'BUY') return null;

    const dailyLoss = this.getDailyLoss();
    const dailyLossPercent = (dailyLoss / this.portfolio.totalValue) * 100;

    if (dailyLossPercent >= this.limits.maxDailyLoss) {
      return {
        type: 'daily_loss',
        severity: 'critical',
        message: `Daily loss limit reached: ${dailyLossPercent.toFixed(2)}%`,
        currentValue: dailyLossPercent,
        limitValue: this.limits.maxDailyLoss,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  private validatePositionSizeLimit(order: OrderRequest): RiskAlert[] {
    const violations: RiskAlert[] = [];
    if (order.side !== 'BUY') return violations;

    const orderValue = order.quantity * order.price;
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
    }

    return violations;
  }

  private validateSingleTradeRisk(order: OrderRequest): RiskAlert[] {
    const violations: RiskAlert[] = [];
    if (!order.stopLoss) return violations;

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
    }

    return violations;
  }

  private validateLeverageLimit(order: OrderRequest): RiskAlert[] {
    const violations: RiskAlert[] = [];
    if (order.side !== 'BUY') return violations;

    const orderValue = order.quantity * order.price;
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
    }

    return violations;
  }

  private validateCashReserve(order: OrderRequest): RiskAlert[] {
    const violations: RiskAlert[] = [];
    if (order.side !== 'BUY') return violations;

    const orderValue = order.quantity * order.price;
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
    }

    return violations;
  }

  private generateViolationReasons(violations: RiskAlert[]): string[] {
    const reasons: string[] = [];
    for (const violation of violations) {
      if (violation.type === 'daily_loss') {
        reasons.push(violation.message);
      } else if (violation.type === 'position_limit') {
        reasons.push(`Position size limit: ${(violation.currentValue * 100).toFixed(2)}% > ${violation.limitValue * 100}%`);
      } else if (violation.type === 'margin') {
        if (violation.message.includes('Leverage')) {
          reasons.push(`Leverage: ${violation.currentValue.toFixed(2)}x > ${violation.limitValue}x`);
        } else {
          reasons.push(`Cash reserve: ${violation.currentValue.toFixed(2)}% < ${violation.limitValue}%`);
        }
      }
    }
    return reasons;
  }

  private determineViolationAction(violations: RiskAlert[]): 'allow' | 'alert' | 'reject' | 'halt' {
    if (violations.length === 0) return 'allow';
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const highViolations = violations.filter((v) => v.severity === 'high');
    if (criticalViolations.length > 0) return 'halt';
    if (highViolations.length > 0) return 'reject';
    return 'alert';
  }

  private checkAndResetDailyPnL(): void {
    const today = new Date();
    if (today.toDateString() !== this.lastResetDate.toDateString()) {
      this.dailyStartValue = this.portfolio.totalValue;
      this.dailyPnL = 0;
      this.lastResetDate = today;
    }
  }

  getDailyLoss(): number {
    this.checkAndResetDailyPnL();
    const currentPnL = this.portfolio.totalValue - this.dailyStartValue;
    this.dailyPnL = currentPnL;
    return currentPnL < 0 ? Math.abs(currentPnL) : 0;
  }

  getDailyPnLPercent(): number {
    const pnl = this.portfolio.totalValue - this.dailyStartValue;
    return (pnl / this.dailyStartValue) * 100;
  }

  // ============================================================================
  // Risk Limit Checking
  // ============================================================================

  private checkRiskLimits(): void {
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

  private addAlert(alert: RiskAlert): void {
    this.alerts.push(alert);
    this.emit('risk_alert', alert);
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private haltTrading(): void {
    if (!this.isTradingHalted) {
      this.isTradingHalted = true;
      this.emit('trading_halted', { reason: 'Risk limit exceeded' });
    }
  }

  resumeTrading(): void {
    this.isTradingHalted = false;
    this.emit('trading_resumed');
  }

  // ============================================================================
  // Portfolio Optimization (Modern Portfolio Theory)
  // ============================================================================

  optimizePortfolio(params: PortfolioOptimizationParams): OptimizationResult {
    return this.portfolioOptimizer.optimizePortfolio(params);
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  addPriceData(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);
    if (prices.length > 252) {
      this.priceHistory.set(symbol, prices.slice(-252));
    }

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

  getRiskMetrics(): RiskMetrics {
    return this.metrics;
  }

  getAlerts(): RiskAlert[] {
    return this.alerts;
  }

  isHalted(): boolean {
    return this.isTradingHalted;
  }

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

  updateLimits(limits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...limits };
    this.positionSizer.updateLimits(this.limits);
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
