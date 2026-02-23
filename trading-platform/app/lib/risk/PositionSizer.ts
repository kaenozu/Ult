/**
 * PositionSizer.ts
 * 
 * ポジションサイズ計算の専門クラス
 */

import { PositionSizingParams, PositionSizingResult, RiskLimits } from './types';

export class PositionSizer {
  constructor(private limits: RiskLimits) {}

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
    const optimalF = 0.25; 
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
    const delta = 0.1; 
    const currentEquity = params.capital;
    const basePosition = Math.floor((currentEquity * 0.02) / params.entryPrice); // 2% base
    
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
    const volatility = params.volatility || 20; 
    const targetVolatility = 10; 
    
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
   * リスク制限を更新
   */
  updateLimits(limits: RiskLimits): void {
    this.limits = limits;
  }
}
