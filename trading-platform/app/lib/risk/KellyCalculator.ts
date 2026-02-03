/**
 * KellyCalculator.ts
 * 
 * Kelly Criterionに基づく最適ポジションサイジングの実装
 * 
 * Kelly Formula: f* = (p * b - q) / b
 * where:
 *   f* = Kelly percentage (optimal fraction to bet)
 *   p = probability of winning (win rate)
 *   q = probability of losing (1 - p)
 *   b = win/loss ratio (average win / average loss)
 */

import {
  KellyParams,
  KellyResult,
  PositionSizeRecommendation,
  VolatilityAdjustment,
  ConcentrationLimits,
} from '@/app/types/risk';

/**
 * デフォルトの設定値
 */
export const DEFAULT_KELLY_FRACTION = 0.5; // ½-Kelly (安全のため)
export const DEFAULT_CONCENTRATION_LIMITS: ConcentrationLimits = {
  maxSinglePosition: 0.20,  // 20%
  maxSectorExposure: 0.40,   // 40%
  minPositions: 5,
  maxPositions: 10,
};

/**
 * Kelly Criterion計算とリスク管理を行うクラス
 */
export class KellyCalculator {
  private kellyFraction: number;
  private concentrationLimits: ConcentrationLimits;

  constructor(
    kellyFraction: number = DEFAULT_KELLY_FRACTION,
    concentrationLimits: ConcentrationLimits = DEFAULT_CONCENTRATION_LIMITS
  ) {
    this.kellyFraction = kellyFraction;
    this.concentrationLimits = concentrationLimits;
  }

  /**
   * Kelly Criterionに基づく最適ポジションサイズを計算
   * 
   * @param params Kelly計算パラメータ
   * @returns Kelly計算結果
   */
  calculate(params: KellyParams): KellyResult {
    // バリデーション
    const validation = this.validateParams(params);
    if (!validation.valid) {
      return {
        kellyPercentage: 0,
        recommendedSize: 0,
        riskLevel: 'HIGH',
        confidence: 0,
        warnings: validation.errors,
      };
    }

    const { winRate, avgWin, avgLoss, portfolioValue } = params;
    const kellyFraction = params.kellyFraction ?? this.kellyFraction;

    // Kelly Formula: f* = (p * b - q) / b
    const p = winRate;
    const q = 1 - winRate;
    const b = Math.abs(avgWin / avgLoss); // win/loss ratio

    // Kelly percentage calculation
    let kellyPercentage = (p * b - q) / b;

    // Kelly percentageが負の場合はトレードすべきでない
    if (kellyPercentage <= 0) {
      return {
        kellyPercentage: 0,
        recommendedSize: 0,
        riskLevel: 'HIGH',
        confidence: 0,
        warnings: ['Negative Kelly percentage - expected value is negative, do not trade'],
      };
    }

    // Fractional Kellyを適用（リスク軽減）
    kellyPercentage *= kellyFraction;

    // 最大20%に制限（極端なレバレッジ防止）
    kellyPercentage = Math.min(kellyPercentage, 0.20);

    // 推奨ポジションサイズを計算
    const recommendedSize = portfolioValue * kellyPercentage;

    // リスクレベルを判定
    const riskLevel = this.determineRiskLevel(kellyPercentage, winRate);

    // 信頼度を計算（勝率とサンプル数に基づく）
    const confidence = this.calculateConfidence(winRate, b);

    // 警告メッセージ
    const warnings = this.generateWarnings(kellyPercentage, winRate, b);

    return {
      kellyPercentage,
      recommendedSize,
      riskLevel,
      confidence,
      warnings,
    };
  }

  /**
   * ATRに基づくボラティリティ調整を適用
   * 
   * @param baseSize 基本ポジションサイズ
   * @param actualATR 実際のATR
   * @param targetATR 目標ATR（デフォルト: 2%）
   * @returns 調整後のサイズとボラティリティ調整情報
   */
  adjustForVolatility(
    baseSize: number,
    actualATR: number,
    targetATR: number = 0.02
  ): { adjustedSize: number; adjustment: VolatilityAdjustment } {
    // ボラティリティが高い場合はサイズを縮小
    const adjustmentFactor = targetATR / actualATR;
    const cappedFactor = Math.min(Math.max(adjustmentFactor, 0.5), 2.0); // 0.5x - 2.0x に制限
    const adjustedSize = baseSize * cappedFactor;

    return {
      adjustedSize,
      adjustment: {
        actualVolatility: actualATR,
        targetVolatility: targetATR,
        adjustmentFactor: cappedFactor,
      },
    };
  }

  /**
   * 集中度制限を適用してポジションサイズを調整
   * 
   * @param symbol 銘柄シンボル
   * @param adjustedSize 調整後サイズ
   * @param portfolioValue ポートフォリオ総額
   * @param currentPositions 現在のポジション（オプション）
   * @returns 最終的なポジションサイズ推奨
   */
  applyConcentrationLimits(
    symbol: string,
    adjustedSize: number,
    portfolioValue: number,
    currentPositions?: { symbol: string; value: number; sector?: string }[]
  ): PositionSizeRecommendation {
    const appliedLimits: string[] = [];
    let finalSize = adjustedSize;

    // 単一銘柄の制限を適用
    const maxSingleSize = portfolioValue * this.concentrationLimits.maxSinglePosition;
    if (finalSize > maxSingleSize) {
      finalSize = maxSingleSize;
      appliedLimits.push(`Single position limit: ${this.concentrationLimits.maxSinglePosition * 100}%`);
    }

    // セクター集中度チェック（現在のポジション情報がある場合）
    if (currentPositions && currentPositions.length > 0) {
      // 同一セクターの総額を計算（簡略版 - 実装では実際のセクター情報を使用）
      const currentExposure = currentPositions.reduce((sum, pos) => sum + pos.value, 0);
      const maxSectorSize = portfolioValue * this.concentrationLimits.maxSectorExposure;
      
      if (currentExposure + finalSize > maxSectorSize) {
        finalSize = Math.max(0, maxSectorSize - currentExposure);
        appliedLimits.push(`Sector limit: ${this.concentrationLimits.maxSectorExposure * 100}%`);
      }
    }

    // リスクレベルを再評価（ポジションサイズのみで判定）
    const positionPercentage = finalSize / portfolioValue;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (positionPercentage > 0.15) {
      riskLevel = 'HIGH';
    } else if (positionPercentage > 0.08) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      symbol,
      baseSize: adjustedSize,
      adjustedSize,
      finalSize,
      riskLevel,
      constraints: {
        singlePositionLimit: this.concentrationLimits.maxSinglePosition * 100,
        sectorLimit: this.concentrationLimits.maxSectorExposure * 100,
        appliedLimits,
      },
    };
  }

  /**
   * 完全な推奨計算（Kelly + Volatility + Concentration）
   * 
   * @param params Kelly計算パラメータ
   * @param symbol 銘柄シンボル
   * @param atr ATR値（オプション）
   * @param currentPositions 現在のポジション（オプション）
   * @returns 完全なポジションサイズ推奨
   */
  getRecommendation(
    params: KellyParams,
    symbol: string,
    atr?: number,
    currentPositions?: { symbol: string; value: number; sector?: string }[]
  ): PositionSizeRecommendation & { kellyResult: KellyResult } {
    // 1. Kelly計算
    const kellyResult = this.calculate(params);
    let currentSize = kellyResult.recommendedSize;

    // 2. ボラティリティ調整（ATRが提供されている場合）
    let volatilityAdjustment: VolatilityAdjustment | undefined;
    if (atr !== undefined && atr > 0) {
      const adjusted = this.adjustForVolatility(currentSize, atr);
      currentSize = adjusted.adjustedSize;
      volatilityAdjustment = adjusted.adjustment;
    }

    // 3. 集中度制限
    const recommendation = this.applyConcentrationLimits(
      symbol,
      currentSize,
      params.portfolioValue,
      currentPositions
    );

    return {
      ...recommendation,
      volatilityAdjustment,
      kellyResult,
    };
  }

  /**
   * パラメータのバリデーション
   */
  private validateParams(params: KellyParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.winRate < 0 || params.winRate > 1) {
      errors.push('Win rate must be between 0 and 1');
    }

    if (params.avgWin <= 0) {
      errors.push('Average win must be positive');
    }

    if (params.avgLoss <= 0) {
      errors.push('Average loss must be positive');
    }

    if (params.portfolioValue <= 0) {
      errors.push('Portfolio value must be positive');
    }

    if (params.kellyFraction !== undefined) {
      if (params.kellyFraction <= 0 || params.kellyFraction > 1) {
        errors.push('Kelly fraction must be between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * リスクレベルを判定
   */
  private determineRiskLevel(
    positionPercentage: number,
    winRate: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    // 高リスク: ポジションサイズが大きいか、勝率が低い
    if (positionPercentage > 0.15 || winRate < 0.45) {
      return 'HIGH';
    }
    
    // 中リスク: 中程度のポジションサイズまたは勝率
    if (positionPercentage > 0.08 || winRate < 0.55) {
      return 'MEDIUM';
    }
    
    // 低リスク: 小さなポジションサイズで高い勝率
    return 'LOW';
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(winRate: number, winLossRatio: number): number {
    // 勝率が50%に近く、リスクリワード比が良好な場合に高い信頼度
    // 低い勝率は信頼度を大きく下げる
    const winRateScore = winRate >= 0.5 
      ? 1 - Math.abs(winRate - 0.5) * 2  // 50%以上は50%で最大
      : winRate * 1.0; // 50%未満は線形スコア (0.5で0.5まで)
    const ratioScore = Math.min(winLossRatio / 2, 1); // 2:1以上で最大
    
    // 低勝率の場合は勝率をより重視
    const winRateWeight = winRate < 0.45 ? 0.75 : 0.6;
    const ratioWeight = 1 - winRateWeight;
    
    return (winRateScore * winRateWeight + ratioScore * ratioWeight);
  }

  /**
   * 警告メッセージを生成
   */
  private generateWarnings(
    kellyPercentage: number,
    winRate: number,
    winLossRatio: number
  ): string[] {
    const warnings: string[] = [];

    if (kellyPercentage > 0.15) {
      warnings.push('High position size - consider reducing exposure');
    }

    if (winRate < 0.45) {
      warnings.push('Low win rate - exercise caution');
    }

    if (winLossRatio < 1.5) {
      warnings.push('Low win/loss ratio - risk/reward may not be optimal');
    }

    if (kellyPercentage < 0.02) {
      warnings.push('Very small position size - signal may not be strong enough');
    }

    return warnings;
  }

  /**
   * Kelly fractionを更新
   */
  setKellyFraction(fraction: number): void {
    if (fraction <= 0 || fraction > 1) {
      throw new Error('Kelly fraction must be between 0 and 1');
    }
    this.kellyFraction = fraction;
  }

  /**
   * 集中度制限を更新
   */
  setConcentrationLimits(limits: Partial<ConcentrationLimits>): void {
    this.concentrationLimits = {
      ...this.concentrationLimits,
      ...limits,
    };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): {
    kellyFraction: number;
    concentrationLimits: ConcentrationLimits;
  } {
    return {
      kellyFraction: this.kellyFraction,
      concentrationLimits: { ...this.concentrationLimits },
    };
  }
}

/**
 * シングルトンインスタンス（デフォルト設定）
 */
export const kellyCalculator = new KellyCalculator();
