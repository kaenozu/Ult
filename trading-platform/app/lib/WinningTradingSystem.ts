/**
 * WinningTradingSystem.ts
 * 
 * 株取引で勝つための統合トレーディングシステム
 * 
 * 【機能】
 * - 戦略エンジン統合
 * - リスク管理統合
 * - バックテスト統合
 * - アラート統合
 * - 分析統合
 */

import { OHLCV, Stock } from '@/app/types';
import { winningStrategyEngine, StrategyResult, StrategyType } from './strategies';
import { advancedRiskManager, PositionSizingResult } from './risk';
import { winningBacktestEngine, BacktestResult } from './backtest';
import type { PerformanceMetrics } from './backtest/WinningBacktestEngine';
import { winningAlertEngine, Alert, AlertConfig } from './alerts';
import { winningAnalytics, PerformanceReport } from './analytics';
import { marketCorrelationService, MarketSyncData } from './marketCorrelation';

// ============================================================================
// Types
// ============================================================================

export interface TradingSession {
  id: string;
  symbol: string;
  startTime: string;
  endTime?: string;
  strategy: StrategyType;
  initialCapital: number;
  currentCapital: number;
  positions: Map<string, Position>;
  trades: Trade[];
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  marketIndexData?: {
    nikkei225?: OHLCV[];
    sp500?: OHLCV[];
  };
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: string;
  unrealizedPnl: number;
  strategy: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  entryTime: string;
  exitTime: string;
  exitReason: string;
  strategy: string;
}

export interface SystemConfig {
  initialCapital: number;
  maxPositions: number;
  defaultStrategy: StrategyType;
  riskLimits: {
    maxRiskPerTrade: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  alertConfig: Partial<AlertConfig>;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  initialCapital: 1000000,
  maxPositions: 5,
  defaultStrategy: 'ADAPTIVE',
  riskLimits: {
    maxRiskPerTrade: 2,
    maxDailyLoss: 5,
    maxDrawdown: 20,
  },
  alertConfig: {},
};

// ============================================================================
// Winning Trading System
// ============================================================================

class WinningTradingSystem {
  private config: SystemConfig;
  private sessions: Map<string, TradingSession> = new Map();
  private currentSession: TradingSession | null = null;
  private subscribers: Set<(event: SystemEvent) => void> = new Set();

  constructor(config: Partial<SystemConfig> = {}) {
    this.config = { ...DEFAULT_SYSTEM_CONFIG, ...config };
    
    // アラートエンジンの設定
    winningAlertEngine.updateConfig(this.config.alertConfig);
    
    // アラートサブスクリプション
    winningAlertEngine.subscribe((alert) => {
      this.handleAlert(alert);
    });
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * 新しいトレーディングセッションを開始
   */
  startSession(
    symbol: string,
    strategy: StrategyType = this.config.defaultStrategy,
    initialCapital: number = this.config.initialCapital
  ): TradingSession {
    const session: TradingSession = {
      id: `session_${Date.now()}_${symbol}`,
      symbol,
      startTime: new Date().toISOString(),
      strategy,
      initialCapital,
      currentCapital: initialCapital,
      positions: new Map(),
      trades: [],
      status: 'RUNNING',
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    this.emitEvent({
      type: 'SESSION_STARTED',
      sessionId: session.id,
      data: { symbol, strategy, initialCapital },
    });

    return session;
  }

  /**
   * セッションを停止
   */
  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'STOPPED';
    session.endTime = new Date().toISOString();

    // すべてのポジションを決済
    this.closeAllPositions(session);

    this.emitEvent({
      type: 'SESSION_STOPPED',
      sessionId,
      data: { finalCapital: session.currentCapital },
    });
  }

  /**
   * 現在のセッションを取得
   */
  getCurrentSession(): TradingSession | null {
    return this.currentSession;
  }

  /**
   * 市場指数データを更新
   */
  updateMarketIndexData(nikkei225?: OHLCV[], sp500?: OHLCV[]): void {
    if (!this.currentSession) return;
    
    if (!this.currentSession.marketIndexData) {
      this.currentSession.marketIndexData = {};
    }
    
    if (nikkei225) {
      this.currentSession.marketIndexData.nikkei225 = nikkei225;
    }
    if (sp500) {
      this.currentSession.marketIndexData.sp500 = sp500;
    }
  }

  // ============================================================================
  // Trading Logic
  // ============================================================================

  /**
   * 市場データを処理して取引シグナルを生成
   */
  processMarketData(symbol: string, data: OHLCV[]): void {
    const session = this.currentSession;
    if (!session || session.status !== 'RUNNING') return;

    // 戦略を実行
    const strategyResult = winningStrategyEngine.executeStrategy(
      session.strategy,
      data,
      session.currentCapital
    );

    // 現在のポジションをチェック
    const existingPosition = session.positions.get(symbol);

    // エントリーシグナル
    if (strategyResult.signal !== 'HOLD' && !existingPosition) {
      this.evaluateEntry(session, symbol, strategyResult, data, data[data.length - 1]);
    }

    // イグジットシグナル
    if (existingPosition) {
      this.evaluateExit(session, symbol, existingPosition, data[data.length - 1], strategyResult);
    }

    // アラートをチェック
    this.checkAlerts(symbol, strategyResult, data[data.length - 1], existingPosition);
  }

  /**
   * エントリーを評価・実行
   */
  private evaluateEntry(
    session: TradingSession,
    symbol: string,
    strategyResult: StrategyResult,
    stockData: OHLCV[],
    currentData: OHLCV
  ): void {
    // ポジション数チェック
    if (session.positions.size >= this.config.maxPositions) {
      return;
    }

    // 市場相関分析（市場指数データが利用可能な場合）
    let marketSync: MarketSyncData | null = null;
    let positionSizeMultiplier = 1.0;
    
    if (session.marketIndexData) {
      // Create Signal object for market sync analysis
      const signal = {
        symbol,
        type: strategyResult.signal,
        confidence: strategyResult.confidence,
        targetPrice: strategyResult.takeProfit,
        stopLoss: strategyResult.stopLoss,
        reason: strategyResult.strategy,
        predictedChange: ((strategyResult.takeProfit - strategyResult.entryPrice) / strategyResult.entryPrice) * 100,
        predictionDate: currentData.date,
      };

      marketSync = marketCorrelationService.analyzeMarketSync(
        stockData,
        session.marketIndexData.nikkei225 || null,
        session.marketIndexData.sp500 || null,
        signal
      );

      // 市場相関に基づいてエントリーをフィルタリング
      if (marketSync.compositeSignal) {
        const composite = marketSync.compositeSignal;
        
        // 弱気市場での買いシグナルをフィルタリング
        if (strategyResult.signal === 'BUY' && composite.marketTrend === 'BEARISH') {
          // 高相関の場合は待機
          if (composite.correlation > 0.6) {
            console.log(`[WinningTradingSystem] Entry filtered: BEARISH market with HIGH correlation (${composite.correlation.toFixed(2)})`);
            return;
          }
          // 低相関でも信頼度を減衰
          if (composite.confidence === 'LOW') {
            positionSizeMultiplier *= 0.5;
            console.log(`[WinningTradingSystem] Position size reduced by 50% due to BEARISH market`);
          }
        }

        // 強気市場での売りシグナルをフィルタリング
        if (strategyResult.signal === 'SELL' && composite.marketTrend === 'BULLISH') {
          // 高相関の場合は待機
          if (composite.correlation > 0.6) {
            console.log(`[WinningTradingSystem] Entry filtered: BULLISH market with HIGH correlation (${composite.correlation.toFixed(2)})`);
            return;
          }
        }

        // ベータ値に基づいたポジションサイズ調整
        if (composite.beta > 1.5) {
          positionSizeMultiplier *= 0.8; // 高ボラティリティでサイズ削減
          console.log(`[WinningTradingSystem] Position size reduced by 20% due to high beta (${composite.beta.toFixed(2)})`);
        } else if (composite.beta < 0.5) {
          positionSizeMultiplier *= 1.2; // 低ボラティリティでサイズ増加
          console.log(`[WinningTradingSystem] Position size increased by 20% due to low beta (${composite.beta.toFixed(2)})`);
        }
      }
    }

    // リスク管理チェック
    const positionSize = advancedRiskManager.calculateOptimalPositionSize({
      accountBalance: session.currentCapital,
      entryPrice: strategyResult.entryPrice,
      stopLossPrice: strategyResult.stopLoss,
      takeProfitPrice: strategyResult.takeProfit,
      volatility: strategyResult.metadata.volatility / 100,
      marketRegime: strategyResult.metadata.trendStrength > 25 ? 'BULL' : 'SIDEWAYS',
    });

    if (positionSize.recommendedSize <= 0) {
      return;
    }

    // 市場相関に基づいてポジションサイズを調整
    const adjustedSize = Math.floor(positionSize.recommendedSize * positionSizeMultiplier);
    
    if (adjustedSize <= 0) {
      console.log(`[WinningTradingSystem] Position size too small after market correlation adjustment`);
      return;
    }

    // リスクリワード比チェック
    const riskRewardCheck = advancedRiskManager.validateRiskRewardRatio(
      strategyResult.entryPrice,
      strategyResult.stopLoss,
      strategyResult.takeProfit
    );

    if (!riskRewardCheck.valid) {
      console.log(`[WinningTradingSystem] Risk/Reward ratio too low: ${riskRewardCheck.ratio}`);
      return;
    }

    // ベータに基づいた目標価格調整
    let stopLoss = strategyResult.stopLoss;
    let takeProfit = strategyResult.takeProfit;
    
    if (marketSync?.compositeSignal) {
      const adjusted = marketCorrelationService.getBetaAdjustedTargetPrice(
        strategyResult.takeProfit,
        strategyResult.stopLoss,
        marketSync.compositeSignal.beta,
        marketSync.compositeSignal.marketTrend
      );
      stopLoss = adjusted.stopLoss;
      takeProfit = adjusted.targetPrice;
      console.log(`[WinningTradingSystem] Beta-adjusted targets: SL ${stopLoss.toFixed(2)}, TP ${takeProfit.toFixed(2)}`);
    }

    // ポジションを作成
    const position: Position = {
      symbol,
      side: strategyResult.signal === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: strategyResult.entryPrice,
      quantity: adjustedSize,
      stopLoss,
      takeProfit,
      entryTime: currentData.date,
      unrealizedPnl: 0,
      strategy: strategyResult.strategy,
    };

    session.positions.set(symbol, position);

    // アラートエンジンに登録
    winningAlertEngine.registerPosition(
      symbol,
      position.entryPrice,
      position.stopLoss,
      position.takeProfit
    );

    this.emitEvent({
      type: 'POSITION_OPENED',
      sessionId: session.id,
      data: { symbol, position, strategy: strategyResult.strategy },
    });

    console.log(`[WinningTradingSystem] Position opened: ${symbol} ${position.side} @ ${position.entryPrice}`);
  }

  /**
   * イグジットを評価・実行
   */
  private evaluateExit(
    session: TradingSession,
    symbol: string,
    position: Position,
    currentData: OHLCV,
    strategyResult: StrategyResult
  ): void {
    let shouldExit = false;
    let exitPrice = currentData.close;
    let exitReason = '';

    // ストップロスチェック
    if (position.side === 'LONG' && currentData.low <= position.stopLoss) {
      shouldExit = true;
      exitPrice = position.stopLoss;
      exitReason = 'STOP_LOSS';
    } else if (position.side === 'SHORT' && currentData.high >= position.stopLoss) {
      shouldExit = true;
      exitPrice = position.stopLoss;
      exitReason = 'STOP_LOSS';
    }

    // テイクプロフィットチェック
    if (!shouldExit) {
      if (position.side === 'LONG' && currentData.high >= position.takeProfit) {
        shouldExit = true;
        exitPrice = position.takeProfit;
        exitReason = 'TAKE_PROFIT';
      } else if (position.side === 'SHORT' && currentData.low <= position.takeProfit) {
        shouldExit = true;
        exitPrice = position.takeProfit;
        exitReason = 'TAKE_PROFIT';
      }
    }

    // シグナル反転チェック
    if (!shouldExit && strategyResult.signal !== 'HOLD') {
      if ((position.side === 'LONG' && strategyResult.signal === 'SELL') ||
          (position.side === 'SHORT' && strategyResult.signal === 'BUY')) {
        shouldExit = true;
        exitReason = 'SIGNAL_REVERSAL';
      }
    }

    if (shouldExit) {
      this.closePosition(session, symbol, position, exitPrice, exitReason);
    } else {
      // 未実現損益を更新
      const priceDiff = position.side === 'LONG'
        ? currentData.close - position.entryPrice
        : position.entryPrice - currentData.close;
      position.unrealizedPnl = priceDiff * position.quantity;

      // アラートエンジンを更新
      winningAlertEngine.updatePosition(symbol, currentData.close);
    }
  }

  /**
   * ポジションを決済
   */
  private closePosition(
    session: TradingSession,
    symbol: string,
    position: Position,
    exitPrice: number,
    exitReason: string
  ): void {
    const priceDiff = position.side === 'LONG'
      ? exitPrice - position.entryPrice
      : position.entryPrice - exitPrice;
    
    const pnl = priceDiff * position.quantity;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;

    const trade: Trade = {
      id: `trade_${Date.now()}_${symbol}`,
      symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl,
      pnlPercent,
      entryTime: position.entryTime,
      exitTime: new Date().toISOString(),
      exitReason,
      strategy: position.strategy,
    };

    session.trades.push(trade);
    session.currentCapital += pnl;
    session.positions.delete(symbol);

    // アラートエンジンから削除
    winningAlertEngine.removePosition(symbol);

    // 損失を記録（リスク管理用）
    if (pnl < 0) {
      advancedRiskManager.recordLoss(Math.abs(pnl));
    }

    this.emitEvent({
      type: 'POSITION_CLOSED',
      sessionId: session.id,
      data: { symbol, trade },
    });

    console.log(`[WinningTradingSystem] Position closed: ${symbol} P&L: ${pnl.toFixed(0)} (${pnlPercent.toFixed(2)}%)`);
  }

  /**
   * すべてのポジションを決済
   */
  private closeAllPositions(session: TradingSession): void {
    for (const [symbol, position] of session.positions) {
      this.closePosition(session, symbol, position, position.entryPrice, 'SESSION_END');
    }
  }

  // ============================================================================
  // Backtesting
  // ============================================================================

  /**
   * バックテストを実行
   */
  runBacktest(
    symbol: string,
    data: OHLCV[],
    strategy: StrategyType = 'ADAPTIVE'
  ): BacktestResult {
    // 戦略シグナルを生成
    const strategyResults: StrategyResult[] = [];
    for (let i = 50; i < data.length; i++) {
      const result = winningStrategyEngine.executeStrategy(
        strategy,
        data.slice(0, i + 1),
        this.config.initialCapital
      );
      strategyResults.push(result);
    }

    // バックテストを実行
    return winningBacktestEngine.runBacktest(strategyResults, data, symbol);
  }

  /**
   * 複数戦略を比較
   */
  compareStrategies(
    symbol: string,
    data: OHLCV[],
    strategies: StrategyType[]
  ): Map<string, BacktestResult> {
    const results = new Map<string, BacktestResult>();

    for (const strategy of strategies) {
      const result = this.runBacktest(symbol, data, strategy);
      results.set(strategy, result);
    }

    return results;
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /**
   * パフォーマンスレポートを生成
   */
  generatePerformanceReport(sessionId?: string): PerformanceReport | null {
    const session = sessionId 
      ? this.sessions.get(sessionId) 
      : this.currentSession;
    
    if (!session) return null;

    // トレードデータを変換
    const backtestTrades = session.trades.map(t => ({
      id: t.id,
      entryDate: t.entryTime,
      exitDate: t.exitTime,
      symbol: t.symbol,
      side: t.side,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      quantity: t.quantity,
      pnl: t.pnl,
      pnlPercent: t.pnlPercent,
      fees: 0,
      slippage: 0,
      exitReason: t.exitReason as any,
      strategy: t.strategy,
      riskRewardRatio: 0,
      holdingPeriods: 0,
    }));

    // エクイティカーブを構築
    const equityCurve = [session.initialCapital];
    for (const trade of session.trades) {
      equityCurve.push(equityCurve[equityCurve.length - 1] + trade.pnl);
    }

    return winningAnalytics.generatePerformanceReport(backtestTrades, equityCurve);
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  private checkAlerts(
    symbol: string,
    strategyResult: StrategyResult,
    currentData: OHLCV,
    position?: Position
  ): void {
    // エントリーシグナルアラート
    const entryAlert = winningAlertEngine.detectEntrySignal(
      symbol,
      strategyResult,
      currentData.close
    );
    if (entryAlert) {
      winningAlertEngine.emitAlert(entryAlert);
    }

    // ポジションがあればイグジットアラートをチェック
    if (position) {
      const positionAlert = winningAlertEngine.updateTrailingStop(
        symbol,
        {
          symbol,
          entryPrice: position.entryPrice,
          currentPrice: currentData.close,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          unrealizedPnl: position.unrealizedPnl,
          unrealizedPnlPercent: (position.unrealizedPnl / (position.entryPrice * position.quantity)) * 100,
          alerts: [],
        },
        currentData.high,
        currentData.low,
        currentData.close
      );
      
      if (positionAlert) {
        winningAlertEngine.emitAlert(positionAlert);
      }
    }
  }

  private handleAlert(alert: Alert): void {
    this.emitEvent({
      type: 'ALERT',
      sessionId: this.currentSession?.id,
      data: alert,
    });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  private emitEvent(event: SystemEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Event subscriber error:', error);
      }
    });
  }

  subscribe(callback: (event: SystemEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.alertConfig) {
      winningAlertEngine.updateConfig(newConfig.alertConfig);
    }
  }

  getConfig(): SystemConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Types
// ============================================================================

export interface SystemEvent {
  type: 'SESSION_STARTED' | 'SESSION_STOPPED' | 'POSITION_OPENED' | 'POSITION_CLOSED' | 'ALERT';
  sessionId?: string;
  data: any;
}

// ============================================================================
// Singleton Export
// ============================================================================

export const winningTradingSystem = new WinningTradingSystem();
export default WinningTradingSystem;
