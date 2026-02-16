/**
 * SlippageModel.ts
 *
 * リアルなスリッページモデル
 * 注文サイズ、市場流動性、時間帯、ボラティリティを考慮した
 * 精度の高いスリッページ計算を実装します。
 */

import { OHLCV } from '@/app/types';

// ============================================================================
// Types
// ============================================================================

export interface SlippageConfig {
  // 基本スリッページ率（%）
  baseSlippage: number;

  // スプレッド（%）
  spread: number;

  // 平均出来高（株数/日）
  averageDailyVolume?: number;

  // 市場流動性スコア（0-1、1が最も流動性が高い）
  liquidityScore?: number;

  // 時間帯によるスリッページ変動を有効化
  useTimeOfDaySlippage: boolean;

  // ボラティリティによるスリッページ変動を有効化
  useVolatilitySlippage: boolean;

  // 注文サイズによる影響を有効化
  useOrderSizeImpact: boolean;

  // 市場インパクトモデルのタイプ
  marketImpactModel: 'linear' | 'square_root' | 'almgren_chriss';

  // 急増/急落時の追加スリッページ（%）
  panicSlippage: number;
}

export interface SlippageResult {
  // 適用されたスリッページ率（%）
  slippageRate: number;

  // 調整後価格
  adjustedPrice: number;

  // 各要因の内訳
  breakdown: {
    base: number;
    spread: number;
    timeOfDay: number;
    volatility: number;
    orderSize: number;
    total: number;
  };
}

export type OrderSide = 'BUY' | 'SELL';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  baseSlippage: 0.05, // 0.05%
  spread: 0.01, // 0.01%
  useTimeOfDaySlippage: true,
  useVolatilitySlippage: true,
  useOrderSizeImpact: true,
  marketImpactModel: 'square_root',
  panicSlippage: 0.1, // 0.1%
};

// 日本市場の取引時間（時間）
const MARKET_OPEN_HOUR = 9;
const MARKET_CLOSE_HOUR = 15;
const LUNCH_START_HOUR = 11;
const LUNCH_START_MINUTE = 30;
const LUNCH_END_HOUR = 12;
const LUNCH_END_MINUTE = 30;

// ============================================================================
// Slippage Model
// ============================================================================

export class SlippageModel {
  private config: SlippageConfig;

  constructor(config: Partial<SlippageConfig> = {}) {
    this.config = { ...DEFAULT_SLIPPAGE_CONFIG, ...config };
  }

  /**
   * 注文を実行価格を計算（スリッページ適用済み）
   */
  calculateSlippage(
    price: number,
    side: OrderSide,
    quantity: number,
    data?: OHLCV
  ): SlippageResult {
    // 基本スリッページ
    let slippageRate = this.config.baseSlippage / 100;

    // スプレッドの影響
    const spreadImpact = (this.config.spread / 100) / 2; // 半分を適用
    slippageRate += spreadImpact;

    // 時間帯によるスリッページ
    const timeOfDayImpact = this.config.useTimeOfDaySlippage && data
      ? this.calculateTimeOfDayImpact(data.date)
      : 0;
    slippageRate += timeOfDayImpact;

    // ボラティリティによるスリッページ
    const volatilityImpact = this.config.useVolatilitySlippage && data
      ? this.calculateVolatilityImpact(data)
      : 0;
    slippageRate += volatilityImpact;

    // 注文サイズによる影響
    const orderSizeImpact = this.config.useOrderSizeImpact
      ? this.calculateOrderSizeImpact(quantity, data?.volume)
      : 0;
    slippageRate += orderSizeImpact;

    // 急増/急落の検出と追加スリッページ
    const panicImpact = data ? this.detectPanicMovement(data) : 0;
    slippageRate += panicImpact;

    // 価格調整
    const slippageFactor = 1 + slippageRate;
    const adjustedPrice = side === 'BUY'
      ? price * slippageFactor
      : price / slippageFactor;

    return {
      slippageRate: slippageRate * 100, // %に変換
      adjustedPrice,
      breakdown: {
        base: this.config.baseSlippage,
        spread: this.config.spread / 2,
        timeOfDay: timeOfDayImpact * 100,
        volatility: volatilityImpact * 100,
        orderSize: orderSizeImpact * 100,
        total: slippageRate * 100,
      },
    };
  }

  /**
   * 時間帯によるスリッページ影響を計算
   * 始値・終値近くでスリッページが増加
   */
  private calculateTimeOfDayImpact(dateStr: string): number {
    const date = new Date(dateStr);
    // Use JST (UTC+9) time regardless of server timezone
    const hour = (date.getUTCHours() + 9) % 24;
    const minute = date.getUTCMinutes();
    const timeValue = hour + minute / 60;

    // 始値（9:00-10:00）：+50%
    if (timeValue >= MARKET_OPEN_HOUR && timeValue < MARKET_OPEN_HOUR + 1) {
      return 0.00025; // +0.025% (2.5bp)
    }

    // 終値（15:00-15:30）：+30%
    if (timeValue >= MARKET_CLOSE_HOUR && timeValue < MARKET_CLOSE_HOUR + 0.5) {
      return 0.00015; // +0.015% (1.5bp)
    }

    // ランチタイム（11:30-12:30）：+20%
    const lunchStart = LUNCH_START_HOUR + LUNCH_START_MINUTE / 60;
    const lunchEnd = LUNCH_END_HOUR + LUNCH_END_MINUTE / 60;
    if (timeValue >= lunchStart && timeValue < lunchEnd) {
      return 0.0001; // +0.01% (1bp)
    }

    return 0; // 通常時間
  }

  /**
   * ボラティリティによるスリッページ影響を計算
   * 高ボラティリティ時にスリッページ増加
   */
  private calculateVolatilityImpact(data: OHLCV): number {
    // 日内ボラティリティを計算
    const intradayVolatility = (data.high - data.low) / data.close;

    // 通常のボラティリティは1-2%
    // 高ボラティリティ（>3%）でスリッページ増加
    if (intradayVolatility > 0.05) {
      return 0.0003; // +0.03% (3bp)
    } else if (intradayVolatility > 0.03) {
      return 0.0002; // +0.02% (2bp)
    } else if (intradayVolatility > 0.02) {
      return 0.0001; // +0.01% (1bp)
    }

    return 0;
  }

  /**
   * 注文サイズによる市場インパクトを計算
   * 注文サイズが大きいほどスリッページ増加
   */
  private calculateOrderSizeImpact(quantity: number, volume?: number): number {
    if (!this.config.averageDailyVolume || !volume) {
      return 0;
    }

    const volumeRatio = quantity / this.config.averageDailyVolume;

    switch (this.config.marketImpactModel) {
      case 'linear':
        // 線形モデル
        return volumeRatio * 0.001; // 0.1% max

      case 'square_root':
        // 平方根モデル（市場マイクロ構造理論で一般的）
        return Math.sqrt(volumeRatio) * 0.0005;

      case 'almgren_chriss':
        // Almgren-Chriss モデル（一時的＋永続的インパクト）
        const temporaryImpact = 0.0001 * Math.sqrt(volumeRatio);
        const permanentImpact = 0.00005 * volumeRatio;
        return temporaryImpact + permanentImpact;

      default:
        return 0;
    }
  }

  /**
   * 急増/急落（パニック）を検出
   * 前日終値からの急激な変動で追加スリッページ
   */
  private detectPanicMovement(data: OHLCV): number {
    // 前日との比較はデータがないため、
    // 当日の高値・安値の幅で判断

    const dayRange = (data.high - data.low) / data.close;

    // 5%以上の変動でパニックとみなす
    if (dayRange > 0.05) {
      return this.config.panicSlippage / 100;
    }

    return 0;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<SlippageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): SlippageConfig {
    return { ...this.config };
  }

  /**
   * 流動性スコアに基づいて設定を調整
   */
  adjustForLiquidity(liquidityScore: number): void {
    // liquidityScore: 0 (低流動性) - 1 (高流動性)
    // 低流動性ほどスリッページ増加

    const multiplier = 1 + (1 - liquidityScore); // 1-2倍

    this.config.baseSlippage = DEFAULT_SLIPPAGE_CONFIG.baseSlippage * multiplier;
    this.config.spread = DEFAULT_SLIPPAGE_CONFIG.spread * multiplier;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 銘柄の流動性スコアを推定
 * 出来高と時価総額から計算
 */
export function estimateLiquidityScore(
  averageDailyVolume: number,
  price: number,
  marketCap?: number
): number {
  // 平均日次売買代金
  const avgDailyValue = averageDailyVolume * price;

  // 基準値（日本市場）
  const HIGH_LIQUIDITY_THRESHOLD = 10_000_000_000; // 100億円/日
  const MEDIUM_LIQUIDITY_THRESHOLD = 1_000_000_000; // 10億円/日
  const LOW_LIQUIDITY_THRESHOLD = 100_000_000; // 1億円/日

  if (avgDailyValue >= HIGH_LIQUIDITY_THRESHOLD) {
    return 1.0; // 高流動性
  } else if (avgDailyValue >= MEDIUM_LIQUIDITY_THRESHOLD) {
    return 0.7; // 中流動性
  } else if (avgDailyValue >= LOW_LIQUIDITY_THRESHOLD) {
    return 0.4; // 低流動性
  } else {
    return 0.1; // 超低流動性
  }
}

/**
 * ポートフォリオ全体の平均スリッページコストを推定
 */
export function estimatePortfolioSlippageCost(
  orders: Array<{ price: number; quantity: number; side: OrderSide }>,
  model: SlippageModel
): {
  totalCost: number;
  averageRate: number;
  worstRate: number;
  bestRate: number;
} {
  let totalSlippage = 0;
  let maxRate = 0;
  let minRate = Infinity;

  for (const order of orders) {
    const result = model.calculateSlippage(order.price, order.side, order.quantity);
    const cost = Math.abs(result.adjustedPrice - order.price) * order.quantity;
    totalSlippage += cost;

    maxRate = Math.max(maxRate, result.slippageRate);
    minRate = Math.min(minRate, result.slippageRate);
  }

  const totalValue = orders.reduce((sum, order) => sum + order.price * order.quantity, 0);
  const averageRate = (totalSlippage / totalValue) * 100;

  return {
    totalCost: totalSlippage,
    averageRate,
    worstRate: maxRate,
    bestRate: minRate === Infinity ? 0 : minRate,
  };
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<SlippageConfig>) => new SlippageModel(config)
);

export const getGlobalSlippageModel = getInstance;
export const resetGlobalSlippageModel = resetInstance;

export default SlippageModel;
