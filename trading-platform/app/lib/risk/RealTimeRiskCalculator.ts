/**
 * RealTimeRiskCalculator.ts
 * 
 * TRADING-023: リアルタイムリスク監視と動的リスク管理システム
 * Phase 1: リアルタイムリスク計算
 * 
 * ポートフォリオ全体のリアルタイムリスク計算、VaR、相関リスク、
 * 最大ドローダウンの追跡を提供します。
 */

import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

/**
 * リアルタイムリスク計算結果
 */
export interface RealTimeRiskMetrics {
  // 全体リスク
  totalRiskPercent: number; // ポートフォリオ全体のリスク (%)
  usedCapitalPercent: number; // 使用資金 (%)
  unrealizedPnL: number; // 未実現損益
  unrealizedPnLPercent: number; // 未実現損益 (%)
  
  // ドローダウン
  currentDrawdown: number; // 現在のドローダウン (%)
  maxDrawdown: number; // 最大ドローダウン (%)
  peakValue: number; // ピーク値
  
  // VaR (Value at Risk)
  var95: number; // 95% VaR (日次)
  var99: number; // 99% VaR (日次)
  cvar95: number; // 95% CVaR (Conditional VaR)
  
  // ボラティリティ
  portfolioVolatility: number; // ポートフォリオボラティリティ (%)
  weightedVolatility: number; // 加重平均ボラティリティ (%)
  
  // 集中リスク
  concentrationRisk: number; // 集中リスクスコア (0-1)
  largestPositionPercent: number; // 最大ポジション比率 (%)
  
  // 相関リスク
  correlationRisk: number; // 相関リスクスコア (0-1)
  avgCorrelation: number; // 平均相関係数
  
  // 日次損失
  dailyLoss: number; // 本日の損失
  dailyLossPercent: number; // 本日の損失 (%)
  
  // リスクレベル
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger' | 'critical';
  alerts: RiskAlert[];
}

/**
 * 個別ポジションのリスク
 */
export interface PositionRisk {
  symbol: string;
  positionValue: number;
  positionPercent: number; // ポートフォリオに対する比率
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  volatility: number; // ボラティリティ
  var95: number; // 95% VaR
  riskContribution: number; // ポートフォリオリスクへの寄与度
  stopLossDistance: number; // ストップロスまでの距離 (%)
}

/**
 * リスクアラート
 */
export interface RiskAlert {
  id: string;
  type: 'max_loss' | 'drawdown' | 'concentration' | 'correlation' | 'volatility' | 'position_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  thresholdValue: number;
  timestamp: number;
  actionRequired?: string;
}

/**
 * VaR計算方法
 */
export type VaRMethod = 'historical' | 'parametric' | 'montecarlo';

/**
 * リスク計算設定
 */
export interface RiskCalculationConfig {
  // VaR設定
  varMethod: VaRMethod;
  varConfidenceLevel: number; // 95 or 99
  varTimeHorizon: number; // 日数
  historicalPeriod: number; // 履歴データ期間（日数）
  
  // リスク閾値
  safeThreshold: number; // 安全: 10%以下
  cautionThreshold: number; // 注意: 10-20%
  warningThreshold: number; // 警告: 20-30%
  dangerThreshold: number; // 危険: 30%以上
  
  // 損失制限
  maxDailyLossPercent: number; // 日次最大損失 (%)
  maxWeeklyLossPercent: number; // 週次最大損失 (%)
  maxDrawdownPercent: number; // 最大ドローダウン (%)
  maxSinglePositionLossPercent: number; // 単一銘柄最大損失 (%)
  
  // 集中リスク
  maxPositionPercent: number; // 最大ポジション比率 (%)
  maxSectorConcentration: number; // セクター集中度 (%)
  
  // 相関設定
  maxCorrelation: number; // 最大相関係数
  correlationWindow: number; // 相関計算期間（日数）
}

/**
 * デフォルトリスク計算設定
 */
export const DEFAULT_RISK_CONFIG: RiskCalculationConfig = {
  varMethod: 'historical',
  varConfidenceLevel: 95,
  varTimeHorizon: 1,
  historicalPeriod: 252, // 1年分の取引日
  
  safeThreshold: 10,
  cautionThreshold: 20,
  warningThreshold: 30,
  dangerThreshold: 50,
  
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownPercent: 20,
  maxSinglePositionLossPercent: 2,
  
  maxPositionPercent: 20,
  maxSectorConcentration: 30,
  
  maxCorrelation: 0.7,
  correlationWindow: 60,
};

// ============================================================================
// RealTimeRiskCalculator Class
// ============================================================================

export class RealTimeRiskCalculator {
  private config: RiskCalculationConfig;
  private returnsHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private portfolioHistory: number[] = [];
  private peakValue: number = 0;
  private dailyStartValue: number = 0;
  private weeklyStartValue: number = 0;

  constructor(config: Partial<RiskCalculationConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * ポートフォリオ全体のリアルタイムリスクを計算
   */
  calculatePortfolioRisk(portfolio: Portfolio): RealTimeRiskMetrics {
    const totalValue = portfolio.totalValue + portfolio.cash;
    const positionValue = portfolio.totalValue;
    
    // 基本メトリクス
    const usedCapitalPercent = totalValue > 0 ? (positionValue / totalValue) * 100 : 0;
    const unrealizedPnL = portfolio.totalProfit;
    const unrealizedPnLPercent = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;
    
    // ドローダウン計算
    if (totalValue > this.peakValue) {
      this.peakValue = totalValue;
    }
    const currentDrawdown = this.peakValue > 0 
      ? ((this.peakValue - totalValue) / this.peakValue) * 100 
      : 0;
    const maxDrawdown = this.calculateMaxDrawdown();
    
    // VaR計算
    const { var95, var99, cvar95 } = this.calculateVaR(portfolio);
    
    // ボラティリティ計算
    const portfolioVolatility = this.calculatePortfolioVolatility(portfolio);
    const weightedVolatility = this.calculateWeightedVolatility(portfolio);
    
    // 集中リスク計算
    const { concentrationRisk, largestPositionPercent } = this.calculateConcentrationRisk(portfolio);
    
    // 相関リスク計算
    const { correlationRisk, avgCorrelation } = this.calculateCorrelationRisk(portfolio);
    
    // 日次損失
    const dailyLoss = this.dailyStartValue > 0 ? this.dailyStartValue - totalValue : 0;
    const dailyLossPercent = this.dailyStartValue > 0 
      ? (dailyLoss / this.dailyStartValue) * 100 
      : 0;
    
    // 総合リスク計算
    const totalRiskPercent = this.calculateTotalRisk({
      usedCapitalPercent,
      portfolioVolatility,
      concentrationRisk,
      correlationRisk,
      currentDrawdown,
    });
    
    // リスクレベル判定
    const riskLevel = this.determineRiskLevel(totalRiskPercent);
    
    // アラート生成
    const alerts = this.generateAlerts({
      totalRiskPercent,
      currentDrawdown,
      maxDrawdown,
      dailyLossPercent,
      concentrationRisk,
      correlationRisk,
      largestPositionPercent,
      portfolio,
    });
    
    return {
      totalRiskPercent,
      usedCapitalPercent,
      unrealizedPnL,
      unrealizedPnLPercent,
      currentDrawdown,
      maxDrawdown,
      peakValue: this.peakValue,
      var95,
      var99,
      cvar95,
      portfolioVolatility,
      weightedVolatility,
      concentrationRisk,
      largestPositionPercent,
      correlationRisk,
      avgCorrelation,
      dailyLoss,
      dailyLossPercent,
      riskLevel,
      alerts,
    };
  }

  /**
   * 個別ポジションのリスクを計算
   */
  calculatePositionRisk(position: Position, portfolioValue: number): PositionRisk {
    const positionValue = position.currentPrice * position.quantity;
    const positionPercent = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : 0;
    
    const unrealizedPnL = position.side === 'LONG'
      ? (position.currentPrice - position.avgPrice) * position.quantity
      : (position.avgPrice - position.currentPrice) * position.quantity;
    
    const unrealizedPnLPercent = position.avgPrice > 0
      ? (unrealizedPnL / (position.avgPrice * position.quantity)) * 100
      : 0;
    
    // ボラティリティ計算（過去のリターンから）
    const returns = this.returnsHistory.get(position.symbol) || [];
    const volatility = this.calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
    
    // VaR計算
    const var95 = volatility * 1.645 * positionValue / 100; // 95%信頼区間
    
    // リスク寄与度（簡略版）
    const riskContribution = positionPercent * volatility / 100;
    
    // ストップロスまでの距離
    const stopLossDistance = position.stopLoss
      ? Math.abs((position.currentPrice - position.stopLoss) / position.currentPrice) * 100
      : 0;
    
    return {
      symbol: position.symbol,
      positionValue,
      positionPercent,
      unrealizedPnL,
      unrealizedPnLPercent,
      volatility,
      var95,
      riskContribution,
      stopLossDistance,
    };
  }

  /**
   * VaR (Value at Risk) を計算
   */
  private calculateVaR(portfolio: Portfolio): { var95: number; var99: number; cvar95: number } {
    const totalValue = portfolio.totalValue + portfolio.cash;
    
    if (this.config.varMethod === 'historical') {
      return this.calculateHistoricalVaR(portfolio, totalValue);
    } else if (this.config.varMethod === 'parametric') {
      return this.calculateParametricVaR(portfolio, totalValue);
    }
    
    // デフォルト：パラメトリック法
    return this.calculateParametricVaR(portfolio, totalValue);
  }

  /**
   * ヒストリカルVaR計算
   */
  private calculateHistoricalVaR(
    portfolio: Portfolio, 
    totalValue: number
  ): { var95: number; var99: number; cvar95: number } {
    const returns = this.portfolioHistory;
    
    if (returns.length < 30) {
      // データ不足の場合はパラメトリック法を使用
      return this.calculateParametricVaR(portfolio, totalValue);
    }
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index95 = Math.floor(returns.length * 0.05);
    const index99 = Math.floor(returns.length * 0.01);
    
    const var95 = -sortedReturns[index95] * totalValue;
    const var99 = -sortedReturns[index99] * totalValue;
    
    // CVaR (Expected Shortfall)
    const tailReturns = sortedReturns.slice(0, index95);
    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    const cvar95 = -avgTailReturn * totalValue;
    
    return { var95, var99, cvar95 };
  }

  /**
   * パラメトリックVaR計算
   */
  private calculateParametricVaR(
    portfolio: Portfolio, 
    totalValue: number
  ): { var95: number; var99: number; cvar95: number } {
    const volatility = this.calculatePortfolioVolatility(portfolio) / 100;
    
    // z-scores for confidence levels
    const z95 = 1.645;
    const z99 = 2.326;
    
    const var95 = totalValue * volatility * z95 * Math.sqrt(this.config.varTimeHorizon);
    const var99 = totalValue * volatility * z99 * Math.sqrt(this.config.varTimeHorizon);
    
    // CVaR approximation
    const cvar95 = var95 * (Math.exp(0.5 * z95 * z95) / (1 - 0.95)) / z95;
    
    return { var95, var99, cvar95 };
  }

  /**
   * ポートフォリオボラティリティを計算
   */
  private calculatePortfolioVolatility(portfolio: Portfolio): number {
    const returns = this.portfolioHistory;
    
    if (returns.length < 2) {
      // デフォルト値を返す
      return 15; // 15%
    }
    
    const stdDev = this.calculateStandardDeviation(returns);
    return stdDev * Math.sqrt(252) * 100; // 年率換算
  }

  /**
   * 加重平均ボラティリティを計算
   */
  private calculateWeightedVolatility(portfolio: Portfolio): number {
    const totalValue = portfolio.totalValue;
    
    if (totalValue === 0 || portfolio.positions.length === 0) {
      return 0;
    }
    
    let weightedVol = 0;
    
    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const weight = positionValue / totalValue;
      const returns = this.returnsHistory.get(position.symbol) || [];
      const volatility = this.calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
      weightedVol += weight * volatility;
    }
    
    return weightedVol;
  }

  /**
   * 集中リスクを計算
   */
  private calculateConcentrationRisk(
    portfolio: Portfolio
  ): { concentrationRisk: number; largestPositionPercent: number } {
    const totalValue = portfolio.totalValue;
    
    if (totalValue === 0 || portfolio.positions.length === 0) {
      return { concentrationRisk: 0, largestPositionPercent: 0 };
    }
    
    // Herfindahl-Hirschman Index (HHI) を使用
    let hhi = 0;
    let largestPositionPercent = 0;
    
    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const weight = (positionValue / totalValue) * 100;
      hhi += weight * weight;
      largestPositionPercent = Math.max(largestPositionPercent, weight);
    }
    
    // HHIを0-1のスケールに正規化
    // HHI範囲: 100/n (完全分散) から 10000 (完全集中)
    const n = portfolio.positions.length;
    const minHHI = 10000 / n;
    const maxHHI = 10000;
    
    // Edge case: single position
    if (n === 1) {
      return { concentrationRisk: 1, largestPositionPercent: 100 };
    }
    
    const concentrationRisk = Math.min(1, Math.max(0, (hhi - minHHI) / (maxHHI - minHHI)));
    
    return { concentrationRisk, largestPositionPercent };
  }

  /**
   * 相関リスクを計算
   */
  private calculateCorrelationRisk(
    portfolio: Portfolio
  ): { correlationRisk: number; avgCorrelation: number } {
    const positions = portfolio.positions;
    
    if (positions.length < 2) {
      return { correlationRisk: 0, avgCorrelation: 0 };
    }
    
    let sumCorrelation = 0;
    let count = 0;
    
    // すべてのペアの相関係数を計算
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const returns1 = this.returnsHistory.get(positions[i].symbol) || [];
        const returns2 = this.returnsHistory.get(positions[j].symbol) || [];
        
        if (returns1.length > 20 && returns2.length > 20) {
          const correlation = this.calculateCorrelation(returns1, returns2);
          sumCorrelation += Math.abs(correlation);
          count++;
        }
      }
    }
    
    const avgCorrelation = count > 0 ? sumCorrelation / count : 0;
    
    // 相関リスクスコア（高い相関は分散効果を減らす）
    const correlationRisk = Math.min(1, avgCorrelation);
    
    return { correlationRisk, avgCorrelation };
  }

  /**
   * 最大ドローダウンを計算
   */
  private calculateMaxDrawdown(): number {
    if (this.portfolioHistory.length < 2) {
      return 0;
    }
    
    let peak = this.portfolioHistory[0];
    let maxDD = 0;
    
    for (let i = 1; i < this.portfolioHistory.length; i++) {
      const value = this.portfolioHistory[i];
      if (value > peak) {
        peak = value;
      }
      const dd = ((peak - value) / peak) * 100;
      maxDD = Math.max(maxDD, dd);
    }
    
    return maxDD;
  }

  /**
   * 総合リスクを計算
   */
  private calculateTotalRisk(params: {
    usedCapitalPercent: number;
    portfolioVolatility: number;
    concentrationRisk: number;
    correlationRisk: number;
    currentDrawdown: number;
  }): number {
    // 重み付けして総合リスクを計算
    const weights = {
      capital: 0.3,
      volatility: 0.25,
      concentration: 0.2,
      correlation: 0.15,
      drawdown: 0.1,
    };
    
    const normalizedRisk = 
      (params.usedCapitalPercent / 100) * weights.capital +
      (params.portfolioVolatility / 50) * weights.volatility +
      params.concentrationRisk * weights.concentration +
      params.correlationRisk * weights.correlation +
      (params.currentDrawdown / 30) * weights.drawdown;
    
    return Math.min(100, normalizedRisk * 100);
  }

  /**
   * リスクレベルを判定
   */
  private determineRiskLevel(totalRisk: number): 'safe' | 'caution' | 'warning' | 'danger' | 'critical' {
    if (totalRisk >= this.config.dangerThreshold) {
      return 'critical';
    } else if (totalRisk >= this.config.warningThreshold) {
      return 'danger';
    } else if (totalRisk >= this.config.cautionThreshold) {
      return 'warning';
    } else if (totalRisk >= this.config.safeThreshold) {
      return 'caution';
    }
    return 'safe';
  }

  /**
   * リスクアラートを生成
   */
  private generateAlerts(params: {
    totalRiskPercent: number;
    currentDrawdown: number;
    maxDrawdown: number;
    dailyLossPercent: number;
    concentrationRisk: number;
    correlationRisk: number;
    largestPositionPercent: number;
    portfolio: Portfolio;
  }): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const timestamp = Date.now();
    
    // 総合リスクアラート
    if (params.totalRiskPercent >= this.config.dangerThreshold) {
      alerts.push({
        id: `risk-total-${timestamp}`,
        type: 'max_loss',
        severity: 'critical',
        message: `総合リスクが危険水準に達しています (${params.totalRiskPercent.toFixed(1)}%)`,
        currentValue: params.totalRiskPercent,
        thresholdValue: this.config.dangerThreshold,
        timestamp,
        actionRequired: '新規注文を停止し、ポジションの縮小を検討してください',
      });
    } else if (params.totalRiskPercent >= this.config.warningThreshold) {
      alerts.push({
        id: `risk-total-${timestamp}`,
        type: 'max_loss',
        severity: 'high',
        message: `総合リスクが警告水準に達しています (${params.totalRiskPercent.toFixed(1)}%)`,
        currentValue: params.totalRiskPercent,
        thresholdValue: this.config.warningThreshold,
        timestamp,
        actionRequired: 'リスク管理を強化してください',
      });
    }
    
    // ドローダウンアラート
    if (params.currentDrawdown >= this.config.maxDrawdownPercent) {
      alerts.push({
        id: `drawdown-${timestamp}`,
        type: 'drawdown',
        severity: 'critical',
        message: `最大ドローダウン制限を超過しています (${params.currentDrawdown.toFixed(1)}%)`,
        currentValue: params.currentDrawdown,
        thresholdValue: this.config.maxDrawdownPercent,
        timestamp,
        actionRequired: '緊急ポジション縮小が必要です',
      });
    } else if (params.currentDrawdown >= this.config.maxDrawdownPercent * 0.8) {
      alerts.push({
        id: `drawdown-${timestamp}`,
        type: 'drawdown',
        severity: 'high',
        message: `ドローダウンが制限に近づいています (${params.currentDrawdown.toFixed(1)}%)`,
        currentValue: params.currentDrawdown,
        thresholdValue: this.config.maxDrawdownPercent,
        timestamp,
      });
    }
    
    // 日次損失アラート
    if (params.dailyLossPercent >= this.config.maxDailyLossPercent) {
      alerts.push({
        id: `daily-loss-${timestamp}`,
        type: 'max_loss',
        severity: 'critical',
        message: `本日の損失が制限を超えています (${params.dailyLossPercent.toFixed(1)}%)`,
        currentValue: params.dailyLossPercent,
        thresholdValue: this.config.maxDailyLossPercent,
        timestamp,
        actionRequired: '本日の取引を停止してください',
      });
    }
    
    // 集中リスクアラート
    if (params.largestPositionPercent >= this.config.maxPositionPercent) {
      alerts.push({
        id: `concentration-${timestamp}`,
        type: 'concentration',
        severity: 'high',
        message: `最大ポジション比率を超えています (${params.largestPositionPercent.toFixed(1)}%)`,
        currentValue: params.largestPositionPercent,
        thresholdValue: this.config.maxPositionPercent,
        timestamp,
        actionRequired: 'ポジションサイズを調整してください',
      });
    }
    
    // 相関リスクアラート
    if (params.correlationRisk >= 0.7) {
      alerts.push({
        id: `correlation-${timestamp}`,
        type: 'correlation',
        severity: 'medium',
        message: `ポジション間の相関が高すぎます (${params.correlationRisk.toFixed(2)})`,
        currentValue: params.correlationRisk,
        thresholdValue: this.config.maxCorrelation,
        timestamp,
        actionRequired: '分散を改善してください',
      });
    }
    
    return alerts;
  }

  /**
   * 標準偏差を計算
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
    
    return Math.sqrt(variance);
  }

  /**
   * 相関係数を計算
   */
  private calculateCorrelation(values1: number[], values2: number[]): number {
    const n = Math.min(values1.length, values2.length);
    
    if (n < 2) {
      return 0;
    }
    
    const mean1 = values1.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const mean2 = values2.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * 共分散行列を計算
   */
  calculateCovarianceMatrix(positions: Position[]): number[][] {
    const n = positions.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returns1 = this.returnsHistory.get(positions[i].symbol) || [];
        const returns2 = this.returnsHistory.get(positions[j].symbol) || [];
        
        if (i === j) {
          // 分散
          const variance = Math.pow(this.calculateStandardDeviation(returns1), 2);
          matrix[i][j] = variance;
        } else {
          // 共分散
          const correlation = this.calculateCorrelation(returns1, returns2);
          const stdDev1 = this.calculateStandardDeviation(returns1);
          const stdDev2 = this.calculateStandardDeviation(returns2);
          matrix[i][j] = correlation * stdDev1 * stdDev2;
        }
      }
    }
    
    return matrix;
  }

  /**
   * 価格履歴を更新
   */
  updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    const prices = this.priceHistory.get(symbol)!;
    prices.push(price);
    
    // 履歴を制限
    if (prices.length > this.config.historicalPeriod) {
      prices.shift();
    }
    
    // リターンを計算
    if (prices.length > 1) {
      const returns = this.returnsHistory.get(symbol) || [];
      const lastPrice = prices[prices.length - 2];
      const returnValue = (price - lastPrice) / lastPrice;
      returns.push(returnValue);
      
      if (returns.length > this.config.historicalPeriod) {
        returns.shift();
      }
      
      this.returnsHistory.set(symbol, returns);
    }
  }

  /**
   * ポートフォリオ履歴を更新
   */
  updatePortfolioHistory(totalValue: number): void {
    this.portfolioHistory.push(totalValue);
    
    // 履歴を制限
    if (this.portfolioHistory.length > this.config.historicalPeriod) {
      this.portfolioHistory.shift();
    }
  }

  /**
   * 日次開始値を設定
   */
  setDailyStartValue(value: number): void {
    this.dailyStartValue = value;
  }

  /**
   * 週次開始値を設定
   */
  setWeeklyStartValue(value: number): void {
    this.weeklyStartValue = value;
  }

  /**
   * ピーク値をリセット
   */
  resetPeakValue(): void {
    this.peakValue = 0;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RiskCalculationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * リスク履歴をクリア
   */
  clearHistory(): void {
    this.returnsHistory.clear();
    this.priceHistory.clear();
    this.portfolioHistory = [];
    this.peakValue = 0;
  }
}

/**
 * RealTimeRiskCalculatorのシングルトンインスタンスを作成
 */
export function createRealTimeRiskCalculator(
  config?: Partial<RiskCalculationConfig>
): RealTimeRiskCalculator {
  return new RealTimeRiskCalculator(config);
}

export default RealTimeRiskCalculator;
