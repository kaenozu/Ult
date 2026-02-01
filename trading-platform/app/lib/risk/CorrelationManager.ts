/**
 * Correlation Manager
 * 
 * TRADING-003: ポートフォリオ相関管理の強化
 * 銘柄間の相関分析、集中リスク検出、ヘッジ戦略の最適化
 */

import { Position, Portfolio, OHLCV } from '@/app/types';
import {
  CorrelationAnalysis,
  CorrelationMatrix,
  ConcentrationRisk,
  HedgeRecommendation
} from '@/app/types/risk';

export class CorrelationManager {
  private priceHistory: Map<string, number[]> = new Map();
  private correlationCache: Map<string, Map<string, number>> = new Map();
  private lastUpdate: Date = new Date();

  /**
   * 相関行列を計算
   */
  calculateCorrelationMatrix(symbols: string[]): CorrelationMatrix {
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = this.calculatePairwiseCorrelation(
            symbols[i],
            symbols[j]
          );
        }
      }
    }

    return {
      symbols,
      matrix,
      timestamp: new Date()
    };
  }

  /**
   * 2つの銘柄間の相関を計算
   */
  calculatePairwiseCorrelation(symbol1: string, symbol2: string): number {
    // キャッシュをチェック
    const cachedCorrelation = this.getCachedCorrelation(symbol1, symbol2);
    if (cachedCorrelation !== null) {
      return cachedCorrelation;
    }

    const prices1 = this.priceHistory.get(symbol1);
    const prices2 = this.priceHistory.get(symbol2);

    if (!prices1 || !prices2 || prices1.length < 2 || prices2.length < 2) {
      return 0;
    }

    // 収益率を計算
    const returns1 = this.calculateReturns(prices1);
    const returns2 = this.calculateReturns(prices2);

    // 相関係数を計算
    const correlation = this.pearsonCorrelation(returns1, returns2);

    // キャッシュに保存
    this.setCachedCorrelation(symbol1, symbol2, correlation);

    return correlation;
  }

  /**
   * 集中リスクを検出
   */
  detectConcentrationRisk(
    portfolio: Portfolio,
    threshold: number = 0.25
  ): ConcentrationRisk[] {
    const risks: ConcentrationRisk[] = [];
    const totalValue = portfolio.totalValue;

    if (totalValue === 0) {
      return risks;
    }

    // 各ポジションの重量を計算
    for (const position of portfolio.positions) {
      const positionValue = position.currentPrice * position.quantity;
      const weight = positionValue / totalValue;

      if (weight > threshold) {
        risks.push({
          symbol: position.symbol,
          weight,
          sector: this.getSector(position.symbol),
          riskScore: this.calculateRiskScore(weight, threshold)
        });
      }
    }

    // セクター集中リスクもチェック
    const sectorWeights = this.calculateSectorWeights(portfolio);
    for (const [sector, weight] of sectorWeights.entries()) {
      if (weight > threshold) {
        risks.push({
          symbol: `SECTOR:${sector}`,
          weight,
          sector,
          riskScore: this.calculateRiskScore(weight, threshold)
        });
      }
    }

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * ヘッジ推奨を生成
   */
  generateHedgeRecommendations(
    portfolio: Portfolio,
    availableSymbols: string[]
  ): HedgeRecommendation[] {
    const recommendations: HedgeRecommendation[] = [];

    // 高リスクポジションを特定
    const highRiskPositions = this.identifyHighRiskPositions(portfolio);

    for (const position of highRiskPositions) {
      // 負の相関を持つ銘柄を探す
      const hedges = this.findNegativelyCorrelatedAssets(
        position.symbol,
        availableSymbols
      );

      for (const hedge of hedges) {
        const correlation = this.calculatePairwiseCorrelation(
          position.symbol,
          hedge.symbol
        );

        if (correlation < -0.3) {
          recommendations.push({
            primarySymbol: position.symbol,
            hedgeSymbol: hedge.symbol,
            hedgeRatio: this.calculateOptimalHedgeRatio(
              position.symbol,
              hedge.symbol,
              correlation
            ),
            correlation,
            reasoning: this.generateHedgeReasoning(
              position.symbol,
              hedge.symbol,
              correlation
            )
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * 相関分析を実行
   */
  analyzeCorrelation(
    symbol1: string,
    symbol2: string,
    timeframe: string = '30d'
  ): CorrelationAnalysis {
    const correlation = this.calculatePairwiseCorrelation(symbol1, symbol2);
    const significance = this.calculateSignificance(symbol1, symbol2);

    return {
      symbol1,
      symbol2,
      correlation,
      timeframe,
      significance
    };
  }

  /**
   * 価格履歴を更新
   */
  updatePriceHistory(symbol: string, prices: number[]): void {
    this.priceHistory.set(symbol, prices);
    this.invalidateCorrelationCache(symbol);
  }

  /**
   * OHLCV データから価格履歴を更新
   */
  updateFromOHLCV(symbol: string, ohlcv: OHLCV[]): void {
    const closePrices = ohlcv.map(candle => candle.close);
    this.updatePriceHistory(symbol, closePrices);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * 収益率を計算
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  /**
   * Pearson相関係数を計算
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * キャッシュから相関を取得
   */
  private getCachedCorrelation(symbol1: string, symbol2: string): number | null {
    const key1 = `${symbol1}-${symbol2}`;
    const key2 = `${symbol2}-${symbol1}`;

    const cache1 = this.correlationCache.get(symbol1);
    if (cache1?.has(symbol2)) {
      return cache1.get(symbol2)!;
    }

    const cache2 = this.correlationCache.get(symbol2);
    if (cache2?.has(symbol1)) {
      return cache2.get(symbol1)!;
    }

    return null;
  }

  /**
   * 相関をキャッシュに保存
   */
  private setCachedCorrelation(
    symbol1: string,
    symbol2: string,
    correlation: number
  ): void {
    if (!this.correlationCache.has(symbol1)) {
      this.correlationCache.set(symbol1, new Map());
    }
    this.correlationCache.get(symbol1)!.set(symbol2, correlation);
  }

  /**
   * 相関キャッシュを無効化
   */
  private invalidateCorrelationCache(symbol: string): void {
    this.correlationCache.delete(symbol);
    for (const [key, cache] of this.correlationCache.entries()) {
      cache.delete(symbol);
    }
  }

  /**
   * セクターを取得（簡易実装）
   */
  private getSector(symbol: string): string {
    // TODO: 実際のセクターマッピングを実装
    return 'Unknown';
  }

  /**
   * リスクスコアを計算
   */
  private calculateRiskScore(weight: number, threshold: number): number {
    return ((weight - threshold) / threshold) * 100;
  }

  /**
   * セクター重量を計算
   */
  private calculateSectorWeights(portfolio: Portfolio): Map<string, number> {
    const sectorWeights = new Map<string, number>();
    const totalValue = portfolio.totalValue;

    for (const position of portfolio.positions) {
      const sector = this.getSector(position.symbol);
      const positionValue = position.currentPrice * position.quantity;
      const weight = positionValue / totalValue;

      sectorWeights.set(
        sector,
        (sectorWeights.get(sector) || 0) + weight
      );
    }

    return sectorWeights;
  }

  /**
   * 高リスクポジションを特定
   */
  private identifyHighRiskPositions(portfolio: Portfolio): Position[] {
    const totalValue = portfolio.totalValue;
    const threshold = 0.15; // 15%以上のポジション

    return portfolio.positions.filter(position => {
      const weight = (position.currentPrice * position.quantity) / totalValue;
      return weight > threshold;
    });
  }

  /**
   * 負の相関を持つ資産を探す
   */
  private findNegativelyCorrelatedAssets(
    symbol: string,
    candidates: string[]
  ): Array<{ symbol: string; correlation: number }> {
    const results: Array<{ symbol: string; correlation: number }> = [];

    for (const candidate of candidates) {
      if (candidate === symbol) continue;

      const correlation = this.calculatePairwiseCorrelation(symbol, candidate);
      if (correlation < 0) {
        results.push({ symbol: candidate, correlation });
      }
    }

    return results.sort((a, b) => a.correlation - b.correlation);
  }

  /**
   * 最適ヘッジ比率を計算
   */
  private calculateOptimalHedgeRatio(
    primarySymbol: string,
    hedgeSymbol: string,
    correlation: number
  ): number {
    // 簡易的な実装：相関に基づいてヘッジ比率を決定
    return Math.abs(correlation);
  }

  /**
   * ヘッジの理由を生成
   */
  private generateHedgeReasoning(
    primarySymbol: string,
    hedgeSymbol: string,
    correlation: number
  ): string {
    return `${hedgeSymbol} shows a negative correlation of ${correlation.toFixed(2)} with ${primarySymbol}, making it a suitable hedge.`;
  }

  /**
   * 相関の統計的有意性を計算
   */
  private calculateSignificance(symbol1: string, symbol2: string): number {
    const prices1 = this.priceHistory.get(symbol1);
    const prices2 = this.priceHistory.get(symbol2);

    if (!prices1 || !prices2) return 0;

    const n = Math.min(prices1.length, prices2.length);
    const correlation = this.calculatePairwiseCorrelation(symbol1, symbol2);

    // t統計量を計算
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

    // 簡易的な有意性スコア（0-1）
    return Math.min(1, Math.abs(t) / 3);
  }
}

export const createCorrelationManager = (): CorrelationManager => {
  return new CorrelationManager();
};
