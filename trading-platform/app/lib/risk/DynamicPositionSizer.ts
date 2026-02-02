/**
 * DynamicPositionSizer.ts
 *
 * TRADING-028: 高度な動的ポジションサイジング
 * ボラティリティベース、ケリー基準、ポートフォリオリスク制限を考慮した
 * 高度なポジションサイズ決定システム
 */

import { Position, Portfolio } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface VolatilityMetrics {
  symbol: string;
  dailyVolatility: number; // 日次ボラティリティ
  annualizedVolatility: number; // 年率ボラティリティ
  avgTrueRange: number; // ATR
  beta: number; // 市場に対するベータ
  historicalVolatility: number[]; // 過去60日分のボラティリティ
}

export interface PositionSizingRequest {
  symbol: string;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence: number; // 0-100
  volatility: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
  method?: 'volatility' | 'kelly' | 'risk_parity' | 'fixed' | 'optimal_f';
}

export interface PositionSizingResponse {
  recommendedShares: number;
  positionValue: number;
  riskAmount: number;
  riskPercent: number;
  positionPercent: number;
  reasoning: string[];
  warnings: string[];
  kellyFraction?: number;
  volatilityAdjustment?: number;
  correlationAdjustment?: number;
}

export interface PortfolioRiskLimits {
  maxTotalRisk: number; // ポートフォリオ全体の最大リスク（ドル）
  maxTotalRiskPercent: number; // ポートフォリオ全体の最大リスク（%）
  maxPositionPercent: number; // 単一ポジションの最大比率（%）
  maxSectorPercent: number; // 単一セクターの最大比率（%）
  maxCorrelatedPositions: number; // 高相関ポジションの最大数
  maxLeverage: number; // 最大レバレッジ
}

// ============================================================================
// DynamicPositionSizer Class
// ============================================================================

export class DynamicPositionSizer {
  private portfolio: Portfolio;
  private riskLimits: PortfolioRiskLimits;
  private volatilityCache: Map<string, VolatilityMetrics> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  constructor(portfolio: Portfolio, riskLimits: Partial<PortfolioRiskLimits> = {}) {
    this.portfolio = portfolio;
    this.riskLimits = {
      maxTotalRisk: 1000,
      maxTotalRiskPercent: 2,
      maxPositionPercent: 20,
      maxSectorPercent: 30,
      maxCorrelatedPositions: 3,
      maxLeverage: 2,
      ...riskLimits,
    };
  }

  /**
   * 動的ポジションサイズを計算
   */
  calculatePositionSize(request: PositionSizingRequest): PositionSizingResponse {
    const method = request.method || 'volatility';
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // 基本計算
    let result: PositionSizingResponse;

    switch (method) {
      case 'kelly':
        result = this.calculateKellySizing(request);
        break;
      case 'risk_parity':
        result = this.calculateRiskParitySizing(request);
        break;
      case 'fixed':
        result = this.calculateFixedSizing(request);
        break;
      case 'optimal_f':
        result = this.calculateOptimalFSizing(request);
        break;
      case 'volatility':
      default:
        result = this.calculateVolatilitySizing(request);
        break;
    }

    // ポートフォリオリスク制限を適用
    result = this.applyPortfolioRiskLimits(result, request, reasoning, warnings);

    // 相関調整を適用
    result = this.applyCorrelationAdjustment(result, request, reasoning, warnings);

    // セクター集中度制限を適用
    result = this.applySectorLimits(result, request, reasoning, warnings);

    return result;
  }

  /**
   * ボラティリティベースサイジング
   */
  private calculateVolatilitySizing(request: PositionSizingRequest): PositionSizingResponse {
    const { symbol, entryPrice, stopLoss, volatility, confidence } = request;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const baseRiskPercent = this.riskLimits.maxTotalRiskPercent;
    const baseRiskAmount = portfolioValue * (baseRiskPercent / 100);

    // ボラティリティ調整
    let volatilityFactor = 1.0;
    if (volatility > 0) {
      // 基準ボラティリティを20%と仮定
      const baseVolatility = 20;
      volatilityFactor = baseVolatility / volatility;
      volatilityFactor = Math.max(0.5, Math.min(2.0, volatilityFactor));
    }

    const adjustedRiskAmount = baseRiskAmount * volatilityFactor;

    // ストップロス距離
    let stopLossDistance = 0;
    if (stopLoss) {
      stopLossDistance = Math.abs(entryPrice - stopLoss);
    } else {
      // ATRベースのストップロス
      const volMetrics = this.volatilityCache.get(symbol);
      if (volMetrics) {
        stopLossDistance = volMetrics.avgTrueRange * 2;
      } else {
        // ボラティリティから推定
        stopLossDistance = entryPrice * (volatility / 100) * 2;
      }
    }

    // リスク額から株数を計算
    let recommendedShares = Math.floor(adjustedRiskAmount / stopLossDistance);

    // 信頼度調整
    const confidenceFactor = confidence / 100;
    recommendedShares = Math.floor(recommendedShares * confidenceFactor);

    reasoning.push(
      `基本リスク: ${baseRiskPercent}% ($${baseRiskAmount.toFixed(2)})`,
      `ボラティリティ調整: ${(volatilityFactor * 100).toFixed(0)}%`,
      `ストップロス距離: $${stopLossDistance.toFixed(2)} (${((stopLossDistance / entryPrice) * 100).toFixed(2)}%)`,
      `信頼度: ${confidence}%`
    );

    if (volatility > 40) {
      warnings.push(`非常に高いボラティリティ (${volatility.toFixed(1)}%)`);
    }

    const positionValue = recommendedShares * entryPrice;
    const riskAmount = recommendedShares * stopLossDistance;
    const riskPercent = (riskAmount / portfolioValue) * 100;
    const positionPercent = (positionValue / portfolioValue) * 100;

    return {
      recommendedShares,
      positionValue,
      riskAmount,
      riskPercent,
      positionPercent,
      reasoning,
      warnings,
      volatilityAdjustment: volatilityFactor,
    };
  }

  /**
   * ケリー基準サイジング
   */
  private calculateKellySizing(request: PositionSizingRequest): PositionSizingResponse {
    const { symbol, entryPrice, stopLoss, winRate = 0.5, avgWin = 0.03, avgLoss = 0.02, confidence } = request;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;

    // ケリー公式: f* = (bp - q) / b
    // b = 平均勝ち額 / 平均負け額
    // p = 勝率, q = 負率
    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - p;

    const kellyFraction = (b * p - q) / b;

    // セーフケリー（25%のみ使用）
    const safeKellyFraction = Math.max(0, kellyFraction * 0.25);

    const positionValue = portfolioValue * safeKellyFraction;
    let recommendedShares = Math.floor(positionValue / entryPrice);

    // 信頼度調整
    const confidenceFactor = confidence / 100;
    recommendedShares = Math.floor(recommendedShares * confidenceFactor);

    reasoning.push(
      `勝率: ${(p * 100).toFixed(1)}%`,
      `平均勝ち/負け比率: ${b.toFixed(2)}`,
      `ケリー基準: ${(kellyFraction * 100).toFixed(2)}%`,
      `セーフケリー (25%): ${(safeKellyFraction * 100).toFixed(2)}%`
    );

    if (kellyFraction < 0) {
      warnings.push('ケリー基準が負の値 - このトレードには期待値がありません');
    }

    if (safeKellyFraction > 0.25) {
      warnings.push(`ケリー基準が高い (${(safeKellyFraction * 100).toFixed(1)}%) - ポジションサイズを縮小することを検討`);
    }

    const riskAmount = stopLoss ? recommendedShares * Math.abs(entryPrice - stopLoss) : positionValue * 0.02;
    const riskPercent = (riskAmount / portfolioValue) * 100;
    const positionPercent = (recommendedShares * entryPrice / portfolioValue) * 100;

    return {
      recommendedShares,
      positionValue: recommendedShares * entryPrice,
      riskAmount,
      riskPercent,
      positionPercent,
      reasoning,
      warnings,
      kellyFraction: safeKellyFraction,
    };
  }

  /**
   * リスクパリティサイジング
   */
  private calculateRiskParitySizing(request: PositionSizingRequest): PositionSizingResponse {
    const { symbol, entryPrice, volatility } = request;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const targetRiskPerPosition = portfolioValue * (this.riskLimits.maxTotalRiskPercent / 100);

    // ボラティリティに基づいてポジションサイズを決定
    // ボラティリティが高いほどポジションサイズを小さく
    const annualizedVol = volatility * Math.sqrt(252);
    const dailyVol = volatility;

    const positionValue = targetRiskPerPosition / dailyVol;
    let recommendedShares = Math.floor(positionValue / entryPrice);

    reasoning.push(
      `リスクパリティアプローチ`,
      `目標リスク: $${targetRiskPerPosition.toFixed(2)}`,
      `日次ボラティリティ: ${(dailyVol * 100).toFixed(2)}%`,
      `年率ボラティリティ: ${(annualizedVol * 100).toFixed(2)}%`
    );

    const riskAmount = targetRiskPerPosition;
    const riskPercent = this.riskLimits.maxTotalRiskPercent;
    const positionPercent = (recommendedShares * entryPrice / portfolioValue) * 100;

    return {
      recommendedShares,
      positionValue: recommendedShares * entryPrice,
      riskAmount,
      riskPercent,
      positionPercent,
      reasoning,
      warnings,
    };
  }

  /**
   * 固定サイジング
   */
  private calculateFixedSizing(request: PositionSizingRequest): PositionSizingResponse {
    const { entryPrice, stopLoss, confidence } = request;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const baseRiskPercent = this.riskLimits.maxTotalRiskPercent;
    const baseRiskAmount = portfolioValue * (baseRiskPercent / 100);

    const stopLossDistance = stopLoss ? Math.abs(entryPrice - stopLoss) : entryPrice * 0.02;
    let recommendedShares = Math.floor(baseRiskAmount / stopLossDistance);

    // 信頼度調整
    const confidenceFactor = confidence / 100;
    recommendedShares = Math.floor(recommendedShares * confidenceFactor);

    reasoning.push(
      `固定リスク: ${baseRiskPercent}% ($${baseRiskAmount.toFixed(2)})`,
      `ストップロス距離: $${stopLossDistance.toFixed(2)}`
    );

    const positionValue = recommendedShares * entryPrice;
    const riskAmount = recommendedShares * stopLossDistance;
    const riskPercent = (riskAmount / portfolioValue) * 100;
    const positionPercent = (positionValue / portfolioValue) * 100;

    return {
      recommendedShares,
      positionValue,
      riskAmount,
      riskPercent,
      positionPercent,
      reasoning,
      warnings,
    };
  }

  /**
   * Optimal F サイジング
   */
  private calculateOptimalFSizing(request: PositionSizingRequest): PositionSizingResponse {
    const { entryPrice, winRate = 0.5, avgWin = 0.03, avgLoss = 0.02, confidence } = request;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;

    // 簡略化されたOptimal F計算
    // 実際には履歴データから計算が必要
    const avgTradeReturn = winRate * avgWin - (1 - winRate) * avgLoss;

    let optimalF = 0;
    if (avgTradeReturn > 0) {
      // 分散を推定
      const variance = winRate * Math.pow(avgWin - avgTradeReturn, 2) +
                       (1 - winRate) * Math.pow(avgLoss - avgTradeReturn, 2);
      optimalF = variance > 0 ? avgTradeReturn / variance : 0;
    }

    // セーフティマージン50%
    const safeOptimalF = Math.max(0, optimalF * 0.5);

    const positionValue = portfolioValue * safeOptimalF;
    let recommendedShares = Math.floor(positionValue / entryPrice);

    // 信頼度調整
    const confidenceFactor = confidence / 100;
    recommendedShares = Math.floor(recommendedShares * confidenceFactor);

    reasoning.push(
      `Optimal F: ${(optimalF * 100).toFixed(2)}%`,
      `セーフOptimal F (50%): ${(safeOptimalF * 100).toFixed(2)}%`,
      `平均トレードリターン: ${(avgTradeReturn * 100).toFixed(2)}%`
    );

    if (optimalF <= 0) {
      warnings.push('期待値が負またはゼロ - ポジションを取らないでください');
    }

    const riskAmount = positionValue * 0.02; // 推定リスク
    const riskPercent = (riskAmount / portfolioValue) * 100;
    const positionPercent = (positionValue / portfolioValue) * 100;

    return {
      recommendedShares,
      positionValue,
      riskAmount,
      riskPercent,
      positionPercent,
      reasoning,
      warnings,
    };
  }

  /**
   * ポートフォリオリスク制限を適用
   */
  private applyPortfolioRiskLimits(
    result: PositionSizingResponse,
    request: PositionSizingRequest,
    reasoning: string[],
    warnings: string[]
  ): PositionSizingResponse {
    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const maxPositionValue = portfolioValue * (this.riskLimits.maxPositionPercent / 100);
    const maxShares = Math.floor(maxPositionValue / request.entryPrice);

    if (result.recommendedShares > maxShares) {
      reasoning.push(`最大ポジション制限: ${this.riskLimits.maxPositionPercent}%`);
      result.recommendedShares = maxShares;
      result.positionValue = maxShares * request.entryPrice;
      result.riskAmount = maxShares * (result.riskAmount / result.recommendedShares);
      result.positionPercent = (result.positionValue / portfolioValue) * 100;
    }

    return result;
  }

  /**
   * 相関調整を適用
   */
  private applyCorrelationAdjustment(
    result: PositionSizingResponse,
    request: PositionSizingRequest,
    reasoning: string[],
    warnings: string[]
  ): PositionSizingResponse {
    const symbolCorrelations = this.correlationMatrix.get(request.symbol);
    if (!symbolCorrelations || this.portfolio.positions.length === 0) {
      return result;
    }

    // 既存ポジションとの高相関をチェック
    let highCorrelationCount = 0;
    let totalCorrelation = 0;

    for (const position of this.portfolio.positions) {
      const correlation = symbolCorrelations.get(position.symbol);
      if (correlation !== undefined) {
        totalCorrelation += Math.abs(correlation);
        if (Math.abs(correlation) > 0.7) {
          highCorrelationCount++;
        }
      }
    }

    if (highCorrelationCount >= this.riskLimits.maxCorrelatedPositions) {
      const adjustmentFactor = 0.5;
      result.recommendedShares = Math.floor(result.recommendedShares * adjustmentFactor);
      result.positionValue = result.recommendedShares * request.entryPrice;
      result.riskAmount = result.riskAmount * adjustmentFactor;
      result.positionPercent = result.positionPercent * adjustmentFactor;
      result.correlationAdjustment = adjustmentFactor;

      reasoning.push(`高相関ポジションが多いため縮小 (${highCorrelationCount}個)`);
      warnings.push(`${highCorrelationCount}個の高相関ポジションが存在`);
    }

    return result;
  }

  /**
   * セクター制限を適用
   */
  private applySectorLimits(
    result: PositionSizingResponse,
    request: PositionSizingRequest,
    reasoning: string[],
    warnings: string[]
  ): PositionSizingResponse {
    // セクター情報がない場合はスキップ
    const symbolSector = this.getSymbolSector(request.symbol);
    if (!symbolSector) {
      return result;
    }

    // 同一セクターの既存ポジションを計算
    let sectorExposure = 0;
    for (const position of this.portfolio.positions) {
      const sector = this.getSymbolSector(position.symbol);
      if (sector === symbolSector) {
        sectorExposure += (position.currentPrice * position.quantity);
      }
    }

    const portfolioValue = this.portfolio.totalValue + this.portfolio.cash;
    const currentSectorPercent = (sectorExposure / portfolioValue) * 100;
    const newSectorPercent = currentSectorPercent + result.positionPercent;

    if (newSectorPercent > this.riskLimits.maxSectorPercent) {
      const allowedPercent = this.riskLimits.maxSectorPercent - currentSectorPercent;
      const adjustmentFactor = allowedPercent / result.positionPercent;

      result.recommendedShares = Math.floor(result.recommendedShares * adjustmentFactor);
      result.positionValue = result.recommendedShares * request.entryPrice;
      result.riskAmount = result.riskAmount * adjustmentFactor;
      result.positionPercent = (result.positionValue / portfolioValue) * 100;

      reasoning.push(`セクター制限: ${symbolSector} (${this.riskLimits.maxSectorPercent}%)`);
      warnings.push(`セクター集中度が高い (${symbolSector}: ${currentSectorPercent.toFixed(1)}%)`);
    }

    return result;
  }

  /**
   * ボラティリティメトリクスを更新
   */
  updateVolatilityMetrics(metrics: VolatilityMetrics): void {
    this.volatilityCache.set(metrics.symbol, metrics);
  }

  /**
   * 相関係数を更新
   */
  updateCorrelation(symbol1: string, symbol2: string, correlation: number): void {
    if (!this.correlationMatrix.has(symbol1)) {
      this.correlationMatrix.set(symbol1, new Map());
    }
    this.correlationMatrix.get(symbol1)!.set(symbol2, correlation);

    // 対称性を維持
    if (!this.correlationMatrix.has(symbol2)) {
      this.correlationMatrix.set(symbol2, new Map());
    }
    this.correlationMatrix.get(symbol2)!.set(symbol1, correlation);
  }

  /**
   * ポートフォリオを更新
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }

  /**
   * リスク制限を更新
   */
  updateRiskLimits(limits: Partial<PortfolioRiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...limits };
  }

  /**
   * シンボルのセクターを取得（簡略版）
   */
  private getSymbolSector(symbol: string): string | null {
    // 実際の実装ではセクター情報をデータベースやAPIから取得
    // ここでは簡略化のためハードコード
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'JPM': 'Finance',
      'BAC': 'Finance',
      'JNJ': 'Healthcare',
      'PFE': 'Healthcare',
    };

    return sectorMap[symbol] || null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDynamicPositionSizer(
  portfolio: Portfolio,
  riskLimits?: Partial<PortfolioRiskLimits>
): DynamicPositionSizer {
  return new DynamicPositionSizer(portfolio, riskLimits);
}

export default DynamicPositionSizer;
