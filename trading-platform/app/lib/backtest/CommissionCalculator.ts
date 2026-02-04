/**
 * CommissionCalculator.ts
 *
 * 市場別の手数料計算モジュール
 * 日本株、米国株、為替手数料を正確にシミュレーション
 */

// ============================================================================
// Types
// ============================================================================

export type Market = 'japan' | 'usa';

export interface CommissionConfig {
  market: Market;
  
  // 日本株手数料設定
  japan?: {
    baseCommissionRate: number; // 基本手数料率 (%)
    minCommission: number; // 最低手数料 (円)
    consumptionTax: number; // 消費税率 (%)
  };
  
  // 米国株手数料設定
  usa?: {
    perShareFee: number; // 1株あたりの手数料 ($)
    minCommission: number; // 最低手数料 ($)
    maxCommission: number; // 上限手数料 ($)
    secFee: number; // SEC Fee (%)
    tafFee: number; // TAF Fee ($ per trade, sell only)
  };
  
  // 為替手数料
  fx?: {
    conversionRate: number; // 為替手数料率 (%)
    minFee: number; // 最低為替手数料
  };
}

export interface CommissionResult {
  commission: number; // 手数料合計
  breakdown: {
    baseCommission: number; // 基本手数料
    tax: number; // 税金
    secFee?: number; // SEC Fee (米国のみ)
    tafFee?: number; // TAF Fee (米国のみ)
    fxFee?: number; // 為替手数料
  };
  effectiveRate: number; // 実効手数料率 (%)
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_JAPAN_COMMISSION: CommissionConfig['japan'] = {
  baseCommissionRate: 0.22, // 0.22% (税込)
  minCommission: 0, // 最低手数料なし (証券会社による)
  consumptionTax: 10, // 10%
};

export const DEFAULT_USA_COMMISSION: CommissionConfig['usa'] = {
  perShareFee: 0.005, // $0.005/株
  minCommission: 0, // 最低手数料なし
  maxCommission: 1.0, // $1.00 上限 (証券会社による)
  secFee: 0.00051, // 0.00051% SEC Fee
  tafFee: 0.000119, // $0.000119/株 TAF Fee (売却時のみ)
};

export const DEFAULT_FX_COMMISSION: CommissionConfig['fx'] = {
  conversionRate: 0.15, // 0.15% (一般的な外貨両替手数料)
  minFee: 0,
};

// ============================================================================
// Commission Calculator
// ============================================================================

export class CommissionCalculator {
  private config: CommissionConfig;
  
  constructor(market: Market, config?: Partial<CommissionConfig>) {
    this.config = {
      market,
      japan: market === 'japan' ? { ...DEFAULT_JAPAN_COMMISSION, ...(config?.japan ?? {}) } : undefined,
      usa: market === 'usa' ? { ...DEFAULT_USA_COMMISSION, ...(config?.usa ?? {}) } : undefined,
      fx: { ...DEFAULT_FX_COMMISSION, ...(config?.fx ?? {}) },
    };
  }
  
  /**
   * 取引手数料を計算
   * @param price 約定価格
   * @param quantity 数量 (株数)
   * @param side 売買区分 ('BUY' or 'SELL')
   * @param includeFx 為替手数料を含めるか (米国株の場合)
   */
  calculateCommission(
    price: number,
    quantity: number,
    side: 'BUY' | 'SELL',
    includeFx = false
  ): CommissionResult {
    const orderValue = price * quantity;
    
    if (this.config.market === 'japan') {
      return this.calculateJapanCommission(orderValue);
    } else {
      return this.calculateUsaCommission(price, quantity, side, includeFx);
    }
  }
  
  /**
   * 日本株の手数料を計算
   */
  private calculateJapanCommission(orderValue: number): CommissionResult {
    const config = this.config.japan!;
    
    // 基本手数料 (税抜)
    const baseCommissionWithTax = orderValue * (config.baseCommissionRate / 100);
    const baseCommission = baseCommissionWithTax / (1 + config.consumptionTax / 100);
    
    // 消費税
    const tax = baseCommission * (config.consumptionTax / 100);
    
    // 最低手数料チェック
    const totalCommission = Math.max(baseCommissionWithTax, config.minCommission);
    const actualBase = totalCommission / (1 + config.consumptionTax / 100);
    const actualTax = totalCommission - actualBase;
    
    return {
      commission: totalCommission,
      breakdown: {
        baseCommission: actualBase,
        tax: actualTax,
      },
      effectiveRate: (totalCommission / orderValue) * 100,
    };
  }
  
  /**
   * 米国株の手数料を計算
   */
  private calculateUsaCommission(
    price: number,
    quantity: number,
    side: 'BUY' | 'SELL',
    includeFx: boolean
  ): CommissionResult {
    const config = this.config.usa!;
    const orderValue = price * quantity;
    
    // 基本手数料 (1株あたり)
    let baseCommission = quantity * config.perShareFee;
    
    // 上限・下限チェック
    baseCommission = Math.max(baseCommission, config.minCommission);
    baseCommission = Math.min(baseCommission, config.maxCommission);
    
    // SEC Fee (売却時のみ)
    const secFee = side === 'SELL' ? orderValue * (config.secFee / 100) : 0;
    
    // TAF Fee (売却時のみ)
    const tafFee = side === 'SELL' ? quantity * config.tafFee : 0;
    
    // 為替手数料 (オプション)
    let fxFee = 0;
    if (includeFx && this.config.fx) {
      fxFee = orderValue * (this.config.fx.conversionRate / 100);
      fxFee = Math.max(fxFee, this.config.fx.minFee);
    }
    
    const totalCommission = baseCommission + secFee + tafFee + fxFee;
    
    return {
      commission: totalCommission,
      breakdown: {
        baseCommission,
        tax: 0, // 米国には消費税なし
        secFee,
        tafFee,
        fxFee: includeFx ? fxFee : undefined,
      },
      effectiveRate: (totalCommission / orderValue) * 100,
    };
  }
  
  /**
   * 往復の手数料を計算 (買いと売りの両方)
   */
  calculateRoundTripCommission(
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    includeFx = false
  ): {
    entryCommission: CommissionResult;
    exitCommission: CommissionResult;
    totalCommission: number;
    totalEffectiveRate: number;
  } {
    const entryCommission = this.calculateCommission(entryPrice, quantity, 'BUY', includeFx);
    const exitCommission = this.calculateCommission(exitPrice, quantity, 'SELL', includeFx);
    
    const totalValue = entryPrice * quantity + exitPrice * quantity;
    const totalCommission = entryCommission.commission + exitCommission.commission;
    const totalEffectiveRate = (totalCommission / totalValue) * 100;
    
    return {
      entryCommission,
      exitCommission,
      totalCommission,
      totalEffectiveRate,
    };
  }
  
  /**
   * 設定を更新
   */
  updateConfig(config: Partial<CommissionConfig>): void {
    if (config.japan) {
      this.config.japan = { ...this.config.japan!, ...config.japan };
    }
    if (config.usa) {
      this.config.usa = { ...this.config.usa!, ...config.usa };
    }
    if (config.fx) {
      this.config.fx = { ...this.config.fx!, ...config.fx };
    }
  }
  
  /**
   * 現在の設定を取得
   */
  getConfig(): CommissionConfig {
    return { ...this.config };
  }
  
  /**
   * 証券会社別のプリセット設定を適用
   */
  applyBrokerPreset(broker: 'sbi' | 'rakuten' | 'interactive_brokers' | 'charles_schwab'): void {
    switch (broker) {
      case 'sbi':
        // SBI証券 (日本)
        this.config.japan = {
          baseCommissionRate: 0.055, // 0.055% (税抜)
          minCommission: 55, // 55円 (税込)
          consumptionTax: 10,
        };
        break;
        
      case 'rakuten':
        // 楽天証券 (日本)
        this.config.japan = {
          baseCommissionRate: 0.055, // 0.055% (税抜)
          minCommission: 55, // 55円 (税込)
          consumptionTax: 10,
        };
        break;
        
      case 'interactive_brokers':
        // Interactive Brokers (米国)
        this.config.usa = {
          perShareFee: 0.005, // $0.005/株
          minCommission: 1.0, // $1.00
          maxCommission: 1.0, // 1% of trade value
          secFee: 0.00051,
          tafFee: 0.000119,
        };
        break;
        
      case 'charles_schwab':
        // Charles Schwab (米国)
        this.config.usa = {
          perShareFee: 0, // $0 commission
          minCommission: 0,
          maxCommission: 0,
          secFee: 0.00051,
          tafFee: 0.000119,
        };
        break;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 複数の取引の合計手数料を計算
 */
export function calculateTotalCommission(
  trades: Array<{
    price: number;
    quantity: number;
    side: 'BUY' | 'SELL';
  }>,
  calculator: CommissionCalculator
): {
  totalCommission: number;
  averageRate: number;
  breakdown: CommissionResult[];
} {
  const results = trades.map(trade =>
    calculator.calculateCommission(trade.price, trade.quantity, trade.side)
  );
  
  const totalCommission = results.reduce((sum, r) => sum + r.commission, 0);
  const totalValue = trades.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const averageRate = (totalCommission / totalValue) * 100;
  
  return {
    totalCommission,
    averageRate,
    breakdown: results,
  };
}

/**
 * 手数料を考慮した損益分岐点を計算
 */
export function calculateBreakEvenPrice(
  entryPrice: number,
  quantity: number,
  calculator: CommissionCalculator,
  includeFx = false
): number {
  // 往復の手数料を計算
  const roundTrip = calculator.calculateRoundTripCommission(
    entryPrice,
    entryPrice, // 仮に同じ価格で売却
    quantity,
    includeFx
  );
  
  // 損益分岐点 = エントリー価格 + (往復手数料 / 数量)
  const breakEvenPrice = entryPrice + (roundTrip.totalCommission / quantity);
  
  return breakEvenPrice;
}

// ============================================================================
// Singleton Export
// ============================================================================

import { createSingleton } from '../utils/singleton';

// market をキャプチャして、createSingletonの期待する型に合わせる
const makeCreateCalculator = (market: Market) => {
  return (config?: Partial<CommissionConfig>) => new CommissionCalculator(market, config);
};

// market は 'japan' または 'usa' のいずれかとして、シングルトンを作成
// 注意: market は実行時に決定される想定。ここでは 'japan' をデフォルトとする
const { getInstance, resetInstance } = createSingleton(makeCreateCalculator('japan' as Market));

export const getGlobalCommissionCalculator = getInstance;
export const resetGlobalCommissionCalculator = resetInstance;

export default CommissionCalculator;
