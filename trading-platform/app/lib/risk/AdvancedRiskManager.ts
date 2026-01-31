/**
 * AdvancedRiskManager.ts
 * 
 * 株取引で勝つための高度なリスク管理システム
 * 
 * 【機能】
 * - ポジションサイジング（ケリー基準、固定比率法、ボラティリティ調整）
 * - 動的ストップロス（ATRベース、トレーリングストップ、シャンデリア）
 * - ポートフォリオリスク管理（最大ドローダウン、相関リスク）
 * - 日次/週次損失制限
 */

import { OHLCV, Position, RiskManagementSettings } from '@/app/types';

// Extended Position interface for risk management
interface RiskPosition extends Position {
  entryPrice: number;
  unrealizedPnl?: number;
}

// ============================================================================
// Types
// ============================================================================

export interface PositionSizingInput {
  accountBalance: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  volatility: number; // ATR / Price
  winRate?: number; // 過去の勝率
  avgWinLossRatio?: number; // 平均利益/損失比
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS';
  correlationWithPortfolio?: number; // ポートフォリオとの相関
}

export interface PositionSizingResult {
  recommendedSize: number; // 株数
  positionValue: number; // ポジション価値
  riskAmount: number; // リスク額
  riskPercent: number; // リスク率（%）
  method: string;
  kellyFraction?: number; // ケリー基準の分数
}

export interface StopLossConfig {
  type: 'fixed' | 'atr' | 'trailing' | 'chandelier' | 'parabolic_sar' | 'volatility';
  value: number;
  atrMultiplier?: number;
  trailingPercent?: number;
  chandelierPeriod?: number;
}

export interface StopLossResult {
  stopLossPrice: number;
  shouldExit: boolean;
  exitReason: string;
  adjustedStop?: number; // トレーリングストップの場合
}

export interface PortfolioRiskMetrics {
  totalExposure: number; // 総エクスポージャー
  maxDrawdown: number; // 最大ドローダウン
  dailyLossLimit: number; // 日次損失制限
  weeklyLossLimit: number; // 週次損失制限
  currentDailyLoss: number; // 現在の日次損失
  currentWeeklyLoss: number; // 現在の週次損失
  var95: number; // Value at Risk (95%)
  var99: number; // Value at Risk (99%)
  correlationRisk: number; // 相関リスクスコア
}

export interface RiskLimitConfig {
  maxRiskPerTrade: number; // % of account
  maxDailyLoss: number; // % of account
  maxWeeklyLoss: number; // % of account
  maxDrawdown: number; // % from peak
  maxPositionSize: number; // % of account
  maxCorrelationExposure: number; // max correlation between positions
  minRiskRewardRatio: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimitConfig = {
  maxRiskPerTrade: 2.0,
  maxDailyLoss: 5.0,
  maxWeeklyLoss: 10.0,
  maxDrawdown: 20.0,
  maxPositionSize: 20.0,
  maxCorrelationExposure: 0.7,
  minRiskRewardRatio: 2.0,
};

// ============================================================================
// Advanced Risk Manager
// ============================================================================

export class AdvancedRiskManager {
  private config: RiskLimitConfig;
  private dailyLosses: Map<string, number> = new Map(); // date -> loss
  private weeklyLosses: Map<string, number> = new Map(); // week -> loss
  private peakEquity: number = 0;
  private currentDrawdown: number = 0;

  constructor(config: Partial<RiskLimitConfig> = {}) {
    this.config = { ...DEFAULT_RISK_LIMITS, ...config };
  }

  // ============================================================================
  // Position Sizing Methods
  // ============================================================================

  /**
   * 固定比率法によるポジションサイジング
   * 口座残高の固定%をリスクとして使用
   */
  calculateFixedRatioSizing(input: PositionSizingInput): PositionSizingResult {
    const { accountBalance, entryPrice, stopLossPrice } = input;
    
    const riskAmount = accountBalance * (this.config.maxRiskPerTrade / 100);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (priceRisk === 0) {
      return this.createZeroRiskResult();
    }
    
    const shares = Math.floor(riskAmount / priceRisk);
    const positionValue = shares * entryPrice;
    
    // 最大ポジションサイズ制限
    const maxPositionValue = accountBalance * (this.config.maxPositionSize / 100);
    const adjustedShares = Math.min(shares, Math.floor(maxPositionValue / entryPrice));
    
    return {
      recommendedSize: adjustedShares,
      positionValue: adjustedShares * entryPrice,
      riskAmount: adjustedShares * priceRisk,
      riskPercent: (adjustedShares * priceRisk / accountBalance) * 100,
      method: 'Fixed Ratio',
    };
  }

  /**
   * ケリー基準によるポジションサイジング
   * 最適なベットサイズを数学的に計算
   * 
   * f* = (p * b - q) / b
   * p = 勝率
   * q = 負率 (1 - p)
   * b = 平均利益/平均損失（オッズ）
   */
  calculateKellyCriterionSizing(input: PositionSizingInput): PositionSizingResult {
    const { accountBalance, entryPrice, stopLossPrice, winRate = 0.5, avgWinLossRatio = 1.5 } = input;
    
    const p = winRate;
    const q = 1 - p;
    const b = avgWinLossRatio;
    
    // ケリー分数計算
    let kellyFraction = (p * b - q) / b;
    
    // フルケリーはリスクが高いのでハーフケリーを使用
    kellyFraction = Math.max(0, Math.min(kellyFraction * 0.5, 0.25));
    
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (priceRisk === 0) {
      return this.createZeroRiskResult();
    }
    
    // ケリー基準に基づくリスク額
    const riskAmount = accountBalance * kellyFraction;
    const shares = Math.floor(riskAmount / priceRisk);
    
    // 最大ポジション制限
    const maxPositionValue = accountBalance * (this.config.maxPositionSize / 100);
    const adjustedShares = Math.min(shares, Math.floor(maxPositionValue / entryPrice));
    
    return {
      recommendedSize: adjustedShares,
      positionValue: adjustedShares * entryPrice,
      riskAmount: adjustedShares * priceRisk,
      riskPercent: (adjustedShares * priceRisk / accountBalance) * 100,
      method: 'Kelly Criterion (Half)',
      kellyFraction: Math.round(kellyFraction * 100 * 100) / 100,
    };
  }

  /**
   * ボラティリティ調整型ポジションサイジング
   * ボラティリティが高いほどポジションを小さく
   */
  calculateVolatilityAdjustedSizing(input: PositionSizingInput): PositionSizingResult {
    const { accountBalance, entryPrice, stopLossPrice, volatility } = input;
    
    const baseRiskPercent = this.config.maxRiskPerTrade;
    
    // ボラティリティ調整係数（高ボラティリティ = 小さいポジション）
    const volatilityAdjustment = Math.max(0.3, Math.min(1.0, 0.02 / volatility));
    
    const adjustedRiskPercent = baseRiskPercent * volatilityAdjustment;
    const riskAmount = accountBalance * (adjustedRiskPercent / 100);
    
    const priceRisk = Math.abs(entryPrice - stopLossPrice);
    
    if (priceRisk === 0) {
      return this.createZeroRiskResult();
    }
    
    const shares = Math.floor(riskAmount / priceRisk);
    const maxPositionValue = accountBalance * (this.config.maxPositionSize / 100);
    const adjustedShares = Math.min(shares, Math.floor(maxPositionValue / entryPrice));
    
    return {
      recommendedSize: adjustedShares,
      positionValue: adjustedShares * entryPrice,
      riskAmount: adjustedShares * priceRisk,
      riskPercent: (adjustedShares * priceRisk / accountBalance) * 100,
      method: `Volatility Adjusted (${Math.round(volatilityAdjustment * 100)}%)`,
    };
  }

  /**
   * 最適なポジションサイジング方法を選択
   */
  calculateOptimalPositionSize(
    input: PositionSizingInput,
    method: 'fixed' | 'kelly' | 'volatility' | 'adaptive' = 'adaptive'
  ): PositionSizingResult {
    switch (method) {
      case 'fixed':
        return this.calculateFixedRatioSizing(input);
      case 'kelly':
        return this.calculateKellyCriterionSizing(input);
      case 'volatility':
        return this.calculateVolatilityAdjustedSizing(input);
      case 'adaptive':
      default:
        return this.calculateAdaptivePositionSize(input);
    }
  }

  /**
   * アダプティブポジションサイジング
   * 市場状況に応じて最適な方法を自動選択
   */
  private calculateAdaptivePositionSize(input: PositionSizingInput): PositionSizingResult {
    const { volatility, winRate, marketRegime } = input;
    
    // 勝率データがあればケリー基準を優先
    if (winRate && winRate > 0.4 && winRate < 0.8) {
      return this.calculateKellyCriterionSizing(input);
    }
    
    // 高ボラティリティ時はボラティリティ調整
    if (volatility > 0.03) {
      return this.calculateVolatilityAdjustedSizing(input);
    }
    
    // デフォルトは固定比率法
    return this.calculateFixedRatioSizing(input);
  }

  // ============================================================================
  // Stop Loss Management
  // ============================================================================

  /**
   * ATRベースのストップロスを計算
   */
  calculateATRStopLoss(
    entryPrice: number,
    currentPrice: number,
    atr: number,
    side: 'LONG' | 'SHORT',
    multiplier: number = 2
  ): StopLossResult {
    const stopDistance = atr * multiplier;
    let stopLossPrice: number;
    
    if (side === 'LONG') {
      stopLossPrice = entryPrice - stopDistance;
    } else {
      stopLossPrice = entryPrice + stopDistance;
    }
    
    const shouldExit = side === 'LONG' 
      ? currentPrice <= stopLossPrice 
      : currentPrice >= stopLossPrice;
    
    return {
      stopLossPrice,
      shouldExit,
      exitReason: shouldExit ? 'ATR Stop Loss Triggered' : 'Within Risk Limit',
    };
  }

  /**
   * トレーリングストップを計算
   */
  calculateTrailingStop(
    entryPrice: number,
    currentPrice: number,
    highestPrice: number,
    lowestPrice: number,
    side: 'LONG' | 'SHORT',
    trailPercent: number = 5
  ): StopLossResult {
    let stopLossPrice: number;
    let adjustedStop: number | undefined;
    
    if (side === 'LONG') {
      // ロング：高値からtrailPercent%下がったら
      const trailDistance = highestPrice * (trailPercent / 100);
      adjustedStop = highestPrice - trailDistance;
      stopLossPrice = Math.max(entryPrice * 0.95, adjustedStop); // 最低5%は確保
    } else {
      // ショート：安値からtrailPercent%上がったら
      const trailDistance = lowestPrice * (trailPercent / 100);
      adjustedStop = lowestPrice + trailDistance;
      stopLossPrice = Math.min(entryPrice * 1.05, adjustedStop); // 最低5%は確保
    }
    
    const shouldExit = side === 'LONG'
      ? currentPrice <= stopLossPrice
      : currentPrice >= stopLossPrice;
    
    return {
      stopLossPrice,
      shouldExit,
      exitReason: shouldExit ? 'Trailing Stop Triggered' : 'Trailing',
      adjustedStop,
    };
  }

  /**
   * シャンデリアエグジットを計算
   * ATRベースのトレーリングストップ
   */
  calculateChandelierExit(
    data: OHLCV[],
    currentPrice: number,
    side: 'LONG' | 'SHORT',
    period: number = 22,
    atrMultiplier: number = 3
  ): StopLossResult {
    // 期間の高値/安値を取得
    const highs = data.slice(-period).map(d => d.high);
    const lows = data.slice(-period).map(d => d.low);
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    // ATR計算
    const atr = this.calculateATR(data, 14);
    const currentATR = atr[atr.length - 1] || currentPrice * 0.02;
    
    let stopLossPrice: number;
    
    if (side === 'LONG') {
      stopLossPrice = highestHigh - currentATR * atrMultiplier;
    } else {
      stopLossPrice = lowestLow + currentATR * atrMultiplier;
    }
    
    const shouldExit = side === 'LONG'
      ? currentPrice <= stopLossPrice
      : currentPrice >= stopLossPrice;
    
    return {
      stopLossPrice,
      shouldExit,
      exitReason: shouldExit ? 'Chandelier Exit Triggered' : 'Within Chandelier',
    };
  }

  /**
   * 時間ベースのストップロス
   * 一定時間経過後に強制決済
   */
  calculateTimeStopLoss(
    entryTime: Date,
    currentTime: Date,
    maxHoldingHours: number = 24
  ): StopLossResult {
    const hoursElapsed = (currentTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60);
    const shouldExit = hoursElapsed >= maxHoldingHours;
    
    return {
      stopLossPrice: 0, // 時間ベースでは価格は関係ない
      shouldExit,
      exitReason: shouldExit ? `Time Stop (${hoursElapsed.toFixed(1)}h elapsed)` : 'Within Time Limit',
    };
  }

  // ============================================================================
  // Portfolio Risk Management
  // ============================================================================

  /**
   * ポートフォリオリスクメトリクスを計算
   */
  calculatePortfolioRisk(
    positions: RiskPosition[],
    accountBalance: number,
    priceHistory: Map<string, OHLCV[]>
  ): PortfolioRiskMetrics {
    // 総エクスポージャー
    const totalExposure = positions.reduce((sum, pos) => 
      sum + (pos.entryPrice * pos.quantity), 0
    );
    
    // 現在のドローダウン
    const currentEquity = accountBalance + positions.reduce((sum, pos) => 
      sum + (pos.unrealizedPnl || 0), 0
    );
    
    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }
    
    this.currentDrawdown = ((this.peakEquity - currentEquity) / this.peakEquity) * 100;
    
    // VaR計算（簡易版）
    const returns = this.calculatePortfolioReturns(positions, priceHistory);
    const var95 = this.calculateVaR(returns, 0.05) * totalExposure;
    const var99 = this.calculateVaR(returns, 0.01) * totalExposure;
    
    // 相関リスク
    const correlationRisk = this.calculateCorrelationRisk(positions, priceHistory);
    
    // 日次/週次損失
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = this.getWeekNumber(new Date());
    
    return {
      totalExposure,
      maxDrawdown: this.currentDrawdown,
      dailyLossLimit: accountBalance * (this.config.maxDailyLoss / 100),
      weeklyLossLimit: accountBalance * (this.config.maxWeeklyLoss / 100),
      currentDailyLoss: this.dailyLosses.get(today) || 0,
      currentWeeklyLoss: this.weeklyLosses.get(currentWeek.toString()) || 0,
      var95,
      var99,
      correlationRisk,
    };
  }

  /**
   * 新規ポジションがリスク制限内かチェック
   */
  canOpenPosition(
    newPosition: RiskPosition,
    existingPositions: RiskPosition[],
    accountBalance: number,
    priceHistory: Map<string, OHLCV[]>
  ): { allowed: boolean; reason?: string } {
    const portfolioRisk = this.calculatePortfolioRisk(existingPositions, accountBalance, priceHistory);
    
    // 日次損失制限チェック
    if (portfolioRisk.currentDailyLoss >= portfolioRisk.dailyLossLimit) {
      return { allowed: false, reason: 'Daily loss limit reached' };
    }
    
    // 週次損失制限チェック
    if (portfolioRisk.currentWeeklyLoss >= portfolioRisk.weeklyLossLimit) {
      return { allowed: false, reason: 'Weekly loss limit reached' };
    }
    
    // ドローダウン制限チェック
    if (portfolioRisk.maxDrawdown >= this.config.maxDrawdown) {
      return { allowed: false, reason: 'Max drawdown limit reached' };
    }
    
    // 総エクスポージャーチェック
    const newExposure = newPosition.entryPrice * newPosition.quantity;
    const totalExposure = portfolioRisk.totalExposure + newExposure;
    if (totalExposure > accountBalance * (this.config.maxPositionSize * 3 / 100)) {
      return { allowed: false, reason: 'Max total exposure would be exceeded' };
    }
    
    // 相関リスクチェック
    if (portfolioRisk.correlationRisk > this.config.maxCorrelationExposure) {
      return { allowed: false, reason: 'Correlation risk too high' };
    }
    
    return { allowed: true };
  }

  /**
   * 損失を記録
   */
  recordLoss(loss: number): void {
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = this.getWeekNumber(new Date()).toString();
    
    // 日次損失を更新
    const currentDaily = this.dailyLosses.get(today) || 0;
    this.dailyLosses.set(today, currentDaily + loss);
    
    // 週次損失を更新
    const currentWeekly = this.weeklyLosses.get(currentWeek) || 0;
    this.weeklyLosses.set(currentWeek, currentWeekly + loss);
  }

  /**
   * リスクリワード比を検証
   */
  validateRiskRewardRatio(
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): { valid: boolean; ratio: number } {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    const ratio = risk > 0 ? reward / risk : 0;
    
    return {
      valid: ratio >= this.config.minRiskRewardRatio,
      ratio: Math.round(ratio * 100) / 100,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createZeroRiskResult(): PositionSizingResult {
    return {
      recommendedSize: 0,
      positionValue: 0,
      riskAmount: 0,
      riskPercent: 0,
      method: 'Error: Zero Risk',
    };
  }

  private calculateATR(data: OHLCV[], period: number): number[] {
    const atr: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        atr.push(NaN);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const idx = i - j;
        const tr = Math.max(
          data[idx].high - data[idx].low,
          Math.abs(data[idx].high - data[idx - 1].close),
          Math.abs(data[idx].low - data[idx - 1].close)
        );
        sum += tr;
      }
      atr.push(sum / period);
    }
    
    return atr;
  }

  private calculatePortfolioReturns(
    positions: RiskPosition[],
    priceHistory: Map<string, OHLCV[]>
  ): number[] {
    const returns: number[] = [];
    
    for (const position of positions) {
      const history = priceHistory.get(position.symbol);
      if (history && history.length > 1) {
        for (let i = 1; i < history.length; i++) {
          const ret = (history[i].close - history[i-1].close) / history[i-1].close;
          returns.push(ret);
        }
      }
    }
    
    return returns;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * confidence);
    return Math.abs(sorted[index] || 0);
  }

  private calculateCorrelationRisk(
    positions: RiskPosition[],
    priceHistory: Map<string, OHLCV[]>
  ): number {
    if (positions.length < 2) return 0;
    
    let totalCorrelation = 0;
    let count = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const corr = this.calculateCorrelation(
          priceHistory.get(positions[i].symbol) || [],
          priceHistory.get(positions[j].symbol) || []
        );
        totalCorrelation += Math.abs(corr);
        count++;
      }
    }
    
    return count > 0 ? totalCorrelation / count : 0;
  }

  private calculateCorrelation(data1: OHLCV[], data2: OHLCV[]): number {
    if (data1.length < 20 || data2.length < 20) return 0;
    
    const returns1 = data1.slice(-20).map((d, i, arr) => 
      i === 0 ? 0 : (d.close - arr[i-1].close) / arr[i-1].close
    ).slice(1);
    
    const returns2 = data2.slice(-20).map((d, i, arr) => 
      i === 0 ? 0 : (d.close - arr[i-1].close) / arr[i-1].close
    ).slice(1);
    
    const n = Math.min(returns1.length, returns2.length);
    const mean1 = returns1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = returns2.slice(0, n).reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    return denom1 > 0 && denom2 > 0 ? numerator / Math.sqrt(denom1 * denom2) : 0;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(newConfig: Partial<RiskLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RiskLimitConfig {
    return { ...this.config };
  }

  reset(): void {
    this.dailyLosses.clear();
    this.weeklyLosses.clear();
    this.peakEquity = 0;
    this.currentDrawdown = 0;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const advancedRiskManager = new AdvancedRiskManager();
export default AdvancedRiskManager;

// Additional exports for compatibility
export type RiskMetrics = PortfolioRiskMetrics;
export type { RiskPosition };
export type Portfolio = PortfolioRiskMetrics;
export type RiskLimits = RiskLimitConfig;
export interface RiskAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: string;
}
export interface PortfolioOptimizationParams {
  targetReturn: number;
  maxRisk: number;
  constraints: {
    minWeight: number;
    maxWeight: number;
  };
}
export interface OptimizationResult {
  weights: Map<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
}
export interface PositionSizingParams {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
}

// Helper functions for global access
export function getGlobalRiskManager(): AdvancedRiskManager {
  return advancedRiskManager;
}

export function resetGlobalRiskManager(): void {
  advancedRiskManager.reset();
}
