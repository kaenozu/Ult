/**
 * RealisticBacktestExample.ts
 *
 * 現実的なバックテストの使用例
 * リアルなスリッページ、手数料、部分約定、遅延を考慮した
 * バックテストの実装例を示します。
 */

import { AdvancedBacktestEngine, BacktestConfig, Strategy, StrategyContext, StrategyAction } from './AdvancedBacktestEngine';
import { CommissionCalculator } from './CommissionCalculator';
import { SlippageModel } from './SlippageModel';
import { PartialFillSimulator } from './PartialFillSimulator';
import { LatencySimulator, getLatencyPreset } from './LatencySimulator';
import { OHLCV } from '@/app/types';

// ============================================================================
// Example 1: Basic Realistic Backtest
// ============================================================================

/**
 * 日本株の現実的なバックテスト設定
 */
import { logger } from '@/app/core/logger';
export function createJapanRealisticConfig(): BacktestConfig {
  return {
    initialCapital: 1000000, // 100万円
    commission: 0, // CommissionCalculatorを使用するため0に設定
    slippage: 0, // SlippageModelを使用するため0に設定
    spread: 0.01,
    maxPositionSize: 20,
    maxDrawdown: 30,
    allowShort: false, // 日本の個人投資家は通常ショートしない
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
    
    // Realistic mode settings
    realisticMode: true,
    market: 'japan',
    averageDailyVolume: 5000000, // 500万株/日
    slippageEnabled: true,
    commissionEnabled: true,
    partialFillEnabled: true,
    latencyEnabled: true,
    latencyMs: 500, // 500ms
  };
}

/**
 * 米国株の現実的なバックテスト設定
 */
export function createUSARealisticConfig(): BacktestConfig {
  return {
    initialCapital: 10000, // $10,000
    commission: 0,
    slippage: 0,
    spread: 0.005,
    maxPositionSize: 25,
    maxDrawdown: 40,
    allowShort: true, // 米国では空売りが一般的
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
    
    // Realistic mode settings
    realisticMode: true,
    market: 'usa',
    averageDailyVolume: 10000000, // 1000万株/日
    slippageEnabled: true,
    commissionEnabled: true,
    partialFillEnabled: true,
    latencyEnabled: true,
    latencyMs: 200, // 200ms (より低遅延)
  };
}

// ============================================================================
// Example 2: Manual Component Setup
// ============================================================================

/**
 * 各コンポーネントを個別に設定する例
 */
export class ManualRealisticBacktest {
  private engine: AdvancedBacktestEngine;
  private commissionCalc: CommissionCalculator;
  private slippageModel: SlippageModel;
  private partialFillSim: PartialFillSimulator;
  private latencySim: LatencySimulator;
  
  constructor(market: 'japan' | 'usa') {
    // 1. バックテストエンジンの初期化
    const config = market === 'japan' 
      ? createJapanRealisticConfig()
      : createUSARealisticConfig();
    
    this.engine = new AdvancedBacktestEngine(config);
    
    // 2. 手数料計算機の設定
    this.commissionCalc = new CommissionCalculator(market);
    
    if (market === 'japan') {
      // SBI証券のプリセットを適用
      this.commissionCalc.applyBrokerPreset('sbi');
    } else {
      // Interactive Brokersのプリセットを適用
      this.commissionCalc.applyBrokerPreset('interactive_brokers');
    }
    
    // 3. スリッページモデルの設定
    this.slippageModel = new SlippageModel({
      baseSlippage: market === 'japan' ? 0.05 : 0.02,
      spread: market === 'japan' ? 0.01 : 0.005,
      averageDailyVolume: market === 'japan' ? 5000000 : 10000000,
      useTimeOfDaySlippage: true,
      useVolatilitySlippage: true,
      useOrderSizeImpact: true,
      marketImpactModel: 'square_root',
    });
    
    // 4. 部分約定シミュレーターの設定
    this.partialFillSim = new PartialFillSimulator({
      liquidityThreshold: 0.1,
      fillRateModel: 'exponential',
      minImmediateFillRate: 0.2,
      remainingOrderStrategy: 'next_bar',
      maxQueueDuration: 3,
    });
    
    // 5. 遅延シミュレーターの設定
    const latencyPreset = market === 'japan' ? 'retail' : 'institutional';
    this.latencySim = new LatencySimulator(getLatencyPreset(latencyPreset));
  }
  
  /**
   * バックテストを実行
   */
  async runBacktest(data: OHLCV[], strategy: Strategy): Promise<void> {
    this.engine.loadData('TEST', data);
    const result = await this.engine.runBacktest(strategy, 'TEST');
    
    logger.info('=== Backtest Results ===');
    logger.info(`Total Trades: ${result.metrics.totalTrades}`);
    logger.info(`Win Rate: ${result.metrics.winRate.toFixed(2)}%`);
    logger.info(`Total Return: ${result.metrics.totalReturn.toFixed(2)}%`);
    logger.info(`Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
    logger.info(`Max Drawdown: ${result.metrics.maxDrawdown.toFixed(2)}%`);
    
    // 手数料とスリッページの合計を計算
    const totalFees = result.trades.reduce((sum, t) => sum + t.fees, 0);
    logger.info(`\nTotal Fees: $${totalFees.toFixed(2)}`);
    
    if (result.trades.length > 0 && result.trades[0].slippageAmount) {
      const totalSlippage = result.trades.reduce((sum, t) => sum + (t.slippageAmount || 0), 0);
      logger.info(`Total Slippage Cost: $${totalSlippage.toFixed(2)}`);
    }
  }
  
  /**
   * 統計情報を表示
   */
  showStatistics(): void {
    // 遅延統計
    logger.info('\n=== Latency Statistics ===');
    const latencies = Array(1000).fill(null).map(() => 
      this.latencySim.calculateLatency().totalLatency
    );
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    logger.info(`Average Latency: ${avgLatency.toFixed(0)}ms`);
    
    // 手数料例
    logger.info('\n=== Commission Examples ===');
    const smallOrder = this.commissionCalc.calculateCommission(1000, 100, 'BUY');
    logger.info(`Small Order (100 shares @ $1000): $${smallOrder.commission.toFixed(2)} (${smallOrder.effectiveRate.toFixed(3)}%)`);
    
    const largeOrder = this.commissionCalc.calculateCommission(1000, 10000, 'BUY');
    logger.info(`Large Order (10,000 shares @ $1000): $${largeOrder.commission.toFixed(2)} (${largeOrder.effectiveRate.toFixed(3)}%)`);
  }
}

// ============================================================================
// Example 3: Simple Moving Average Strategy with Realistic Mode
// ============================================================================

/**
 * シンプルな移動平均クロスオーバー戦略
 */
export const smaRealisticStrategy: Strategy = {
  name: 'SMA Crossover (Realistic)',
  description: 'Simple Moving Average crossover strategy with realistic costs',
  
  onData: (data: OHLCV, index: number, context: StrategyContext): StrategyAction => {
    const closes = context.data.map(d => d.close);
    
    // 短期・長期移動平均を計算
    const shortPeriod = 5;
    const longPeriod = 20;
    
    if (closes.length < longPeriod) {
      return { action: 'HOLD' };
    }
    
    const shortSMA = closes.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod;
    const longSMA = closes.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod;
    
    // ゴールデンクロス: 買い
    if (shortSMA > longSMA && !context.currentPosition) {
      return {
        action: 'BUY',
        stopLoss: data.close * 0.95, // 5% ストップロス
        takeProfit: data.close * 1.10, // 10% 利確
      };
    }
    
    // デッドクロス: 売り
    if (shortSMA < longSMA && context.currentPosition === 'LONG') {
      return { action: 'CLOSE' };
    }
    
    return { action: 'HOLD' };
  },
  
  onEnd: (result) => {
    logger.info('\n=== Strategy Complete ===');
    logger.info(`Final Equity: $${result.equityCurve[result.equityCurve.length - 1].toFixed(2)}`);
  },
};

// ============================================================================
// Example 4: Comparison between Realistic and Ideal Backtest
// ============================================================================

/**
 * 理想的な環境と現実的な環境でのバックテストを比較
 */
export async function compareRealisticVsIdeal(data: OHLCV[], strategy: Strategy): Promise<void> {
  logger.info('=== Comparing Ideal vs Realistic Backtest ===\n');
  
  // 理想的な環境 (手数料・スリッページなし)
  const idealConfig: BacktestConfig = {
    initialCapital: 100000,
    commission: 0,
    slippage: 0,
    spread: 0,
    maxPositionSize: 20,
    maxDrawdown: 50,
    allowShort: true,
    useStopLoss: true,
    useTakeProfit: true,
    riskPerTrade: 2,
    realisticMode: false,
  };
  
  const idealEngine = new AdvancedBacktestEngine(idealConfig);
  idealEngine.loadData('IDEAL', data);
  const idealResult = await idealEngine.runBacktest(strategy, 'IDEAL');
  
  // 現実的な環境
  const realisticConfig = createJapanRealisticConfig();
  const realisticEngine = new AdvancedBacktestEngine(realisticConfig);
  realisticEngine.loadData('REALISTIC', data);
  const realisticResult = await realisticEngine.runBacktest(strategy, 'REALISTIC');
  
  // 比較結果を表示
  logger.info('Metric                  | Ideal        | Realistic    | Difference');
  logger.info('------------------------|--------------|--------------|------------');
  logger.info(`Total Return           | ${idealResult.metrics.totalReturn.toFixed(2)}%     | ${realisticResult.metrics.totalReturn.toFixed(2)}%     | ${(idealResult.metrics.totalReturn - realisticResult.metrics.totalReturn).toFixed(2)}%`);
  logger.info(`Sharpe Ratio           | ${idealResult.metrics.sharpeRatio.toFixed(2)}       | ${realisticResult.metrics.sharpeRatio.toFixed(2)}       | ${(idealResult.metrics.sharpeRatio - realisticResult.metrics.sharpeRatio).toFixed(2)}`);
  logger.info(`Win Rate               | ${idealResult.metrics.winRate.toFixed(2)}%     | ${realisticResult.metrics.winRate.toFixed(2)}%     | ${(idealResult.metrics.winRate - realisticResult.metrics.winRate).toFixed(2)}%`);
  logger.info(`Max Drawdown           | ${idealResult.metrics.maxDrawdown.toFixed(2)}%    | ${realisticResult.metrics.maxDrawdown.toFixed(2)}%    | ${(realisticResult.metrics.maxDrawdown - idealResult.metrics.maxDrawdown).toFixed(2)}%`);
  logger.info(`Profit Factor          | ${idealResult.metrics.profitFactor.toFixed(2)}       | ${realisticResult.metrics.profitFactor.toFixed(2)}       | ${(idealResult.metrics.profitFactor - realisticResult.metrics.profitFactor).toFixed(2)}`);
  
  const idealFees = idealResult.trades.reduce((sum, t) => sum + t.fees, 0);
  const realisticFees = realisticResult.trades.reduce((sum, t) => sum + t.fees, 0);
  logger.info(`\nTotal Transaction Costs | $${idealFees.toFixed(2)}      | $${realisticFees.toFixed(2)}      | $${(realisticFees - idealFees).toFixed(2)}`);
  
  logger.info('\n✅ Realistic backtest shows the true performance after all costs');
  logger.info('💡 Use realistic mode for production strategies to avoid overfitting');
}

// ============================================================================
// Export Usage Functions
// ============================================================================

export default {
  createJapanRealisticConfig,
  createUSARealisticConfig,
  ManualRealisticBacktest,
  smaRealisticStrategy,
  compareRealisticVsIdeal,
};
