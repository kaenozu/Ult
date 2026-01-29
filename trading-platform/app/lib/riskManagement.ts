import { OHLCV, Position, PositionSizingMethod, StopLossType, RiskManagementSettings, RiskCalculationResult } from '../types';
import { RISK_MANAGEMENT, VOLATILITY, POSITION_SIZING } from './constants';

/**
 * ATR（Average True Range）を計算
 * @param data - OHLCVデータ配列
 * @param period - ATR期間（デフォルト14）
 * @returns ATR値の配列
 */
export function calculateATR(data: OHLCV[], period: number = 14): number[] {
  if (data.length < period + 1) {
    return [];
  }

  const atrValues: number[] = [];

  for (let i = period; i < data.length; i++) {
    let trueRangeSum = 0;

    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const high = data[idx].high;
      const low = data[idx].low;
      const prevClose = data[idx - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRangeSum += tr;
    }

    atrValues.push(trueRangeSum / period);
  }

  return atrValues;
}

/**
 * 最新のATR値を取得
 * @param data - OHLCVデータ配列
 * @param period - ATR期間
 * @returns 最新のATR値、または計算不可の場合はundefined
 */
export function getLatestATR(data: OHLCV[], period: number = 14): number | undefined {
  const atrValues = calculateATR(data, period);
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : undefined;
}

/**
 * ポジションサイジング（推奨サイズ）を計算
 * @param capital - 利用可能資本
 * @param entryPrice - エントリー価格
 * @param stopLossPrice - 損切り価格
 * @param takeProfitPrice - 利確価格
 * @param settings - リスク管理設定
 * @param atr - ATR値（オプション）
 * @returns ポジションサイジング結果
 */
export function calculatePositionSize(
  capital: number,
  entryPrice: number,
  stopLossPrice: number | undefined,
  takeProfitPrice: number | undefined,
  settings: RiskManagementSettings,
  atr?: number
): RiskCalculationResult {
  const riskAmount = stopLossPrice
    ? Math.abs(entryPrice - stopLossPrice)
    : entryPrice * (RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100);

  const rewardAmount = takeProfitPrice
    ? Math.abs(takeProfitPrice - entryPrice)
    : entryPrice * (RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PERCENT / 100);

  let positionSize = 0;
  let methodRiskPercent = 0;  // サイジング方法に応じたリスク率

  const sizingMethod = settings.positionSizingMethod || 'FIXED_FRACTIONAL';

  switch (sizingMethod) {
    case 'FIXED_FRACTIONAL':
      // 固定比率法
      const ratio = settings.maxRiskPerTrade / 100;
      methodRiskPercent = ratio;
      // 1株あたりのリスク額
      const riskPerShare = riskAmount > 0 ? riskAmount : entryPrice * 0.02;
      // 許容損失額
      const maxLoss = capital * ratio;

      positionSize = Math.floor(maxLoss / riskPerShare);
      break;

    case 'KELLY_CRITERION':
      // ケリー基準
      // 簡略版: f = (bp * p - q) / b
      // bp = 勝率（勝った時の平均利益/負けた時の平均損失）
      // p = 勝率
      // q = 負率 = 1 - p
      // b = 資けた時の平均損失
      // より正確なケリー基準には過去の取引成績が必要だが、ここでは簡易版を実装
      const winRate = 0.5; // デフォルト50%
      const avgWin = rewardAmount / entryPrice;
      const avgLoss = riskAmount / entryPrice;
      const kellyFraction = 0.25; // settings.kellyFraction ?? RISK_MANAGEMENT.DEFAULT_KELLY_FRACTION;

      if (avgLoss > 0) {
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgLoss;
        const adjustedKelly = Math.max(0, Math.min(kelly, 1)) * kellyFraction;
        positionSize = Math.floor((capital * adjustedKelly) / entryPrice);
        methodRiskPercent = adjustedKelly;
      } else {
        positionSize = Math.floor((capital * 0.1) / entryPrice);
      }
      break;

    case 'FIXED_DOLLAR':
      // 固定金額法
      const fixedAmount = capital * 0.1; // デフォルト10%
      positionSize = Math.floor(fixedAmount / entryPrice);
      methodRiskPercent = 0.1;
      break;

    default:
      positionSize = Math.floor((capital * 0.1) / entryPrice);
      methodRiskPercent = 0.1;
  }

  // 最小サイズ制限
  const minSize = POSITION_SIZING.MIN_SIZE;
  positionSize = Math.max(minSize, positionSize);

  // 最大サイズ制限（資本の一定比率以下）
  const maxPositionPercent = RISK_MANAGEMENT.DEFAULT_MAX_POSITION_PERCENT;
  const maxPositionValue = capital * (maxPositionPercent / 100);
  const maxPositionSizeByCapital = Math.floor(maxPositionValue / entryPrice);
  positionSize = Math.min(positionSize, maxPositionSizeByCapital);

  // リスク額とパーセンテージの計算
  const totalRisk = positionSize * riskAmount;

  // 最大損失リミットのチェック
  const maxLossLimit = capital * (settings.maxPortfolioRisk / 100);

  if (totalRisk > maxLossLimit) {
    // リミット超過の場合はサイズを調整
    positionSize = Math.floor(maxLossLimit / riskAmount);
  }

  return {
    recommendedQuantity: positionSize,
    maxQuantity: maxPositionSizeByCapital,
    stopLossPrice: stopLossPrice || entryPrice * (1 - RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100),
    takeProfitPrice: takeProfitPrice || entryPrice * (1 + RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PERCENT / 100),
    riskAmount,
    rewardAmount,
    riskRewardRatio: riskAmount > 0 ? rewardAmount / riskAmount : 0,
    isTradeAllowed: positionSize > 0,
  };
}

/**
 * 損切り価格を計算
 * @param entryPrice - エントリー価格
 * @param side - 'LONG' or 'SHORT'
 * @param config - ストップロス設定
 * @param atr - ATR値（オプション）
 * @returns 損切り価格
 */
export function calculateStopLossPrice(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  settings: RiskManagementSettings,
  atr?: number
): number {
  if (settings.stopLossType === 'ATR_BASED') {
      if (atr && atr > 0) {
        const multiplier = settings.atrMultiplier;
        if (side === 'LONG') {
          return entryPrice - (atr * multiplier);
        } else {
          return entryPrice + (atr * multiplier);
        }
      }
      return entryPrice;
  } else {
      // FIXED_PERCENT
      const percent = settings.defaultStopLossPercent;
      if (side === 'LONG') {
        return entryPrice * (1 - percent / 100);
      } else {
        return entryPrice * (1 + percent / 100);
      }
  }
}

/**
 * デフォルトのリスク管理設定
 */
export const DEFAULT_RISK_SETTINGS: RiskManagementSettings = {
  maxRiskPerTrade: 1, // 1%
  maxPortfolioRisk: 5, // 5%
  positionSizingMethod: 'FIXED_FRACTIONAL',
  stopLossType: 'ATR_BASED',
  defaultStopLossPercent: 2,
  atrMultiplier: 2,
};

/**
 * ポジションを追加できるかチェック
 * @param currentPositions - 現在のポジション数
 * @param settings - リスク管理設定
 * @param newSymbol - 追加しようとする銘柄
 * @param existingPositions - 既存のポジション
 * @returns 追加可否と理由
 */
export function canAddPosition(
  currentPositions: number,
  settings: RiskManagementSettings,
  newSymbol: string,
  existingPositions: Position[]
): { allowed: boolean; reason?: string } {
  // 最大ポジション数チェック
  const maxPositions = RISK_MANAGEMENT.DEFAULT_MAX_POSITIONS;
  if (currentPositions >= maxPositions) {
    return {
      allowed: false,
      reason: `最大ポジション数（${maxPositions}）に達しています`,
    };
  }

  // 相関チェック（同じ市場・似た銘柄の制限）
  // 簡易実装：同じ市場の銘柄数を制限
  const sameMarketCount = existingPositions.filter(p => p.market === existingPositions[0]?.market).length;
  if (sameMarketCount >= 3) {
    return {
      allowed: false,
      reason: '同じ市場のポジションが多すぎます',
    };
  }

  return { allowed: true };
}
