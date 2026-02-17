/**
 * UnifiedTradingPlatform.ts
 * 
 * 統合トレーディングプラットフォーム。すべてのコンポーネントを統合し、
 * 一貫性のあるAPIを提供する中核システムです。
 */

import { EventEmitter } from 'events';
import { MultiExchangeDataFeed, MarketData } from '../marketDataFeed/MultiExchangeDataFeed';
import { PredictiveAnalyticsEngine, PredictionResult } from '../aiAnalytics/PredictiveAnalyticsEngine';
import { SentimentAnalysisEngine, AggregatedSentiment } from '../sentiment/SentimentAnalysisEngine';
import { AdvancedRiskManager, RiskMetrics, PositionSizingResult } from '../risk/AdvancedRiskManager';
import { AlgorithmicExecutionEngine, ExecutionResult, Order } from '../execution/AlgorithmicExecutionEngine';
import { AdvancedBacktestEngine, BacktestResult, Strategy } from '../backtest/AdvancedBacktestEngine';
import { AlertSystem, AlertCondition, AlertTrigger } from '../alerts/AlertSystem';
import { PaperTradingEnvironment, PaperPortfolio, PaperTrade } from '../paperTrading/PaperTradingEnvironment';
import type { OHLCV } from '../../types';

// Re-export OHLCV for backward compatibility
import { logger } from '@/app/core/logger';
import { TOKENS } from '../di/tokens';
import { container } from '../di/container';
import { BACKTEST_DEFAULTS } from '@/app/constants/backtest-config';
export type { OHLCV };

// ============================================================================
// Types
// ============================================================================

/**
 * OHLCV with timestamp for internal use
 * Extends the shared OHLCV type with timestamp field
 */
export interface OHLCVWithTimestamp extends Omit<OHLCV, 'symbol'> {
  timestamp: number;
}

export interface TradingSignal {
  symbol: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: 'short' | 'medium' | 'long';
  rationale: string[];
  aiPrediction?: PredictionResult;
  sentiment?: AggregatedSentiment;
  timestamp: number;
}

export interface PlatformConfig {
  mode: 'live' | 'paper' | 'backtest';
  initialCapital: number;
  riskLimits: {
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  aiEnabled: boolean;
  sentimentEnabled: boolean;
  autoTrading: boolean;
  exchanges: string[];
  symbols: string[];
}

export interface PlatformStatus {
  isRunning: boolean;
  mode: PlatformConfig['mode'];
  connectedExchanges: string[];
  activePositions: number;
  dailyPnL: number;
  totalPnL: number;
  openOrders: number;
  lastUpdate: number;
}

export interface TradeDecision {
  shouldTrade: boolean;
  signal: TradingSignal | null;
  positionSize: PositionSizingResult | null;
  riskAssessment: {
    approved: boolean;
    reasons: string[];
  };
}

// ============================================================================
// Unified Trading Platform
// ============================================================================

export class UnifiedTradingPlatform extends EventEmitter {
  private config: PlatformConfig;
  private status: PlatformStatus;
  
  // Core components - definite assignment assertion
  private dataFeed!: MultiExchangeDataFeed;
  private aiEngine!: PredictiveAnalyticsEngine;
  private sentimentEngine!: SentimentAnalysisEngine;
  private riskManager!: AdvancedRiskManager;
  private executionEngine!: AlgorithmicExecutionEngine;
  private backtestEngine!: AdvancedBacktestEngine;
  private alertSystem!: AlertSystem;
  private paperTrading!: PaperTradingEnvironment;
  
  // Data storage
  private marketData: Map<string, OHLCVWithTimestamp[]> = new Map();
  private signals: Map<string, TradingSignal> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<PlatformConfig> = {}) {
    super();
    
    this.config = {
      mode: 'paper',
      initialCapital: BACKTEST_DEFAULTS.LARGE_INITIAL_CAPITAL,
      riskLimits: {
        maxPositionSize: BACKTEST_DEFAULTS.MAX_POSITION_SIZE,
        maxDailyLoss: 5, // strategy-specific
        maxDrawdown: BACKTEST_DEFAULTS.CONSERVATIVE_MAX_DRAWDOWN,
      },
      aiEnabled: true,
      sentimentEnabled: true,
      autoTrading: false,
      exchanges: ['binance', 'coinbase'],
      symbols: ['BTCUSD', 'ETHUSD'],
      ...config,
    };

    this.status = {
      isRunning: false,
      mode: this.config.mode,
      connectedExchanges: [],
      activePositions: 0,
      dailyPnL: 0,
      totalPnL: 0,
      openOrders: 0,
      lastUpdate: Date.now(),
    };

    // Initialize components
    this.initializeComponents();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize components (can be overridden for DI)
   * @protected
   */
  protected initializeComponents(): void {
    // Note: Direct instantiation for now.
    // TODO: Migrate to DI container when all services are registered
    this.dataFeed = new MultiExchangeDataFeed();
    this.aiEngine = new PredictiveAnalyticsEngine();
    this.sentimentEngine = new SentimentAnalysisEngine();
    this.riskManager = new AdvancedRiskManager({
      maxPositionSize: this.config.riskLimits.maxPositionSize,
      maxDailyLoss: this.config.riskLimits.maxDailyLoss,
      maxDrawdown: this.config.riskLimits.maxDrawdown,
    });
    this.executionEngine = new AlgorithmicExecutionEngine();
    this.backtestEngine = new AdvancedBacktestEngine();
    this.alertSystem = new AlertSystem();
    this.paperTrading = new PaperTradingEnvironment({
      initialCapital: this.config.initialCapital,
    });
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * プラットフォームを開始
   */
  async start(): Promise<void> {

    try {
      // Start data feed
      await this.dataFeed.connect();
      this.dataFeed.subscribe(this.config.symbols);

      // Start sentiment engine
      if (this.config.sentimentEnabled) {
        this.sentimentEngine.start();
      }

      // Start paper trading if in paper mode
      if (this.config.mode === 'paper') {
        this.paperTrading.start();
      }

      // Start execution engine
      this.executionEngine.start();

      // Start alert system
      // this.alertSystem.start();

      // Start update loop
      this.updateInterval = setInterval(() => {
        this.processUpdateCycle();
      }, 5000); // 5 second update cycle

      this.status.isRunning = true;
      this.emit('started', this.status);
    } catch (error) {
      logger.error('[UnifiedTradingPlatform] Failed to start:', error instanceof Error ? error : new Error(String(error)));
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * プラットフォームを停止
   */
  async stop(): Promise<void> {

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.dataFeed.disconnect();
    this.sentimentEngine.stop();
    this.executionEngine.stop();
    this.paperTrading.stop();

    this.status.isRunning = false;
    this.emit('stopped', this.status);
  }

  /**
   * リセット
   */
  reset(): void {
    this.paperTrading.reset();
    this.marketData.clear();
    this.signals.clear();
    this.emit('reset');
  }

  // ============================================================================
  // Core Processing Cycle
  // ============================================================================

  private async processUpdateCycle(): Promise<void> {
    try {
      // Process market data for each symbol
      for (const symbol of this.config.symbols) {
        await this.processSymbol(symbol);
      }

      // Update status
      this.updateStatus();

      this.emit('cycle_complete', this.status);
    } catch (error) {
      logger.error('[UnifiedTradingPlatform] Update cycle error:', error instanceof Error ? error : new Error(String(error)));
      this.emit('error', error);
    }
  }

  private async processSymbol(symbol: string): Promise<void> {
    // 1. Get latest market data
    const aggregatedData = this.dataFeed.getAggregatedData(symbol);
    if (!aggregatedData) return;

    // Convert to OHLCV and store
    const ohlcv: OHLCVWithTimestamp = {
      date: new Date(aggregatedData.timestamp).toISOString(),
      timestamp: aggregatedData.timestamp,
      open: aggregatedData.price,
      high: aggregatedData.high24h,
      low: aggregatedData.low24h,
      close: aggregatedData.price,
      volume: aggregatedData.volume,
    };

    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, []);
    }
    const data = this.marketData.get(symbol)!;
    data.push(ohlcv);
    if (data.length > 500) data.shift();

    // 2. Process alerts
    this.alertSystem.processMarketData({
      symbol,
      price: aggregatedData.price,
      volume: aggregatedData.volume,
      timestamp: aggregatedData.timestamp,
      indicators: new Map([
        ['price', aggregatedData.price],
        ['volume', aggregatedData.volume],
      ]),
    });

    // 3. AI Prediction (if enabled and enough data)
    let prediction: PredictionResult | undefined;
    if (this.config.aiEnabled && data.length >= 60) {
      prediction = this.aiEngine.predict(symbol, data);
    }

    // 4. Sentiment Analysis (if enabled)
    let sentiment: AggregatedSentiment | undefined;
    if (this.config.sentimentEnabled) {
      sentiment = this.sentimentEngine.getCurrentSentiment(symbol);
    }

    // 5. Generate trading signal
    const signal = this.generateTradingSignal(symbol, prediction, sentiment, ohlcv);
    if (signal) {
      this.signals.set(symbol, signal);
      this.emit('signal_generated', signal);

      // 6. Auto-trading decision
      if (this.config.autoTrading && this.config.mode !== 'backtest') {
        await this.evaluateAndExecuteTrade(signal);
      }
    }

    // 7. Update paper trading
    if (this.config.mode === 'paper') {
      this.paperTrading.processMarketData({
        symbol,
        price: aggregatedData.price,
        bid: aggregatedData.bid,
        ask: aggregatedData.ask,
        volume: aggregatedData.volume,
        timestamp: aggregatedData.timestamp,
      });
    }
  }

  // ============================================================================
  // Signal Generation
  // ============================================================================

  private generateTradingSignal(
    symbol: string,
    prediction?: PredictionResult,
    sentiment?: AggregatedSentiment,
    ohlcv?: OHLCVWithTimestamp
  ): TradingSignal | null {
    if (!prediction && !sentiment) return null;

    let direction: TradingSignal['direction'] = 'HOLD';
    let confidence = 50;
    const rationale: string[] = [];

    // AI prediction contribution
    if (prediction) {
      const predConf = prediction.prediction.confidence * 100;
      
      if (prediction.prediction.direction === 'UP' && predConf > 60) {
        direction = 'BUY';
        confidence = predConf;
        rationale.push(`AI predicts upward movement (${predConf.toFixed(1)}% confidence)`);
      } else if (prediction.prediction.direction === 'DOWN' && predConf > 60) {
        direction = 'SELL';
        confidence = predConf;
        rationale.push(`AI predicts downward movement (${predConf.toFixed(1)}% confidence)`);
      }

      // Add AI rationale
      rationale.push(...prediction.signal.rationale);
    }

    // Sentiment contribution
    if (sentiment) {
      if (sentiment.overallScore > 0.5 && direction !== 'SELL') {
        confidence = Math.min(confidence + 10, 95);
        rationale.push(`Positive sentiment: ${(sentiment.overallScore * 100).toFixed(1)}%`);
      } else if (sentiment.overallScore < -0.5 && direction !== 'BUY') {
        confidence = Math.min(confidence + 10, 95);
        rationale.push(`Negative sentiment: ${(sentiment.overallScore * 100).toFixed(1)}%`);
      }
    }

    if (direction === 'HOLD' || confidence < 60) return null;

    const currentPrice = ohlcv?.close || prediction?.features.sma20 || 0;
    const volatility = prediction?.prediction.volatilityForecast || 20;

    return {
      symbol,
      direction,
      confidence,
      entryPrice: currentPrice,
      targetPrice: direction === 'BUY' 
        ? currentPrice * (1 + volatility / 100) 
        : currentPrice * (1 - volatility / 100),
      stopLoss: direction === 'BUY'
        ? currentPrice * (1 - volatility / 200)
        : currentPrice * (1 + volatility / 200),
      timeHorizon: prediction?.signal.timeHorizon || 'medium',
      rationale,
      aiPrediction: prediction,
      sentiment,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Trade Execution
  // ============================================================================

  private async evaluateAndExecuteTrade(signal: TradingSignal): Promise<void> {
    // 1. Risk assessment
    const portfolio = this.paperTrading.getPortfolio();
    const riskMetrics = this.riskManager.updateRiskMetrics({
      cash: portfolio.cash,
      positions: portfolio.positions.map((p) => ({
        symbol: p.symbol,
        name: p.symbol,
        market: 'usa', // Default market
        side: p.side,
        quantity: p.quantity,
        avgPrice: p.entryPrice,
        currentPrice: p.currentPrice,
        change: 0,
        entryDate: new Date(p.entryTime).toISOString(),
      })),
      totalValue: portfolio.totalValue,
      totalProfit: portfolio.totalPnL,
      dailyPnL: portfolio.dailyPnL,
      orders: [], // Required by Portfolio interface
    });

    // Check if trading is halted
    if (this.riskManager.isHalted()) {
      return;
    }

    // 2. Calculate position size
    const positionSize = this.riskManager.calculatePositionSize({
      capital: portfolio.cash,
      entryPrice: signal.entryPrice,
      stopLossPrice: signal.stopLoss,
      method: 'fixed',
      riskPercent: 2,
    });

    // 3. Execute trade
    if (this.config.mode === 'paper') {
      if (signal.direction === 'BUY') {
        await this.paperTrading.buy(
          signal.symbol,
          positionSize.recommendedSize,
          signal.entryPrice,
          {
            stopLoss: signal.stopLoss,
            takeProfit: signal.targetPrice,
          }
        );
      } else if (signal.direction === 'SELL') {
        // Check if we have a position to sell
        const position = portfolio.positions.find((p) => p.symbol === signal.symbol);
        if (position) {
          await this.paperTrading.sell(signal.symbol, position.quantity);
        }
      }
    }

    this.emit('trade_executed', { signal, positionSize });
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * 手動で注文を送信
   */
  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    options: {
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
      type?: 'MARKET' | 'LIMIT';
    } = {}
  ): Promise<PaperTrade | null> {
    if (this.config.mode === 'paper') {
      if (side === 'BUY') {
        return this.paperTrading.buy(symbol, quantity, options.price, {
          stopLoss: options.stopLoss,
          takeProfit: options.takeProfit,
          type: options.type,
        });
      } else {
        return this.paperTrading.sell(symbol, quantity, options.price, {
          type: options.type,
        });
      }
    }
    return null;
  }

  /**
   * ポジションを決済
   */
  async closePosition(symbol: string): Promise<void> {
    if (this.config.mode === 'paper') {
      await this.paperTrading.closePosition(symbol, 'manual');
    }
  }

  /**
   * バックテストを実行
   */
  async runBacktest(strategy: Strategy, symbol: string): Promise<BacktestResult> {
    const data = this.marketData.get(symbol);
    if (!data) {
      throw new Error(`No data available for ${symbol}`);
    }

    this.backtestEngine.loadData(symbol, data);
    return this.backtestEngine.runBacktest(strategy, symbol);
  }

  /**
   * アラート条件を作成
   */
  createAlert(
    name: string,
    symbol: string,
    type: AlertCondition['type'],
    operator: AlertCondition['operator'],
    value: number | [number, number]
  ): AlertCondition {
    return this.alertSystem.createCondition(name, symbol, type, operator, value);
  }

  /**
   * 設定を更新
   */
  updateConfig(updates: Partial<PlatformConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config_updated', this.config);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getStatus(): PlatformStatus {
    return this.status;
  }

  getConfig(): PlatformConfig {
    return this.config;
  }

  getPortfolio(): PaperPortfolio {
    return this.paperTrading.getPortfolio();
  }

  getSignals(): TradingSignal[] {
    return Array.from(this.signals.values());
  }

  getSignal(symbol: string): TradingSignal | undefined {
    return this.signals.get(symbol);
  }

  getMarketData(symbol: string): OHLCVWithTimestamp[] {
    return this.marketData.get(symbol) || [];
  }

  getRiskMetrics(): RiskMetrics {
    return this.riskManager.getRiskMetrics();
  }

  getAlertHistory(limit?: number): AlertTrigger[] {
    return this.alertSystem.getAlertHistory(limit);
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private setupEventHandlers(): void {
    // Data feed events
    this.dataFeed.on('aggregated_data', (symbol, data) => {
      this.emit('market_data', symbol, data);
    });

    // Alert events
    this.alertSystem.on('alert_triggered', (trigger) => {
      this.emit('alert', trigger);
    });

    // Paper trading events
    this.paperTrading.on('order_filled', (trade) => {
      this.emit('order_filled', trade);
    });

    this.paperTrading.on('trade_closed', (trade) => {
      this.emit('trade_closed', trade);
    });

    // Risk manager events
    this.riskManager.on('risk_alert', (alert) => {
      this.emit('risk_alert', alert);
    });

    this.riskManager.on('trading_halted', (reason) => {
      this.emit('trading_halted', reason);
    });
  }

  private updateStatus(): void {
    const portfolio = this.paperTrading.getPortfolio();
    
    this.status = {
      isRunning: this.status.isRunning,
      mode: this.config.mode,
      connectedExchanges: Array.from(this.dataFeed.getConnectionStatus().keys()),
      activePositions: portfolio.positions.length,
      dailyPnL: portfolio.dailyPnL,
      totalPnL: portfolio.totalPnL,
      openOrders: this.executionEngine.getActiveOrders().length,
      lastUpdate: Date.now(),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

import { createSingleton } from '../utils/singleton';

const { getInstance, resetInstance } = createSingleton(
  (config?: Partial<PlatformConfig>) => new UnifiedTradingPlatform(config)
);

export const getGlobalTradingPlatform = getInstance;
export const resetGlobalTradingPlatform = resetInstance;

export default UnifiedTradingPlatform;

// ============================================================================
// Static Factory Methods
// ============================================================================

/**
 * Register a service in DI container
 * Useful for testing and custom implementations
 */
export function registerService<T>(
  token: symbol,
  factory: () => T,
  singleton = true
): void {
  container.register<T>(token, factory, singleton);
}

/**
 * Reset DI container
 * Useful for testing
 */
export function resetDIContainer(): void {
  container.reset();
}
