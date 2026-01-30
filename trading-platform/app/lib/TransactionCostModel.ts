/**
 * Transaction Cost Model
 * Calculates trading fees, slippage, and total transaction costs
 * for Japanese brokers (SBI Securities, Rakuten Securities)
 */

export type BrokerType = 'SBI' | 'Rakuten';
export type TradeType = 'buy' | 'sell';
export type SettlementType = 'same-day' | '4-day';
export type MarketCondition = 'normal' | 'volatile' | 'favorable';

export interface FeeStructure {
  sameDayRate: number;
  fourDayRate: number;
  minimumFee: number;
  pointRebateRate?: number;
}

export interface TransactionCostResult {
  broker: BrokerType | string;
  feeRate: number;
  tradingFee: number;
  settlementType?: SettlementType;
  slippage?: number;
  totalCost?: number;
  netAmount?: number;
  pointRebate?: number;
  netCost?: number;
  error?: string;
  slippageRate?: number;
  slippageAmount?: number;
}

export interface SBIFeeOptions {
  monthlyVolume?: number;
}

export interface RakutenFeeOptions {
  usePoints?: boolean;
  pointRate?: number;
}

export interface SlippageOptions {
  priceImprovement?: boolean;
}

export interface TotalCostParams {
  tradeAmount: number;
  shares: number;
  broker: BrokerType | string;
  marketCondition: MarketCondition;
  dailyVolume?: number;
  settlementType?: SettlementType;
}

export interface RoundTripCostParams {
  entryAmount: number;
  exitAmount: number;
  shares: number;
  broker: BrokerType | string;
  marketCondition: MarketCondition;
  dailyVolume?: number;
  holdingDays?: number;
  settlementType?: SettlementType;
}

export interface RoundTripResult {
  entryCost: number;
  exitCost: number;
  totalRoundTripCost: number;
  breakEvenPrice: number;
  netResult: number;
  requiredProfitPercent: number;
  slippage: number;
  totalFees: number;
}

export interface BrokerComparison {
  SBI: TransactionCostResult;
  Rakuten: TransactionCostResult;
  recommended: {
    broker: BrokerType;
    savings: number;
  };
}

export interface BrokerProfile {
  monthlyVolume: number;
  avgTradeSize: number;
  tradesPerMonth: number;
  preferredSettlement?: SettlementType;
}

export interface BrokerRecommendation {
  broker: BrokerType;
  reason: string;
  estimatedMonthlySavings: number;
}

export interface TransactionRecord {
  symbol: string;
  tradeAmount: number;
  tradingFee: number;
  slippage: number;
  timestamp: string;
  broker?: BrokerType;
  tradeType?: TradeType;
}

export interface MonthlyStatistics {
  totalTrades: number;
  totalFees: number;
  totalSlippage: number;
  totalCosts: number;
  averageCostPerTrade: number;
  averageFeePerTrade: number;
  averageSlippagePerTrade: number;
  costToVolumeRatio: number;
}

export interface TradeData {
  entry: number;
  exit: number;
  grossProfit: number;
}

export interface CostImpactResult {
  totalGrossProfit: number;
  totalCosts: number;
  netProfit: number;
  costImpactPercent: number;
  averageCostPerTrade: number;
  tradeCount: number;
}

export class TransactionCostModel {
  private readonly MINIMUM_FEE = 275;
  private readonly SBI_SAME_DAY_RATE = 0.00495; // 0.495%
  private readonly SBI_FOUR_DAY_RATE = 0.0099; // 0.99%
  private readonly RAKUTEN_RATE = 0.00539; // 0.539%
  private readonly VOLUME_DISCOUNT_THRESHOLD = 5000000; // 5M yen
  private readonly VOLUME_DISCOUNT_RATE = 0.9; // 10% discount

  private transactionHistory: TransactionRecord[] = [];

  /**
   * Calculate SBI Securities trading fees
   */
  calculateSBIFees(
    tradeAmount: number,
    shares: number,
    settlementType: SettlementType,
    options: SBIFeeOptions = {}
  ): TransactionCostResult {
    if (tradeAmount <= 0 || shares <= 0) {
      return {
        broker: 'SBI',
        feeRate: 0,
        tradingFee: 0,
        settlementType,
        netAmount: tradeAmount
      };
    }

    let feeRate = settlementType === 'same-day' 
      ? this.SBI_SAME_DAY_RATE 
      : this.SBI_FOUR_DAY_RATE;

    // Apply volume discount
    if (options.monthlyVolume && options.monthlyVolume > this.VOLUME_DISCOUNT_THRESHOLD) {
      feeRate *= this.VOLUME_DISCOUNT_RATE;
    }

    const calculatedFee = tradeAmount * feeRate;
    const tradingFee = Math.max(calculatedFee, this.MINIMUM_FEE);

    return {
      broker: 'SBI',
      feeRate,
      tradingFee: Math.round(tradingFee),
      settlementType,
      netAmount: tradeAmount - Math.round(tradingFee)
    };
  }

  /**
   * Calculate Rakuten Securities trading fees
   */
  calculateRakutenFees(
    tradeAmount: number,
    shares: number,
    options: RakutenFeeOptions = {}
  ): TransactionCostResult {
    if (tradeAmount <= 0 || shares <= 0) {
      return {
        broker: 'Rakuten',
        feeRate: 0,
        tradingFee: 0,
        netAmount: tradeAmount
      };
    }

    const feeRate = this.RAKUTEN_RATE;
    const calculatedFee = tradeAmount * feeRate;
    const tradingFee = Math.max(calculatedFee, this.MINIMUM_FEE);
    const roundedFee = Math.round(tradingFee);

    let pointRebate = 0;
    let netCost = roundedFee;

    if (options.usePoints && options.pointRate) {
      pointRebate = roundedFee * options.pointRate;
      netCost = roundedFee - pointRebate;
    }

    return {
      broker: 'Rakuten',
      feeRate,
      tradingFee: roundedFee,
      netAmount: tradeAmount - roundedFee,
      pointRebate: pointRebate > 0 ? Math.round(pointRebate * 100) / 100 : undefined,
      netCost: pointRebate > 0 ? Math.round(netCost * 100) / 100 : undefined
    };
  }

  /**
   * Estimate slippage based on market conditions and order size
   */
  estimateSlippage(
    tradeAmount: number,
    marketCondition: MarketCondition,
    dailyVolume: number,
    options: SlippageOptions = {}
  ): { slippageRate: number; slippageAmount: number } {
    if (tradeAmount <= 0 || dailyVolume <= 0) {
      return { slippageRate: 0, slippageAmount: 0 };
    }

    // Base slippage rate
    let slippageRate: number;

    if (options.priceImprovement) {
      // Favorable execution with price improvement
      slippageRate = -0.001; // -0.1% (negative means better price)
    } else if (marketCondition === 'volatile') {
      slippageRate = 0.005 + Math.random() * 0.005; // 0.5% - 1.0%
    } else if (marketCondition === 'normal') {
      slippageRate = 0.001 + Math.random() * 0.002; // 0.1% - 0.3%
    } else {
      slippageRate = 0.001;
    }

    // Adjust for liquidity (daily volume relative to trade size)
    const volumeRatio = tradeAmount / dailyVolume;
    
    if (dailyVolume >= 100000000) {
      // Very liquid stock
      slippageRate *= 0.5; // Reduce slippage by 50%
    } else if (volumeRatio > 0.5) {
      // Large order relative to volume
      slippageRate *= 2; // Double the slippage
    } else if (volumeRatio > 0.1) {
      slippageRate *= 1.5;
    }

    // Ensure reasonable bounds
    if (marketCondition === 'normal') {
      if (dailyVolume >= 100000000) {
        // Very liquid stock - ensure <= 0.1%
        slippageRate = Math.min(slippageRate, 0.001);
      } else {
        slippageRate = Math.min(Math.max(slippageRate, 0.001), 0.003);
      }
    } else if (marketCondition === 'volatile') {
      slippageRate = Math.min(Math.max(slippageRate, 0.005), 0.01);
    }

    const slippageAmount = tradeAmount * slippageRate;

    return {
      slippageRate: Math.round(slippageRate * 1000000) / 1000000,
      slippageAmount: Math.round(slippageAmount)
    };
  }

  /**
   * Calculate total transaction cost including fees and slippage
   */
  calculateTotalCost(params: TotalCostParams): TransactionCostResult {
    const { tradeAmount, shares, broker, marketCondition, dailyVolume = 1000000, settlementType = 'same-day' } = params;

    if (tradeAmount <= 0 || shares <= 0) {
      return {
        broker,
        feeRate: 0,
        tradingFee: 0,
        slippage: 0,
        totalCost: 0,
        netAmount: tradeAmount
      };
    }

    // Validate broker
    if (broker !== 'SBI' && broker !== 'Rakuten') {
      return {
        broker,
        feeRate: 0,
        tradingFee: 0,
        slippage: 0,
        totalCost: 0,
        netAmount: tradeAmount,
        error: 'Invalid broker type'
      };
    }

    // Calculate fees based on broker
    let feeResult: TransactionCostResult;
    if (broker === 'SBI') {
      feeResult = this.calculateSBIFees(tradeAmount, shares, settlementType);
    } else {
      feeResult = this.calculateRakutenFees(tradeAmount, shares);
    }

    // Calculate slippage
    const slippageResult = this.estimateSlippage(tradeAmount, marketCondition, dailyVolume);

    const totalCost = feeResult.tradingFee + slippageResult.slippageAmount;

    return {
      broker,
      feeRate: feeResult.feeRate,
      tradingFee: feeResult.tradingFee,
      settlementType,
      slippage: slippageResult.slippageAmount,
      totalCost,
      netAmount: tradeAmount - totalCost
    };
  }

  /**
   * Calculate round-trip cost (entry + exit)
   */
  calculateRoundTripCost(params: RoundTripCostParams): RoundTripResult {
    const { 
      entryAmount, 
      exitAmount, 
      shares, 
      broker, 
      marketCondition, 
      dailyVolume = 1000000,
      settlementType = 'same-day'
    } = params;

    // Entry cost
    const entryCost = this.calculateTotalCost({
      tradeAmount: entryAmount,
      shares,
      broker,
      marketCondition,
      dailyVolume,
      settlementType
    });

    // Exit cost (use same condition for simplicity)
    const exitCost = this.calculateTotalCost({
      tradeAmount: exitAmount,
      shares,
      broker,
      marketCondition,
      dailyVolume,
      settlementType
    });

    const totalRoundTripCost = entryCost.totalCost! + exitCost.totalCost!;
    const totalFees = entryCost.tradingFee + exitCost.tradingFee;
    const totalSlippage = (entryCost.slippage || 0) + (exitCost.slippage || 0);

    // Calculate break-even price
    const breakEvenPrice = entryAmount + totalRoundTripCost;

    // Calculate net result
    const grossProfit = exitAmount - entryAmount;
    const netResult = grossProfit - totalRoundTripCost;

    // Calculate required profit percentage
    const requiredProfitPercent = totalRoundTripCost / entryAmount;

    return {
      entryCost: entryCost.totalCost!,
      exitCost: exitCost.totalCost!,
      totalRoundTripCost,
      breakEvenPrice,
      netResult,
      requiredProfitPercent: Math.round(requiredProfitPercent * 10000) / 100,
      slippage: totalSlippage,
      totalFees
    };
  }

  /**
   * Compare fees between different brokers
   */
  compareBrokers(
    tradeAmount: number,
    shares: number,
    settlementType: SettlementType
  ): BrokerComparison {
    const sbiResult = this.calculateSBIFees(tradeAmount, shares, settlementType);
    const rakutenResult = this.calculateRakutenFees(tradeAmount, shares);

    const sbiTotal = sbiResult.tradingFee;
    const rakutenTotal = rakutenResult.tradingFee;

    let recommended: BrokerType;
    let savings: number;

    if (sbiTotal < rakutenTotal) {
      recommended = 'SBI';
      savings = rakutenTotal - sbiTotal;
    } else {
      recommended = 'Rakuten';
      savings = sbiTotal - rakutenTotal;
    }

    return {
      SBI: sbiResult,
      Rakuten: rakutenResult,
      recommended: {
        broker: recommended,
        savings
      }
    };
  }

  /**
   * Recommend broker based on trading profile
   */
  recommendBroker(profile: BrokerProfile): BrokerRecommendation {
    const { monthlyVolume, avgTradeSize, tradesPerMonth, preferredSettlement = 'same-day' } = profile;

    // Sample calculation for one trade
    const sbiFee = this.calculateSBIFees(avgTradeSize, 1, preferredSettlement, { monthlyVolume });
    const rakutenFee = this.calculateRakutenFees(avgTradeSize, 1);

    const sbiTotalMonthly = sbiFee.tradingFee * tradesPerMonth;
    const rakutenTotalMonthly = rakutenFee.tradingFee * tradesPerMonth;

    let broker: BrokerType;
    let reason: string;
    let estimatedMonthlySavings: number;

    if (monthlyVolume > this.VOLUME_DISCOUNT_THRESHOLD && preferredSettlement === 'same-day') {
      broker = 'SBI';
      reason = 'High trading volume qualifies for SBI discount with same-day settlement';
      estimatedMonthlySavings = rakutenTotalMonthly - sbiTotalMonthly;
    } else if (sbiTotalMonthly < rakutenTotalMonthly) {
      broker = 'SBI';
      reason = 'Lower fees based on your trading pattern';
      estimatedMonthlySavings = rakutenTotalMonthly - sbiTotalMonthly;
    } else {
      broker = 'Rakuten';
      reason = 'Rakuten points and competitive pricing';
      estimatedMonthlySavings = sbiTotalMonthly - rakutenTotalMonthly;
    }

    return {
      broker,
      reason,
      estimatedMonthlySavings: Math.max(0, estimatedMonthlySavings)
    };
  }

  /**
   * Record a transaction for tracking
   */
  recordTransaction(transaction: TransactionRecord): void {
    this.transactionHistory.push({
      ...transaction,
      timestamp: transaction.timestamp || new Date().toISOString()
    });
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): TransactionRecord[] {
    return [...this.transactionHistory];
  }

  /**
   * Calculate monthly statistics
   */
  getMonthlyStatistics(): MonthlyStatistics {
    if (this.transactionHistory.length === 0) {
      return {
        totalTrades: 0,
        totalFees: 0,
        totalSlippage: 0,
        totalCosts: 0,
        averageCostPerTrade: 0,
        averageFeePerTrade: 0,
        averageSlippagePerTrade: 0,
        costToVolumeRatio: 0
      };
    }

    const totalTrades = this.transactionHistory.length;
    const totalFees = this.transactionHistory.reduce((sum, t) => sum + t.tradingFee, 0);
    const totalSlippage = this.transactionHistory.reduce((sum, t) => sum + t.slippage, 0);
    const totalVolume = this.transactionHistory.reduce((sum, t) => sum + t.tradeAmount, 0);
    const totalCosts = totalFees + totalSlippage;

    return {
      totalTrades,
      totalFees,
      totalSlippage,
      totalCosts,
      averageCostPerTrade: Math.round(totalCosts / totalTrades),
      averageFeePerTrade: Math.round(totalFees / totalTrades),
      averageSlippagePerTrade: Math.round(totalSlippage / totalTrades),
      costToVolumeRatio: totalVolume > 0 ? totalCosts / totalVolume : 0
    };
  }

  /**
   * Calculate cost impact on returns
   */
  calculateCostImpact(trades: TradeData[], broker: BrokerType): CostImpactResult {
    if (trades.length === 0) {
      return {
        totalGrossProfit: 0,
        totalCosts: 0,
        netProfit: 0,
        costImpactPercent: 0,
        averageCostPerTrade: 0,
        tradeCount: 0
      };
    }

    const totalGrossProfit = trades.reduce((sum, trade) => sum + trade.grossProfit, 0);
    
    // Calculate costs for each trade (round-trip)
    let totalCosts = 0;
    for (const trade of trades) {
      const roundTripCost = this.calculateRoundTripCost({
        entryAmount: trade.entry,
        exitAmount: trade.exit,
        shares: 1,
        broker,
        marketCondition: 'normal',
        dailyVolume: 1000000
      });
      totalCosts += roundTripCost.totalRoundTripCost;
    }

    const netProfit = totalGrossProfit - totalCosts;
    const costImpactPercent = totalGrossProfit !== 0 ? (totalCosts / Math.abs(totalGrossProfit)) * 100 : 0;

    return {
      totalGrossProfit,
      totalCosts,
      netProfit,
      costImpactPercent: Math.round(costImpactPercent * 100) / 100,
      averageCostPerTrade: Math.round(totalCosts / trades.length),
      tradeCount: trades.length
    };
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.transactionHistory = [];
  }
}

// Export singleton instance
export const transactionCostModel = new TransactionCostModel();

export default TransactionCostModel;
