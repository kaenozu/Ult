/**
 * TradingEnvironment.ts
 * 
 * Trading environment simulator for reinforcement learning
 */

import { OHLCV } from '../../../types/shared';
import {
  EnvironmentConfig,
  State,
  Action,
  ActionType,
  StepResult,
  MarketState,
  PortfolioState,
  DEFAULT_ENVIRONMENT_CONFIG,
} from './types';

/**
 * Trading environment for RL agent
 */
export class TradingEnvironment {
  private config: EnvironmentConfig;
  private marketData: OHLCV[];
  private currentIndex: number;
  private cash: number;
  private positions: number;
  private initialCapital: number;
  private stepCount: number;
  private episodeReward: number;
  private returns: number[];
  private previousPortfolioValue: number;

  constructor(
    marketData: OHLCV[],
    config: Partial<EnvironmentConfig> = {}
  ) {
    this.config = { ...DEFAULT_ENVIRONMENT_CONFIG, ...config };
    this.marketData = marketData;
    this.initialCapital = this.config.initialCapital;
    this.cash = this.initialCapital;
    this.positions = 0;
    this.currentIndex = 0;
    this.stepCount = 0;
    this.episodeReward = 0;
    this.returns = [];
    this.previousPortfolioValue = this.initialCapital;
  }

  /**
   * Reset environment to initial state
   */
  reset(): State {
    this.cash = this.initialCapital;
    this.positions = 0;
    this.currentIndex = Math.floor(Math.random() * (this.marketData.length - 200));
    this.stepCount = 0;
    this.episodeReward = 0;
    this.returns = [];
    this.previousPortfolioValue = this.initialCapital;

    return this.getState();
  }

  /**
   * Execute one step in the environment
   */
  step(action: Action): StepResult {
    const currentPrice = this.getCurrentPrice();
    const nextIndex = this.currentIndex + 1;

    if (nextIndex >= this.marketData.length) {
      // Episode ended - no more data
      return {
        state: this.getState(),
        reward: 0,
        done: true,
        info: this.getInfo(),
      };
    }

    // Execute action
    const transactionCost = this.executeAction(action, currentPrice);

    // Move to next state
    this.currentIndex = nextIndex;
    this.stepCount++;

    // Compute reward
    const nextState = this.getState();
    const reward = this.computeReward(action, transactionCost);
    const done = this.isDone();

    this.episodeReward += reward;

    // Track returns for Sharpe ratio
    const portfolioValue = this.getPortfolioValue();
    const portfolioReturn = (portfolioValue - this.previousPortfolioValue) / this.previousPortfolioValue;
    this.returns.push(portfolioReturn);
    this.previousPortfolioValue = portfolioValue;

    return {
      state: nextState,
      reward,
      done,
      info: this.getInfo(),
    };
  }

  /**
   * Execute trading action
   */
  private executeAction(action: Action, currentPrice: number): number {
    let transactionCost = 0;

    if (action.type === ActionType.HOLD) {
      return 0;
    }

    const portfolioValue = this.getPortfolioValue();
    const maxTradeValue = portfolioValue * this.config.maxPositionSize;

    // Buy actions
    if (
      action.type === ActionType.BUY_SMALL ||
      action.type === ActionType.BUY_MEDIUM ||
      action.type === ActionType.BUY_LARGE
    ) {
      const tradeValue = Math.min(this.cash, maxTradeValue * action.size);
      const sharesBought = Math.floor(tradeValue / (currentPrice * (1 + this.config.slippageRate)));
      const actualCost = sharesBought * currentPrice * (1 + this.config.slippageRate);
      transactionCost = actualCost * this.config.transactionCostRate;

      if (sharesBought > 0 && this.cash >= actualCost + transactionCost) {
        this.positions += sharesBought;
        this.cash -= actualCost + transactionCost;
      }
    }
    // Sell actions
    else if (
      action.type === ActionType.SELL_SMALL ||
      action.type === ActionType.SELL_MEDIUM ||
      action.type === ActionType.SELL_LARGE
    ) {
      const sharesToSell = Math.floor(this.positions * action.size);
      if (sharesToSell > 0) {
        const actualRevenue = sharesToSell * currentPrice * (1 - this.config.slippageRate);
        transactionCost = actualRevenue * this.config.transactionCostRate;

        this.positions -= sharesToSell;
        this.cash += actualRevenue - transactionCost;
      }
    }

    return transactionCost;
  }

  /**
   * Compute reward for current step
   */
  private computeReward(action: Action, transactionCost: number): number {
    // Portfolio return
    const portfolioValue = this.getPortfolioValue();
    const portfolioReturn = (portfolioValue - this.previousPortfolioValue) / this.previousPortfolioValue;

    // Sharpe ratio based reward
    const sharpeRatio = this.computeSharpeRatio();

    // Risk penalty based on volatility
    const volatility = this.computeVolatility();
    const riskPenalty = volatility * 0.5;

    // Transaction cost penalty
    const costPenalty = transactionCost / this.initialCapital;

    // Combined reward
    const reward = portfolioReturn + sharpeRatio * 0.1 - riskPenalty - costPenalty;

    return reward;
  }

  /**
   * Compute Sharpe ratio
   */
  private computeSharpeRatio(): number {
    if (this.returns.length < 2) {
      return 0;
    }

    const mean = this.returns.reduce((a, b) => a + b, 0) / this.returns.length;
    const variance = this.returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.returns.length;
    const std = Math.sqrt(variance);

    if (std === 0) {
      return 0;
    }

    // Annualized Sharpe ratio
    const excessReturn = mean - this.config.riskFreeRate / 252; // Daily risk-free rate
    return (excessReturn / std) * Math.sqrt(252);
  }

  /**
   * Compute portfolio volatility
   */
  private computeVolatility(): number {
    if (this.returns.length < 2) {
      return 0;
    }

    const mean = this.returns.reduce((a, b) => a + b, 0) / this.returns.length;
    const variance = this.returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Check if episode is done
   */
  private isDone(): boolean {
    const portfolioValue = this.getPortfolioValue();
    
    return (
      this.stepCount >= this.config.maxSteps ||
      portfolioValue <= this.config.minCapital ||
      this.currentIndex >= this.marketData.length - 1
    );
  }

  /**
   * Get current state
   */
  private getState(): State {
    const marketState = this.getMarketState();
    const portfolioState = this.getPortfolioState();
    const normalized = this.normalizeState(marketState, portfolioState);

    return {
      market: marketState,
      portfolio: portfolioState,
      normalized,
    };
  }

  /**
   * Get market state
   */
  private getMarketState(): MarketState {
    const lookback = 20;
    const startIndex = Math.max(0, this.currentIndex - lookback);
    const historyData = this.marketData.slice(startIndex, this.currentIndex + 1);

    const prices = historyData.map(d => d.close);
    const volumes = historyData.map(d => d.volume);

    // Compute technical indicators
    const rsi = this.computeRSI(prices);
    const macd = this.computeMACD(prices);
    const sma20 = this.computeSMA(prices, 20);
    const sma50 = this.computeSMA(prices, Math.min(50, prices.length));
    const bb = this.computeBollingerBands(prices);
    const atr = this.computeATR(historyData);

    return {
      prices,
      volumes,
      indicators: {
        rsi,
        macd,
        sma20,
        sma50,
        bbUpper: bb.upper,
        bbLower: bb.lower,
        atr,
      },
      timestamp: new Date(historyData[historyData.length - 1].date).getTime(),
    };
  }

  /**
   * Get portfolio state
   */
  private getPortfolioState(): PortfolioState {
    const currentPrice = this.getCurrentPrice();
    const marketValue = this.positions * currentPrice;
    const portfolioValue = this.cash + marketValue;
    const unrealizedPnL = marketValue - (this.initialCapital - this.cash);
    const realizedPnL = portfolioValue - this.initialCapital;

    return {
      cash: this.cash,
      positions: this.positions,
      portfolioValue,
      unrealizedPnL,
      realizedPnL,
    };
  }

  /**
   * Normalize state for neural network
   */
  private normalizeState(market: MarketState, portfolio: PortfolioState): number[] {
    const normalized: number[] = [];

    // Normalize prices (percentage change from first price)
    const basePrice = market.prices[0];
    for (let i = Math.max(0, market.prices.length - 10); i < market.prices.length; i++) {
      normalized.push((market.prices[i] - basePrice) / basePrice);
    }

    // Pad if necessary
    while (normalized.length < 10) {
      normalized.unshift(0);
    }

    // Normalize volumes
    const maxVolume = Math.max(...market.volumes);
    for (let i = Math.max(0, market.volumes.length - 5); i < market.volumes.length; i++) {
      normalized.push(market.volumes[i] / maxVolume);
    }

    // Pad volumes
    while (normalized.length < 15) {
      normalized.push(0);
    }

    // Normalize indicators
    normalized.push(market.indicators.rsi / 100);
    normalized.push(Math.tanh(market.indicators.macd));
    normalized.push((market.prices[market.prices.length - 1] - market.indicators.sma20) / market.indicators.sma20);
    normalized.push((market.prices[market.prices.length - 1] - market.indicators.sma50) / market.indicators.sma50);
    normalized.push((market.prices[market.prices.length - 1] - market.indicators.bbLower) / 
                    (market.indicators.bbUpper - market.indicators.bbLower));

    // Normalize portfolio
    normalized.push(portfolio.cash / this.initialCapital);
    normalized.push((portfolio.positions * this.getCurrentPrice()) / this.initialCapital);
    normalized.push(portfolio.portfolioValue / this.initialCapital);
    normalized.push(Math.tanh(portfolio.realizedPnL / this.initialCapital));

    // Pad to state size (50)
    while (normalized.length < 50) {
      normalized.push(0);
    }

    return normalized.slice(0, 50);
  }

  /**
   * Get current price
   */
  private getCurrentPrice(): number {
    return this.marketData[this.currentIndex].close;
  }

  /**
   * Get portfolio value
   */
  private getPortfolioValue(): number {
    return this.cash + this.positions * this.getCurrentPrice();
  }

  /**
   * Get info about current state
   */
  private getInfo(): {
    portfolioValue: number;
    totalReturn: number;
    sharpeRatio: number;
    transactionCost: number;
    riskPenalty: number;
  } {
    const portfolioValue = this.getPortfolioValue();
    const totalReturn = (portfolioValue - this.initialCapital) / this.initialCapital;
    const sharpeRatio = this.computeSharpeRatio();

    return {
      portfolioValue,
      totalReturn,
      sharpeRatio,
      transactionCost: 0,
      riskPenalty: this.computeVolatility() * 0.5,
    };
  }

  // ============================================================================
  // Technical Indicator Calculations
  // ============================================================================

  private computeRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50;
    }

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private computeMACD(prices: number[]): number {
    const ema12 = this.computeEMA(prices, 12);
    const ema26 = this.computeEMA(prices, 26);
    return ema12 - ema26;
  }

  private computeEMA(prices: number[], period: number): number {
    if (prices.length === 0) {
      return 0;
    }

    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
  }

  private computeSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      period = prices.length;
    }

    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private computeBollingerBands(prices: number[], period: number = 20): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.computeSMA(prices, period);
    const recentPrices = prices.slice(-Math.min(period, prices.length));
    
    const variance = recentPrices.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / recentPrices.length;
    const std = Math.sqrt(variance);

    return {
      upper: sma + 2 * std,
      middle: sma,
      lower: sma - 2 * std,
    };
  }

  private computeATR(data: OHLCV[], period: number = 14): number {
    if (data.length < 2) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    const recentTR = trueRanges.slice(-Math.min(period, trueRanges.length));
    return recentTR.reduce((a, b) => a + b, 0) / recentTR.length;
  }
}
