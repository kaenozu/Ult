import { EventEmitter } from 'events';
import { OHLCV } from '@/app/types';
import { BacktestConfig, Trade, Strategy, BacktestResult } from './types';
import { BACKTEST_DEFAULTS, REALISTIC_BACKTEST_DEFAULTS } from '@/app/constants/backtest-config';

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  initialCapital: BACKTEST_DEFAULTS.INITIAL_CAPITAL,
  commission: BACKTEST_DEFAULTS.DEFAULT_COMMISSION,
  slippage: 0.05,
  spread: BACKTEST_DEFAULTS.DEFAULT_SPREAD,
  maxPositionSize: BACKTEST_DEFAULTS.MAX_POSITION_SIZE,
  maxDrawdown: BACKTEST_DEFAULTS.MAX_DRAWDOWN,
  allowShort: BACKTEST_DEFAULTS.ALLOW_SHORT,
  useStopLoss: true,
  useTakeProfit: true,
  riskPerTrade: 2,

  // Realistic defaults
  realisticMode: false,
  market: 'japan',
  averageDailyVolume: REALISTIC_BACKTEST_DEFAULTS.AVERAGE_DAILY_VOLUME,
  slippageEnabled: false,
  commissionEnabled: false,
  partialFillEnabled: false,
  latencyEnabled: false,
  latencyMs: 500,
};

export abstract class BaseBacktestEngine extends EventEmitter {
  protected config: BacktestConfig;
  protected data: Map<string, OHLCV[]> = new Map();
  protected trades: Trade[] = [];
  protected equityCurve: number[] = [];
  protected currentPosition: 'LONG' | 'SHORT' | null = null;
  protected entryPrice: number = 0;
  protected entryDate: string = '';
  protected currentEquity: number = 0;
  protected peakEquity: number = 0;
  protected stopLoss: number = 0;
  protected takeProfit: number = 0;
  protected indicators: Map<string, number[]> = new Map();

  constructor(config: Partial<BacktestConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BACKTEST_CONFIG, ...config };
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
  }

  /**
   * Load data for backtesting
   */
  public loadData(symbol: string, data: OHLCV[]): void {
    this.data.set(symbol, data);
    this.emit('data_loaded', symbol, data.length);
  }

  /**
   * Abstract method to run backtest
   */
  public abstract runBacktest(strategy: Strategy, symbol: string): Promise<BacktestResult>;

  /**
   * Reset state for new backtest run
   */
  protected resetState(): void {
    this.trades = [];
    this.equityCurve = [this.config.initialCapital];
    this.currentPosition = null;
    this.entryPrice = 0;
    this.entryDate = '';
    this.currentEquity = this.config.initialCapital;
    this.peakEquity = this.config.initialCapital;
    this.stopLoss = 0;
    this.takeProfit = 0;
    this.indicators.clear();
  }

  /**
   * Check basic exit conditions (Stop Loss / Take Profit)
   */
  protected checkExitConditions(data: OHLCV): { exitReason: Trade['exitReason'] } | null {
    if (!this.currentPosition) return null;

    const currentPrice = data.close;

    // Check stop loss
    if (this.config.useStopLoss && this.stopLoss > 0) {
      if (this.currentPosition === 'LONG' && currentPrice <= this.stopLoss) {
        return { exitReason: 'stop' };
      }
      if (this.currentPosition === 'SHORT' && currentPrice >= this.stopLoss) {
        return { exitReason: 'stop' };
      }
    }

    // Check take profit
    if (this.config.useTakeProfit && this.takeProfit > 0) {
      if (this.currentPosition === 'LONG' && currentPrice >= this.takeProfit) {
        return { exitReason: 'target' };
      }
      if (this.currentPosition === 'SHORT' && currentPrice <= this.takeProfit) {
        return { exitReason: 'target' };
      }
    }

    return null;
  }

  /**
   * Calculate position size based on risk management rules
   */
  protected calculatePositionSize(price: number, fixedQuantity?: number): number {
    if (fixedQuantity) return fixedQuantity;

    const maxPositionValue = this.currentEquity * (this.config.maxPositionSize / 100);
    return Math.floor(maxPositionValue / price);
  }

  /**
   * Calculate current drawdown percentage
   */
  protected calculateCurrentDrawdown(): number {
    if (this.peakEquity === 0) return 0;
    return ((this.peakEquity - this.currentEquity) / this.peakEquity) * 100;
  }
}
