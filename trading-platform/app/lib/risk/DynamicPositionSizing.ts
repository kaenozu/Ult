/**
 * Dynamic Position Sizing
 * 
 * TRADING-003: 動的ポジションサイジングの実装
 * 市場ボラティリティ、個別銘柄リスク、ポートフォリオ全体のリスクを考慮した
 * 動的なポジションサイズ決定システム
 */

import { MarketData, Position, Portfolio } from '@/app/types';
import { PositionSizingConfig, SizingResult, RiskMetrics } from '@/app/types/risk';

export class DynamicPositionSizing {
  private config: PositionSizingConfig;
  private portfolio: Portfolio;
  private recentVolatility: Map<string, number> = new Map();
  private correlations: Map<string, Map<string, number>> = new Map();

  constructor(config: PositionSizingConfig, portfolio: Portfolio) {
    this.config = config;
    this.portfolio = portfolio;
  }

  /**
   * 動的ポジションサイズを計算
   */
  calculatePositionSize(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    marketData: MarketData,
    confidence: number
  ): SizingResult {
    const reasons: string[] = [];
    
    // 基本的なリスク計算
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    const stopLossPercent = stopLossDistance / entryPrice;
    
    // 1取引あたりのリスク額
    const riskAmount = this.portfolio.totalValue * (this.config.riskPerTrade / 100);
    
    // 基本ポジションサイズ
    let positionSize = riskAmount / stopLossDistance;
    reasons.push(`Base size: ${positionSize.toFixed(2)} shares (${this.config.riskPerTrade}% risk)`);
    
    // ボラティリティ調整
    if (this.config.volatilityAdjustment) {
      const volatility = this.recentVolatility.get(symbol) || 0.02;
      const volatilityFactor = this.calculateVolatilityAdjustment(volatility);
      positionSize *= volatilityFactor;
      reasons.push(`Volatility adjustment: ${(volatilityFactor * 100).toFixed(1)}% (vol: ${(volatility * 100).toFixed(2)}%)`);
    }
    
    // 相関調整
    if (this.config.correlationAdjustment) {
      const correlationFactor = this.calculateCorrelationAdjustment(symbol);
      positionSize *= correlationFactor;
      reasons.push(`Correlation adjustment: ${(correlationFactor * 100).toFixed(1)}%`);
    }
    
    // 信頼度調整
    const confidenceFactor = this.calculateConfidenceAdjustment(confidence);
    positionSize *= confidenceFactor;
    reasons.push(`Confidence adjustment: ${(confidenceFactor * 100).toFixed(1)}% (confidence: ${confidence.toFixed(0)}%)`);
    
    // ポジションサイズ制限
    const maxPositionValue = this.portfolio.totalValue * (this.config.maxPositionPercent / 100);
    const maxShares = maxPositionValue / entryPrice;
    
    if (positionSize > maxShares) {
      positionSize = maxShares;
      reasons.push(`Limited to max position: ${this.config.maxPositionPercent}% of portfolio`);
    }
    
    // 最大リスク制限
    const totalRisk = positionSize * stopLossDistance;
    if (totalRisk > this.config.maxRisk) {
      positionSize = this.config.maxRisk / stopLossDistance;
      reasons.push(`Limited by max risk: $${this.config.maxRisk.toFixed(2)}`);
    }
    
    return {
      recommendedSize: Math.floor(positionSize),
      riskAmount: Math.floor(positionSize) * stopLossDistance,
      stopLossDistance,
      confidence,
      reasons
    };
  }

  /**
   * ボラティリティベースの調整係数を計算
   */
  private calculateVolatilityAdjustment(volatility: number): number {
    // 基準ボラティリティ（2%）に対する調整
    const baseVolatility = 0.02;
    const volatilityRatio = baseVolatility / Math.max(volatility, 0.005);
    
    // 調整係数を0.5〜1.5の範囲に制限
    return Math.max(0.5, Math.min(1.5, volatilityRatio));
  }

  /**
   * 相関ベースの調整係数を計算
   */
  private calculateCorrelationAdjustment(symbol: string): number {
    const symbolCorrelations = this.correlations.get(symbol);
    if (!symbolCorrelations || this.portfolio.positions.length === 0) {
      return 1.0;
    }
    
    // 既存ポジションとの平均相関を計算
    let totalCorrelation = 0;
    let count = 0;
    
    for (const position of this.portfolio.positions) {
      const correlation = symbolCorrelations.get(position.symbol) || 0;
      totalCorrelation += Math.abs(correlation);
      count++;
    }
    
    const avgCorrelation = count > 0 ? totalCorrelation / count : 0;
    
    // 高相関の場合はポジションサイズを縮小
    // 相関が0.5以上で段階的に縮小
    if (avgCorrelation > 0.5) {
      return 1.0 - ((avgCorrelation - 0.5) * 0.5);
    }
    
    return 1.0;
  }

  /**
   * 信頼度ベースの調整係数を計算
   */
  private calculateConfidenceAdjustment(confidence: number): number {
    // 信頼度が50%以下の場合は大幅に縮小
    if (confidence <= 50) {
      return 0.5;
    }
    
    // 50%〜100%で線形に増加（0.5〜1.0）
    return 0.5 + ((confidence - 50) / 100);
  }

  /**
   * ボラティリティを更新
   */
  updateVolatility(symbol: string, volatility: number): void {
    this.recentVolatility.set(symbol, volatility);
  }

  /**
   * 相関を更新
   */
  updateCorrelation(symbol1: string, symbol2: string, correlation: number): void {
    if (!this.correlations.has(symbol1)) {
      this.correlations.set(symbol1, new Map());
    }
    this.correlations.get(symbol1)!.set(symbol2, correlation);
    
    // 対称性を保つ
    if (!this.correlations.has(symbol2)) {
      this.correlations.set(symbol2, new Map());
    }
    this.correlations.get(symbol2)!.set(symbol1, correlation);
  }

  /**
   * Kelly基準によるポジションサイズ計算
   */
  calculateKellyCriterion(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    entryPrice: number
  ): SizingResult {
    // Kelly formula: f* = (p * b - q) / b
    // p = 勝率, q = 負率, b = 平均勝ち額 / 平均負け額
    const p = winRate;
    const q = 1 - winRate;
    const b = avgWin / avgLoss;
    
    const kellyFraction = (p * b - q) / b;
    
    // 安全のため、Kelly基準の25%のみを使用
    const safeFraction = Math.max(0, kellyFraction * 0.25);
    
    const positionValue = this.portfolio.totalValue * safeFraction;
    const recommendedSize = Math.floor(positionValue / entryPrice);
    
    return {
      recommendedSize,
      riskAmount: positionValue * (avgLoss / avgWin),
      stopLossDistance: entryPrice * (avgLoss / avgWin),
      confidence: 75, // Kelly基準は統計的に信頼性が高い
      reasons: [
        `Kelly criterion: ${(kellyFraction * 100).toFixed(2)}%`,
        `Safe fraction (25%): ${(safeFraction * 100).toFixed(2)}%`,
        `Win rate: ${(winRate * 100).toFixed(1)}%, Win/Loss ratio: ${b.toFixed(2)}`
      ]
    };
  }

  /**
   * ポートフォリオリスクパリティに基づくサイズ計算
   */
  calculateRiskParitySizing(
    symbol: string,
    entryPrice: number,
    assetVolatility: number
  ): SizingResult {
    // すべてのポジションが等しいリスクを持つように調整
    const targetRisk = this.portfolio.totalValue * (this.config.riskPerTrade / 100);
    
    // ボラティリティに基づいてポジションサイズを逆比例させる
    const positionValue = targetRisk / assetVolatility;
    const recommendedSize = Math.floor(positionValue / entryPrice);
    
    return {
      recommendedSize,
      riskAmount: targetRisk,
      stopLossDistance: entryPrice * assetVolatility,
      confidence: 80,
      reasons: [
        `Risk parity allocation`,
        `Asset volatility: ${(assetVolatility * 100).toFixed(2)}%`,
        `Target risk: $${targetRisk.toFixed(2)}`
      ]
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<PositionSizingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * ポートフォリオを更新
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }
}

export const createDynamicPositionSizing = (
  config: PositionSizingConfig,
  portfolio: Portfolio
): DynamicPositionSizing => {
  return new DynamicPositionSizing(config, portfolio);
};
