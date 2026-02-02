/**
 * DynamicRiskAdjuster.ts
 * 
 * TRADING-023: 動的リスク調整システム
 * Phase 4: 動的リスク調整
 * 
 * ボラティリティベースの動的ポジションサイジング、
 * 市場状況に応じるリスク係数調整、利益確定後のリスク再計算を提供します。
 */

import { Position, Portfolio } from '@/app/types';
import { RealTimeRiskMetrics } from './RealTimeRiskCalculator';

// ============================================================================
// Types
// ============================================================================

/**
 * 市場状況
 */
export type MarketCondition = 'bull' | 'bear' | 'sideways' | 'volatile' | 'stable';

/**
 * 動的リスク調整結果
 */
export interface DynamicRiskAdjustment {
  // リスク係数
  baseRiskPercent: number; // 基本リスク率
  adjustedRiskPercent: number; // 調整後リスク率
  riskMultiplier: number; // リスク乗数
  
  // ポジションサイジング調整
  recommendedPositionSize: number;
  positionSizeMultiplier: number;
  
  // 調整要因
  volatilityAdjustment: number; // ボラティリティ調整
  marketConditionAdjustment: number; // 市場状況調整
  consecutiveLossAdjustment: number; // 連続損失調整
  profitAdjustment: number; // 利益調整
  
  // 理由
  reasons: string[];
}

/**
 * 動的リスク調整設定
 */
export interface DynamicRiskAdjusterConfig {
  // 基本設定
  baseRiskPercent: number; // 2%
  minRiskPercent: number; // 0.5%
  maxRiskPercent: number; // 5%
  
  // ボラティリティ調整
  enableVolatilityAdjustment: boolean;
  lowVolatilityThreshold: number; // 10%
  highVolatilityThreshold: number; // 30%
  volatilityMultiplierMin: number; // 0.5x
  volatilityMultiplierMax: number; // 2.0x
  
  // 市場状況調整
  enableMarketConditionAdjustment: boolean;
  bullMarketMultiplier: number; // 1.2x
  bearMarketMultiplier: number; // 0.6x
  sidewaysMarketMultiplier: number; // 1.0x
  volatileMarketMultiplier: number; // 0.7x
  stableMarketMultiplier: number; // 1.1x
  
  // 連続損失調整
  enableConsecutiveLossAdjustment: boolean;
  lossReductionPerLoss: number; // 0.2 (20% reduction per loss)
  maxConsecutiveLossReduction: number; // 0.5 (50% max reduction)
  
  // 利益調整
  enableProfitAdjustment: boolean;
  profitIncreaseThreshold: number; // 10% profit
  profitIncreaseRate: number; // 0.1 (10% increase per threshold)
  maxProfitIncrease: number; // 0.5 (50% max increase)
}

/**
 * デフォルト動的リスク調整設定
 */
export const DEFAULT_ADJUSTER_CONFIG: DynamicRiskAdjusterConfig = {
  baseRiskPercent: 2,
  minRiskPercent: 0.5,
  maxRiskPercent: 5,
  
  enableVolatilityAdjustment: true,
  lowVolatilityThreshold: 10,
  highVolatilityThreshold: 30,
  volatilityMultiplierMin: 0.5,
  volatilityMultiplierMax: 2.0,
  
  enableMarketConditionAdjustment: true,
  bullMarketMultiplier: 1.2,
  bearMarketMultiplier: 0.6,
  sidewaysMarketMultiplier: 1.0,
  volatileMarketMultiplier: 0.7,
  stableMarketMultiplier: 1.1,
  
  enableConsecutiveLossAdjustment: true,
  lossReductionPerLoss: 0.2,
  maxConsecutiveLossReduction: 0.5,
  
  enableProfitAdjustment: true,
  profitIncreaseThreshold: 10,
  profitIncreaseRate: 0.1,
  maxProfitIncrease: 0.5,
};

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  consecutiveWins: number;
  consecutiveLosses: number;
  totalProfit: number;
  totalProfitPercent: number;
  winRate: number;
  avgWinSize: number;
  avgLossSize: number;
  profitFactor: number;
}

// ============================================================================
// DynamicRiskAdjuster Class
// ============================================================================

export class DynamicRiskAdjuster {
  private config: DynamicRiskAdjusterConfig;
  private performanceHistory: PerformanceMetrics;
  private marketCondition: MarketCondition = 'sideways';

  constructor(config: Partial<DynamicRiskAdjusterConfig> = {}) {
    this.config = { ...DEFAULT_ADJUSTER_CONFIG, ...config };
    this.performanceHistory = {
      consecutiveWins: 0,
      consecutiveLosses: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      winRate: 0.5,
      avgWinSize: 0,
      avgLossSize: 0,
      profitFactor: 1,
    };
  }

  /**
   * ポジションサイズを動的に調整
   */
  adjustPositionSize(
    baseSize: number,
    entryPrice: number,
    portfolio: Portfolio,
    riskMetrics: RealTimeRiskMetrics
  ): DynamicRiskAdjustment {
    let riskMultiplier = 1.0;
    const reasons: string[] = [];
    
    let volatilityAdjustment = 1.0;
    let marketConditionAdjustment = 1.0;
    let consecutiveLossAdjustment = 1.0;
    let profitAdjustment = 1.0;

    // 1. ボラティリティ調整
    if (this.config.enableVolatilityAdjustment) {
      volatilityAdjustment = this.calculateVolatilityAdjustment(riskMetrics.portfolioVolatility);
      riskMultiplier *= volatilityAdjustment;
      
      if (volatilityAdjustment < 1.0) {
        reasons.push(`高ボラティリティのためリスクを${((1 - volatilityAdjustment) * 100).toFixed(0)}%削減`);
      } else if (volatilityAdjustment > 1.0) {
        reasons.push(`低ボラティリティのためリスクを${((volatilityAdjustment - 1) * 100).toFixed(0)}%増加`);
      }
    }

    // 2. 市場状況調整
    if (this.config.enableMarketConditionAdjustment) {
      marketConditionAdjustment = this.getMarketConditionMultiplier();
      riskMultiplier *= marketConditionAdjustment;
      reasons.push(`市場状況(${this.marketCondition})による調整`);
    }

    // 3. 連続損失調整
    if (this.config.enableConsecutiveLossAdjustment && this.performanceHistory.consecutiveLosses > 0) {
      consecutiveLossAdjustment = this.calculateConsecutiveLossAdjustment();
      riskMultiplier *= consecutiveLossAdjustment;
      reasons.push(`連続損失${this.performanceHistory.consecutiveLosses}回のためリスクを削減`);
    }

    // 4. 利益調整
    if (this.config.enableProfitAdjustment && this.performanceHistory.totalProfitPercent > 0) {
      profitAdjustment = this.calculateProfitAdjustment();
      riskMultiplier *= profitAdjustment;
      
      if (profitAdjustment > 1.0) {
        reasons.push(`累積利益${this.performanceHistory.totalProfitPercent.toFixed(1)}%のためリスクを増加`);
      }
    }

    // 調整後のリスク率を計算
    const adjustedRiskPercent = Math.max(
      this.config.minRiskPercent,
      Math.min(this.config.maxRiskPercent, this.config.baseRiskPercent * riskMultiplier)
    );

    // ポジションサイズを計算
    const positionValue = baseSize * entryPrice;
    const totalValue = portfolio.totalValue + portfolio.cash;
    const currentRiskPercent = (positionValue / totalValue) * 100;
    const positionSizeMultiplier = adjustedRiskPercent / currentRiskPercent;
    const recommendedPositionSize = Math.floor(baseSize * positionSizeMultiplier);

    return {
      baseRiskPercent: this.config.baseRiskPercent,
      adjustedRiskPercent,
      riskMultiplier,
      recommendedPositionSize,
      positionSizeMultiplier,
      volatilityAdjustment,
      marketConditionAdjustment,
      consecutiveLossAdjustment,
      profitAdjustment,
      reasons,
    };
  }

  /**
   * ボラティリティに基づく調整を計算
   */
  private calculateVolatilityAdjustment(volatility: number): number {
    if (volatility < this.config.lowVolatilityThreshold) {
      // 低ボラティリティ：リスクを増やす
      const increase = (this.config.lowVolatilityThreshold - volatility) / this.config.lowVolatilityThreshold;
      return 1 + (this.config.volatilityMultiplierMax - 1) * increase;
    } else if (volatility > this.config.highVolatilityThreshold) {
      // 高ボラティリティ：リスクを減らす
      const decrease = Math.min(
        (volatility - this.config.highVolatilityThreshold) / this.config.highVolatilityThreshold,
        1
      );
      return this.config.volatilityMultiplierMin + (1 - this.config.volatilityMultiplierMin) * (1 - decrease);
    }
    
    return 1.0; // 中程度のボラティリティ：調整なし
  }

  /**
   * 市場状況に基づく乗数を取得
   */
  private getMarketConditionMultiplier(): number {
    switch (this.marketCondition) {
      case 'bull':
        return this.config.bullMarketMultiplier;
      case 'bear':
        return this.config.bearMarketMultiplier;
      case 'sideways':
        return this.config.sidewaysMarketMultiplier;
      case 'volatile':
        return this.config.volatileMarketMultiplier;
      case 'stable':
        return this.config.stableMarketMultiplier;
      default:
        return 1.0;
    }
  }

  /**
   * 連続損失に基づく調整を計算
   */
  private calculateConsecutiveLossAdjustment(): number {
    const reduction = this.performanceHistory.consecutiveLosses * this.config.lossReductionPerLoss;
    const maxReduction = this.config.maxConsecutiveLossReduction;
    const actualReduction = Math.min(reduction, maxReduction);
    return 1 - actualReduction;
  }

  /**
   * 利益に基づく調整を計算
   */
  private calculateProfitAdjustment(): number {
    if (this.performanceHistory.totalProfitPercent < this.config.profitIncreaseThreshold) {
      return 1.0;
    }
    
    const thresholds = Math.floor(
      this.performanceHistory.totalProfitPercent / this.config.profitIncreaseThreshold
    );
    const increase = thresholds * this.config.profitIncreaseRate;
    const actualIncrease = Math.min(increase, this.config.maxProfitIncrease);
    
    return 1 + actualIncrease;
  }

  /**
   * 市場状況を更新
   */
  updateMarketCondition(condition: MarketCondition): void {
    this.marketCondition = condition;
  }

  /**
   * 市場状況を自動検出
   */
  detectMarketCondition(riskMetrics: RealTimeRiskMetrics, portfolio: Portfolio): MarketCondition {
    const volatility = riskMetrics.portfolioVolatility;
    const dailyPnLPercent = portfolio.totalValue > 0 
      ? (portfolio.dailyPnL / portfolio.totalValue) * 100 
      : 0;
    
    // ボラティリティベースの判定
    if (volatility > this.config.highVolatilityThreshold) {
      this.marketCondition = 'volatile';
    } else if (volatility < this.config.lowVolatilityThreshold) {
      this.marketCondition = 'stable';
    } else {
      // トレンドベースの判定
      if (dailyPnLPercent > 2) {
        this.marketCondition = 'bull';
      } else if (dailyPnLPercent < -2) {
        this.marketCondition = 'bear';
      } else {
        this.marketCondition = 'sideways';
      }
    }
    
    return this.marketCondition;
  }

  /**
   * パフォーマンスを更新
   */
  updatePerformance(trade: {
    profit: number;
    profitPercent: number;
    isWin: boolean;
  }): void {
    if (trade.isWin) {
      this.performanceHistory.consecutiveWins++;
      this.performanceHistory.consecutiveLosses = 0;
      this.performanceHistory.avgWinSize = 
        (this.performanceHistory.avgWinSize + trade.profitPercent) / 2;
    } else {
      this.performanceHistory.consecutiveLosses++;
      this.performanceHistory.consecutiveWins = 0;
      this.performanceHistory.avgLossSize = 
        (this.performanceHistory.avgLossSize + Math.abs(trade.profitPercent)) / 2;
    }
    
    this.performanceHistory.totalProfit += trade.profit;
  }

  /**
   * 利益確定後のリスク再計算
   */
  recalculateAfterProfit(
    profit: number,
    profitPercent: number,
    portfolio: Portfolio
  ): {
    newBaseRisk: number;
    shouldIncreaseRisk: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let shouldIncreaseRisk = false;
    let newBaseRisk = this.config.baseRiskPercent;

    // 大きな利益確定後はリスクを増やす
    if (profitPercent >= this.config.profitIncreaseThreshold) {
      shouldIncreaseRisk = true;
      const increase = Math.min(
        this.config.profitIncreaseRate,
        this.config.maxProfitIncrease
      );
      newBaseRisk = Math.min(
        this.config.maxRiskPercent,
        this.config.baseRiskPercent * (1 + increase)
      );
      reasons.push(`利益確定(${profitPercent.toFixed(1)}%)によりリスクを${(increase * 100).toFixed(0)}%増加`);
    }

    // 連続勝利中はリスクを段階的に増やす
    if (this.performanceHistory.consecutiveWins >= 3) {
      shouldIncreaseRisk = true;
      const winMultiplier = 1 + (this.performanceHistory.consecutiveWins - 2) * 0.05;
      newBaseRisk = Math.min(
        this.config.maxRiskPercent,
        newBaseRisk * winMultiplier
      );
      reasons.push(`連続勝利${this.performanceHistory.consecutiveWins}回によりリスクを段階的に増加`);
    }

    // ただし、ポートフォリオリスクが高い場合は増加しない
    const totalValue = portfolio.totalValue + portfolio.cash;
    const riskPercent = (portfolio.totalValue / totalValue) * 100;
    if (riskPercent > 70) {
      shouldIncreaseRisk = false;
      reasons.push('ポートフォリオリスクが高いため増加を見送り');
    }

    return {
      newBaseRisk,
      shouldIncreaseRisk,
      reasons,
    };
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceHistory };
  }

  /**
   * 現在の市場状況を取得
   */
  getCurrentMarketCondition(): MarketCondition {
    return this.marketCondition;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<DynamicRiskAdjusterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 設定を取得
   */
  getConfig(): DynamicRiskAdjusterConfig {
    return { ...this.config };
  }

  /**
   * パフォーマンス履歴をリセット
   */
  resetPerformance(): void {
    this.performanceHistory = {
      consecutiveWins: 0,
      consecutiveLosses: 0,
      totalProfit: 0,
      totalProfitPercent: 0,
      winRate: 0.5,
      avgWinSize: 0,
      avgLossSize: 0,
      profitFactor: 1,
    };
  }

  /**
   * すべてをリセット
   */
  reset(): void {
    this.resetPerformance();
    this.marketCondition = 'sideways';
  }
}

/**
 * DynamicRiskAdjusterのシングルトンインスタンスを作成
 */
export function createDynamicRiskAdjuster(
  config?: Partial<DynamicRiskAdjusterConfig>
): DynamicRiskAdjuster {
  return new DynamicRiskAdjuster(config);
}

export default DynamicRiskAdjuster;
