import { OHLCV, Position, PositionSizingMethod, StopLossType, RiskManagementSettings, RiskCalculationResult } from '../types';
import { RISK_MANAGEMENT, VOLATILITY } from './constants';

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
      const prevClose = data[idx + 1]?.close || data[idx].close;

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
    : entryPrice * (settings.stopLoss.enabled && settings.stopLoss.type === 'percentage'
      ? settings.stopLoss.value / 100 * entryPrice
      : RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100 * entryPrice);

  const rewardAmount = takeProfitPrice
    ? Math.abs(takeProfitPrice - entryPrice)
    : entryPrice * (settings.takeProfit.enabled && settings.takeProfit.type === 'percentage'
      ? settings.takeProfit.value / 100 * entryPrice
      : RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PERCENT / 100 * entryPrice);

  let positionSize = 0;
  let methodRiskPercent = 0;  // サイジング方法に応じたリスク率

  switch (settings.sizingMethod) {
    case 'fixed_ratio':
      // 固定比率法
      const ratio = settings.fixedRatio ?? 0.1;
      methodRiskPercent = ratio;
      positionSize = Math.floor((capital * ratio) / entryPrice);
      break;

    case 'kelly_criterion':
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
      const kellyFraction = settings.kellyFraction ?? RISK_MANAGEMENT.DEFAULT_KELLY_FRACTION;

      if (avgLoss > 0) {
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgLoss;
        const adjustedKelly = Math.max(0, Math.min(kelly, 1)) * kellyFraction;
        positionSize = Math.floor((capital * adjustedKelly) / entryPrice);
        methodRiskPercent = adjustedKelly;
      } else {
        positionSize = Math.floor((capital * 0.1) / entryPrice);
      }
      break;

    case 'fixed_amount':
      // 固定金額法
      const fixedAmount = capital * 0.1; // デフォルト10%
      positionSize = Math.floor(fixedAmount / entryPrice);
      methodRiskPercent = 0.1;
      break;

    case 'volatility_based':
      // ボラティリティ基準（ATR使用）
      if (atr && atr > 0) {
        // ATRベース：資本の2%を1ATRあたりのリスクとしているサイズ
        const capitalAtRisk = capital * 0.02;
        const atrMultiplier = settings.atrMultiplier ?? RISK_MANAGEMENT.DEFAULT_ATR_MULTIPLIER;
        positionSize = Math.floor(capitalAtRisk / (atr * atrMultiplier * entryPrice) * entryPrice);
      } else {
        positionSize = Math.floor((capital * 0.1) / entryPrice);
      }
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
  const maxPositionPercent = settings.maxPositionPercent ?? RISK_MANAGEMENT.DEFAULT_MAX_POSITION_PERCENT;
  const maxPositionValue = capital * (maxPositionPercent / 100);
  const maxPositionSizeByCapital = Math.floor(maxPositionValue / entryPrice);
  positionSize = Math.min(positionSize, maxPositionSizeByCapital);

  // リスク額とパーセンテージの計算
  const totalRisk = positionSize * riskAmount;
  const riskPercentOfCapital = (totalRisk / capital) * 100;
  const riskPercentOfPosition = riskAmount / entryPrice * 100;

  // 最大損失リミットのチェック
  const maxLossLimit = settings.maxLossPerTrade ?? capital * (settings.maxLossPercent ?? 10) / 100;

  if (totalRisk > maxLossLimit) {
    // リミット超過の場合はサイズを調整
    positionSize = Math.floor(maxLossLimit / riskAmount);
  }

  return {
    positionSize,
    stopLossPrice: stopLossPrice || entryPrice * (1 - RISK_MANAGEMENT.DEFAULT_STOP_LOSS_PERCENT / 100),
    takeProfitPrice: takeProfitPrice || entryPrice * (1 + RISK_MANAGEMENT.DEFAULT_TAKE_PROFIT_PERCENT / 100),
    riskAmount,
    riskPercent: riskPercentOfCapital,
    positionRiskPercent: riskPercentOfPosition,
    maxPositionSize: maxPositionSizeByCapital,
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
  config: RiskManagementSettings['stopLoss'],
  atr?: number
): number {
  if (!config.enabled) {
    return entryPrice; // 損切りなし
  }

  switch (config.type) {
    case 'percentage':
      if (side === 'LONG') {
        return entryPrice * (1 - config.value / 100);
      } else {
        return entryPrice * (1 + config.value / 100);
      }

    case 'price':
      return config.value;

    case 'atr':
      if (atr && atr > 0) {
        const multiplier = config.value; // ATR倍率
        if (side === 'LONG') {
          return entryPrice - (atr * multiplier);
        } else {
          return entryPrice + (atr * multiplier);
        }
      }
      return entryPrice;

    case 'trailing':
      // トラィリングストップの初期価格を計算
      // 実際の更新はデータ更新時に行う必要がある
      return calculateStopLossPrice(entryPrice, side, { ...config, type: 'atr' }, atr);

    default:
      return entryPrice;
  }
}

/**
 * 利確価格を計算
 * @param entryPrice - エントリー価格
 * @param side - 'LONG' or 'SHORT'
 * @param stopLossPrice - 損切り価格
 * @param config - 利確設定
 * @returns 利確価格
 */
export function calculateTakeProfitPrice(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  stopLossPrice: number,
  config: RiskManagementSettings['takeProfit']
): number {
  if (!config.enabled) {
    return entryPrice; // 利確なし
  }

  switch (config.type) {
    case 'percentage':
      if (side === 'LONG') {
        return entryPrice * (1 + config.value / 100);
      } else {
        return entryPrice * (1 - config.value / 100);
      }

    case 'price':
      return config.value;

    case 'risk_reward_ratio':
      const risk = Math.abs(entryPrice - stopLossPrice);
      if (side === 'LONG') {
        return entryPrice + (risk * config.value);
      } else {
        return entryPrice - (risk * config.value);
      }

    default:
      return entryPrice;
  }
}

/**
 * デフォルトのリスク管理設定
 */
export const DEFAULT_RISK_SETTINGS: RiskManagementSettings = {
  sizingMethod: 'fixed_ratio',
  fixedRatio: 0.1,
  maxPositionPercent: 20,
  kellyFraction: 0.25,
  stopLoss: {
    enabled: false,
    type: 'percentage',
    value: 2,
    trailing: false,
  },
  takeProfit: {
    enabled: false,
    type: 'risk_reward_ratio',
    value: 2,
    partials: false,
  },
  maxLossPercent: 10,
  dailyLossLimit: 5,
  useATR: true,
  atrPeriod: 14,
  atrMultiplier: 2,
  maxPositions: 5,
};

/**
 * 珎日の損失をチェック
 * @param currentDailyLoss - 現日の損失
 * @param settings - リスク管理設定
 * @returns 損失リミットを超えているか
 */
export function checkDailyLossLimit(
  currentDailyLoss: number,
  capital: number,
  settings: RiskManagementSettings
): { exceeded: boolean; remaining: number } {
  const limit = capital * (settings.dailyLossLimit ?? RISK_MANAGEMENT.DEFAULT_DAILY_LOSS_LIMIT) / 100;
  return {
    exceeded: currentDailyLoss > limit,
    remaining: Math.max(0, limit - currentDailyLoss),
  };
}

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
  const maxPositions = settings.maxPositions ?? RISK_MANAGEMENT.DEFAULT_MAX_POSITIONS;
  if (currentPositions >= maxPositions) {
    return {
      allowed: false,
      reason: `最大ポジション数（${maxPositions}）に達しています`,
    };
  }

  // 相関チェック（同じ市場・似た銘柄の制限）
  const maxCorrelation = settings.maxCorrelation ?? 0.5;
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