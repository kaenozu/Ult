/**
 * Dynamic Position Sizing Service
 * 
 * このモジュールは、市場状況、ボラティリティ、リスク許容度に基づいて動的にポジションサイズを決定する機能を提供します。
 */

import { RiskManagementSettings, RiskCalculationResult } from '@/app/types';
import { calculateATR } from '@/app/lib/utils';
import { RISK_MANAGEMENT } from '@/app/lib/constants';

export interface PositionSizingInput {
  entryPrice: number;
  stopLossPrice: number;
  accountBalance: number;
  riskPercentage: number; // 1取引当たりのリスク（%）
  volatility: number; // ボラティリティ指標
  marketRegime: 'BULL' | 'BEAR' | 'SIDEWAYS'; // 市場体制
  trendStrength: number; // トレンド強度
  assetCorrelation: number; // 他の資産との相関
  confidence: number; // 予測信頼度
}

export interface KellyCriterionResult {
  kellyPercentage: number;
  recommendedPercentage: number;
  maxPositionSize: number;
}

class DynamicPositionSizingService {
  private defaultRiskPercentage: number = 2; // デフォルトで資産の2%をリスクとして許容

  /**
   * 動的ポジションサイズを計算 (improved for better risk management)
   */
  calculatePositionSize(input: PositionSizingInput, settings?: RiskManagementSettings): RiskCalculationResult {
    // 設定がなければデフォルトを使用
    const effectiveSettings = settings || this.getDefaultSettings();

    // 価格変動リスクを計算（ストップロス距離）
    const priceRisk = Math.abs(input.entryPrice - input.stopLossPrice) / input.entryPrice;

    // 1取引当たりのリスク金額を計算
    const riskAmount = input.accountBalance * (input.riskPercentage / 100);

    // 基本ポジションサイズを計算
    let positionSize = 0;
    if (priceRisk > 0) {
      positionSize = riskAmount / priceRisk;
    }

    // ボラティリティ調整
    positionSize = this.applyVolatilityAdjustment(positionSize, input.volatility, input.marketRegime);

    // トレンド強度調整
    positionSize = this.applyTrendAdjustment(positionSize, input.trendStrength);

    // 相関調整
    positionSize = this.applyCorrelationAdjustment(positionSize, input.assetCorrelation);

    // 信頼度調整（より強力に）
    positionSize = this.applyConfidenceAdjustment(positionSize, input.confidence);

    // 最大ポジション制限
    if (effectiveSettings.maxPositionPercent) {
      const maxPositionByPercent = input.accountBalance * (effectiveSettings.maxPositionPercent / 100);
      positionSize = Math.min(positionSize, maxPositionByPercent);
    }

    // 最大損失制限
    if (effectiveSettings.maxLossPerTrade) {
      const maxPositionByLoss = effectiveSettings.maxLossPerTrade / priceRisk;
      positionSize = Math.min(positionSize, maxPositionByLoss);
    }

    // 最小ポジションサイズチェック（あまりに小さい場合は0に）
    const minPositionPercent = RISK_MANAGEMENT.MIN_POSITION_PERCENT / 100;
    const minPositionValue = input.accountBalance * minPositionPercent;
    if (positionSize * input.entryPrice < minPositionValue) {
      positionSize = 0;
    }

    // 最終的なリスク額を再計算
    const finalRiskAmount = positionSize * priceRisk;

    return {
      positionSize,
      riskAmount: finalRiskAmount,
      riskPercent: (finalRiskAmount / input.accountBalance) * 100,
      maxPositionSize: positionSize
    };
  }

  /**
   * Kelly基準によるポジションサイズ計算
   */
  calculateKellyCriterion(winProbability: number, winLossRatio: number, accountBalance: number): KellyCriterionResult {
    // Kelly基準の計算式: K = (bp - q) / b
    // b = 勝った場合の配当オッズ
    // p = 勝率
    // q = 負率 (1 - p)
    
    const b = winLossRatio;
    const p = winProbability;
    const q = 1 - p;

    if (b <= 0) {
      return {
        kellyPercentage: 0,
        recommendedPercentage: 0,
        maxPositionSize: 0
      };
    }

    const kellyFraction = (b * p - q) / b;
    const kellyPercentage = kellyFraction * 100;

    // Kelly基準は過剰にリスクを取る可能性があるため、分数をかける
    const fractionToUse = 0.25; // 通常は1/4 Kellyを使用
    const recommendedPercentage = kellyPercentage * fractionToUse;
    const maxPositionSize = accountBalance * (recommendedPercentage / 100);

    return {
      kellyPercentage,
      recommendedPercentage,
      maxPositionSize
    };
  }

  /**
   * ボラティリティ調整を適用 (improved)
   */
  private applyVolatilityAdjustment(positionSize: number, volatility: number, marketRegime: string): number {
    // ボラティリティが高い場合はポジションを縮小（より保守的に）
    const volatilityAdjustment = 1 / Math.max(1, 1 + volatility * 1.5); // Increased multiplier
    
    // 市場体制による調整
    let regimeAdjustment = 1;
    if (marketRegime === 'BULL') {
      regimeAdjustment = 1.15; // Increased from 1.1 - 上昇相場ではより積極的
    } else if (marketRegime === 'BEAR') {
      regimeAdjustment = 0.7; // Decreased from 0.8 - 下降相場ではより保守的
    } else {
      regimeAdjustment = 0.9; // SIDEWAYS - slightly conservative
    }
    
    return positionSize * volatilityAdjustment * regimeAdjustment;
  }

  /**
   * トレンド強度調整を適用
   */
  private applyTrendAdjustment(positionSize: number, trendStrength: number): number {
    // トレンド強度が高いほど大きなポジションを取る
    const trendFactor = 1 + Math.min(Math.abs(trendStrength), 0.5); // 最大で50%増加
    return positionSize * (trendStrength >= 0 ? trendFactor : 1/trendFactor);
  }

  /**
   * 相関調整を適用
   */
  private applyCorrelationAdjustment(positionSize: number, correlation: number): number {
    // 他の資産と高相関の場合はポジションを縮小
    const correlationAdjustment = 1 - Math.max(0, correlation - 0.5) * 2; // 相関0.5以上で縮小
    return positionSize * correlationAdjustment;
  }

  /**
   * 信頼度調整を適用 (improved for better risk management)
   */
  private applyConfidenceAdjustment(positionSize: number, confidence: number): number {
    // 信頼度が高いほど大きなポジションを取る（より強力に調整）
    // 60%を基準とし、それより高ければ増加、低ければ大幅に減少
    const baseConfidence = 60;
    if (confidence < baseConfidence) {
      // 60%未満は大幅に縮小
      const reductionFactor = Math.pow(confidence / baseConfidence, 2); // Quadratic reduction
      return positionSize * reductionFactor * RISK_MANAGEMENT.LOW_CONFIDENCE_REDUCTION;
    } else {
      // 60%以上は線形増加
      const confidenceFactor = 0.5 + ((confidence - baseConfidence) / 40) * 0.7; // 0.5 to 1.2 range
      return positionSize * confidenceFactor;
    }
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): RiskManagementSettings {
    return {
      sizingMethod: 'volatility_adjusted',
      maxRiskPercent: 2,
      maxPositionPercent: 10,
      maxLossPerTrade: 100000,
      stopLoss: {
        enabled: true,
        type: 'atr',
        value: 2
      },
      takeProfit: {
        enabled: true,
        type: 'atr',
        value: 3
      }
    };
  }

  /**
   * ATRベースのストップロス価格を計算
   */
  calculateATRStopLoss(entryPrice: number, atr: number, multiplier: number, side: 'LONG' | 'SHORT'): number {
    if (side === 'LONG') {
      return entryPrice - (atr * multiplier);
    } else {
      return entryPrice + (atr * multiplier);
    }
  }

  /**
   * リスコ調整後のポジションサイズを計算
   */
  calculateAdjustedPositionSize(
    entryPrice: number,
    currentPrice: number,
    accountBalance: number,
    settings: RiskManagementSettings
  ): number {
    // 現在の損益を計算
    const unrealizedPnL = (currentPrice - entryPrice) / entryPrice;
    
    // 設定に基づいてリスクを計算
    const riskAmount = accountBalance * (settings.maxRiskPercent / 100);
    
    // ポ的ポジションサイズを計算
    const positionSize = riskAmount / Math.abs(unrealizedPnL);
    
    return positionSize;
  }
}

export const dynamicPositionSizingService = new DynamicPositionSizingService();