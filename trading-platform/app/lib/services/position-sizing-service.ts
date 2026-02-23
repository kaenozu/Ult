/**
 * Position Sizing Service
 *
 * Calculates optimal position sizes based on risk management rules.
 * Extracted from PredictiveAnalyticsEngine.
 */

export interface PositionSizingInput {
  accountEquity: number;        // 口座資金
  riskPerTrade: number;          // 許容リスク率 (%)
  entryPrice: number;            // エントリー価格
  stopLossPrice: number;         // 損切り価格
  confidence?: number;           // シグナル信頼度 (0-100)
  minShares?: number;            // 最小購入株数 (デフォルト: 100)
  maxPositionPercent?: number;   // 最大ポジション比率 (デフォルト: 20%)
}

export interface PositionSizingResult {
  recommendedShares: number;     // 推奨購入株数
  maxLossAmount: number;         // 予想最大損失額
  riskAmount: number;            // リスク金額
  positionValue: number;         // ポジション価値
  riskPercent: number;           // 実際のリスク率
  stopLossDistance: number;      // 損切り距離
  stopLossPercent: number;       // 損切りパーセンテージ
  reasoning: string[];           // 計算根拠
}

class PositionSizingService {
  /**
   * ポジションサイジング計算
   *
   * 口座資金とリスク許容度に基づいて、適切なポジションサイズを計算します。
   * 資金管理の基本原則に従い、1取引あたりのリスクを口座資金の一定割合に抑えます。
   */
  calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
    const reasoning: string[] = [];
    const minShares = input.minShares ?? 100;
    const maxPositionPercent = input.maxPositionPercent ?? 20;

    // 1. 損切り距離を計算
    const stopLossDistance = Math.abs(input.entryPrice - input.stopLossPrice);
    const stopLossPercent = (stopLossDistance / input.entryPrice) * 100;

    reasoning.push(`エントリー価格: ¥${input.entryPrice.toFixed(2)}`);
    reasoning.push(`損切り価格: ¥${input.stopLossPrice.toFixed(2)}`);
    reasoning.push(`損切り距離: ¥${stopLossDistance.toFixed(2)} (${stopLossPercent.toFixed(2)}%)`);

    // 2. 損切り距離がゼロの場合のエラーハンドリング
    if (stopLossDistance === 0) {
      reasoning.push(`⚠️ 損切り距離がゼロです。適切な損切り価格を設定してください。`);
      return {
        recommendedShares: 0,
        maxLossAmount: 0,
        riskAmount: 0,
        positionValue: 0,
        riskPercent: 0,
        stopLossDistance: 0,
        stopLossPercent: 0,
        reasoning
      };
    }

    // 3. 許容リスク金額を計算
    const riskAmount = input.accountEquity * (input.riskPerTrade / 100);
    reasoning.push(`許容リスク額: ¥${riskAmount.toFixed(0)} (口座資金の${input.riskPerTrade}%)`);

    // 4. 基本ポジションサイズを計算
    // 基本公式: ポジションサイズ = リスク金額 / 1株あたりのリスク
    let recommendedShares = Math.floor(riskAmount / stopLossDistance);
    reasoning.push(`基本推奨株数: ${recommendedShares}株`);

    // 5. 信頼度による調整（オプション）
    if (input.confidence !== undefined) {
      const confidenceFactor = input.confidence / 100;
      // 信頼度が低い場合は控えめに、高い場合はそのまま
      if (confidenceFactor < 0.7) {
        const adjustedShares = Math.floor(recommendedShares * confidenceFactor);
        reasoning.push(`信頼度調整: ${input.confidence}% → ${adjustedShares}株 (調整率: ${(confidenceFactor * 100).toFixed(0)}%)`);
        recommendedShares = adjustedShares;
      } else {
        reasoning.push(`信頼度: ${input.confidence}% (調整なし)`);
      }
    }

    // 6. 最小単位チェック
    if (recommendedShares < minShares) {
      reasoning.push(`⚠️ 推奨株数が最小単位（${minShares}株）未満です。リスク許容度または口座資金を見直してください。`);
    }

    // 7. 最終結果を計算
    const positionValue = recommendedShares * input.entryPrice;
    const maxLossAmount = recommendedShares * stopLossDistance;
    const actualRiskPercent = (maxLossAmount / input.accountEquity) * 100;

    reasoning.push(`ポジション価値: ¥${positionValue.toFixed(0)}`);
    reasoning.push(`予想最大損失: ¥${maxLossAmount.toFixed(0)} (口座資金の${actualRiskPercent.toFixed(2)}%)`);

    // 8. ポートフォリオ集中リスクのチェック
    const positionPercent = (positionValue / input.accountEquity) * 100;
    if (positionPercent > maxPositionPercent) {
      reasoning.push(`⚠️ ポジションが口座資金の${positionPercent.toFixed(1)}%を占めます（推奨: ${maxPositionPercent}%以下）`);
    } else {
      reasoning.push(`✓ ポジション比率: ${positionPercent.toFixed(1)}% (健全)`);
    }

    return {
      recommendedShares,
      maxLossAmount,
      riskAmount,
      positionValue,
      riskPercent: actualRiskPercent,
      stopLossDistance,
      stopLossPercent,
      reasoning
    };
  }
}

export const positionSizingService = new PositionSizingService();
