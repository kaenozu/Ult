/**
 * WinningAlertEngine.ts
 * 
 * 株取引で勝つためのリアルタイムアラートエンジン
 * 
 * 【機能】
 * - エントリーシグナル検出
 * - イグジットシグナル検出
 * - リスクアラート
 * - プッシュ通知
 * - 市場異常検出
 */

import { OHLCV, Stock, Signal } from '@/app/types';
import { StrategyResult } from '../strategies/WinningStrategyEngine';

// ============================================================================
// Types
// ============================================================================

import { logger } from '@/app/core/logger';
export type AlertType = 
  | 'ENTRY_SIGNAL'
  | 'EXIT_SIGNAL'
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'RISK_WARNING'
  | 'DRAWDOWN_ALERT'
  | 'VOLATILITY_ALERT'
  | 'BREAKOUT'
  | 'TREND_REVERSAL'
  | 'MARKET_ANOMALY'
  | 'CORRELATION_ALERT'
  | 'VOLUME_SPIKE'
  | 'PRICE_GAP'
  | 'NEWS_ALERT';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  symbol: string;
  title: string;
  message: string;
  timestamp: string;
  data: {
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    entryPrice?: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    pnl?: number;
    strategy?: string;
    confidence?: number;
    reason?: string;
  };
  actionable: boolean;
  action?: {
    type: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE';
    price?: number;
    quantity?: number;
  };
  acknowledged: boolean;
}

export interface AlertConfig {
  // エントリーアラート設定
  entrySignals: boolean;
  minConfidence: number; // 最小信頼度
  
  // イグジットアラート設定
  exitSignals: boolean;
  stopLossAlerts: boolean;
  takeProfitAlerts: boolean;
  trailingStopAlerts: boolean;
  
  // リスクアラート設定
  riskWarnings: boolean;
  drawdownThreshold: number; // %
  volatilityThreshold: number; // %
  
  // 市場アラート設定
  breakoutAlerts: boolean;
  trendReversalAlerts: boolean;
  marketAnomalyAlerts: boolean;
  volumeSpikeThreshold: number; // x average
  
  // 通知設定
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundAlerts: boolean;
  desktopNotifications: boolean;
  
  // クールダウン設定（同じアラートの連続送信防止）
  cooldownMinutes: number;
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  entrySignals: true,
  minConfidence: 70,
  exitSignals: true,
  stopLossAlerts: true,
  takeProfitAlerts: true,
  trailingStopAlerts: true,
  riskWarnings: true,
  drawdownThreshold: 10,
  volatilityThreshold: 5,
  breakoutAlerts: true,
  trendReversalAlerts: true,
  marketAnomalyAlerts: true,
  volumeSpikeThreshold: 3,
  pushNotifications: true,
  emailNotifications: false,
  soundAlerts: true,
  desktopNotifications: true,
  cooldownMinutes: 15,
};

export interface PositionAlert {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  alerts: Alert[];
}

// ============================================================================
// Winning Alert Engine
// ============================================================================

class WinningAlertEngine {
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private alertHistory: Map<string, number> = new Map(); // symbol+type -> timestamp
  private activePositions: Map<string, PositionAlert> = new Map();
  private subscribers: Set<(alert: Alert) => void> = new Set();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }

  // ============================================================================
  // Entry Signal Detection
  // ============================================================================

  /**
   * エントリーシグナルを検出
   */
  detectEntrySignal(
    symbol: string,
    strategyResult: StrategyResult,
    currentPrice: number
  ): Alert | null {
    if (!this.config.entrySignals) return null;
    if (strategyResult.confidence < this.config.minConfidence) return null;
    if (strategyResult.signal === 'HOLD') return null;

    const cooldownKey = `${symbol}_ENTRY_${strategyResult.signal}`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'ENTRY_SIGNAL',
      priority: strategyResult.confidence > 85 ? 'HIGH' : 'MEDIUM',
      symbol,
      title: `${strategyResult.signal} Signal - ${symbol}`,
      message: `${strategyResult.strategy}戦略が${strategyResult.signal}シグナルを検出しました。信頼度: ${strategyResult.confidence}%`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentPrice,
        entryPrice: strategyResult.entryPrice,
        stopLoss: strategyResult.stopLoss,
        takeProfit: strategyResult.takeProfit,
        strategy: strategyResult.strategy,
        confidence: strategyResult.confidence,
        reason: strategyResult.reasoning,
      },
      actionable: true,
      action: {
        type: strategyResult.signal,
        price: strategyResult.entryPrice,
      },
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  // ============================================================================
  // Exit Signal Detection
  // ============================================================================

  /**
   * ポジションのイグジットシグナルを検出
   */
  detectExitSignals(
    symbol: string,
    position: PositionAlert,
    currentData: OHLCV
  ): Alert[] {
    const alerts: Alert[] = [];

    if (!this.config.exitSignals) return alerts;

    // ストップロスチェック
    if (this.config.stopLossAlerts && position.stopLoss > 0) {
      if (currentData.low <= position.stopLoss) {
        alerts.push(this.createExitAlert(
          symbol,
          'STOP_LOSS',
          'CRITICAL',
          position.stopLoss,
          position
        ));
      }
    }

    // テイクプロフィットチェック
    if (this.config.takeProfitAlerts && position.takeProfit > 0) {
      if (currentData.high >= position.takeProfit) {
        alerts.push(this.createExitAlert(
          symbol,
          'TAKE_PROFIT',
          'HIGH',
          position.takeProfit,
          position
        ));
      }
    }

    return alerts;
  }

  /**
   * トレーリングストップを更新・検出
   */
  updateTrailingStop(
    symbol: string,
    position: PositionAlert,
    highestPrice: number,
    lowestPrice: number,
    currentPrice: number,
    trailPercent: number = 5
  ): Alert | null {
    if (!this.config.trailingStopAlerts) return null;

    const isLong = position.entryPrice < currentPrice;
    let trailingStop: number;

    if (isLong) {
      trailingStop = highestPrice * (1 - trailPercent / 100);
      if (currentPrice <= trailingStop && currentPrice > position.entryPrice) {
        return this.createExitAlert(
          symbol,
          'TRAILING_STOP',
          'HIGH',
          currentPrice,
          position,
          `Trailing stop triggered at ${trailingStop.toFixed(0)} (High: ${highestPrice.toFixed(0)})`
        );
      }
    } else {
      trailingStop = lowestPrice * (1 + trailPercent / 100);
      if (currentPrice >= trailingStop && currentPrice < position.entryPrice) {
        return this.createExitAlert(
          symbol,
          'TRAILING_STOP',
          'HIGH',
          currentPrice,
          position,
          `Trailing stop triggered at ${trailingStop.toFixed(0)} (Low: ${lowestPrice.toFixed(0)})`
        );
      }
    }

    return null;
  }

  // ============================================================================
  // Risk Alerts
  // ============================================================================

  /**
   * ドローダウンアラートを検出
   */
  detectDrawdownAlert(
    symbol: string,
    currentDrawdown: number,
    peakEquity: number,
    currentEquity: number
  ): Alert | null {
    if (!this.config.riskWarnings) return null;
    if (currentDrawdown < this.config.drawdownThreshold) return null;

    const cooldownKey = `${symbol}_DRAWDOWN`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'DRAWDOWN_ALERT',
      priority: currentDrawdown > 15 ? 'CRITICAL' : 'HIGH',
      symbol,
      title: `Drawdown Alert - ${symbol}`,
      message: `ドローダウンが${currentDrawdown.toFixed(1)}%に達しました。ピーク: ${peakEquity.toLocaleString()}, 現在: ${currentEquity.toLocaleString()}`,
      timestamp: new Date().toISOString(),
      data: {
        changePercent: -currentDrawdown,
      },
      actionable: true,
      action: {
        type: 'CLOSE',
      },
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  /**
   * ボラティリティアラートを検出
   */
  detectVolatilityAlert(
    symbol: string,
    currentPrice: number,
    previousPrice: number,
    atr: number
  ): Alert | null {
    if (!this.config.riskWarnings) return null;

    const priceChange = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
    const volatilityPercent = (atr / currentPrice) * 100;

    if (priceChange < this.config.volatilityThreshold && volatilityPercent < this.config.volatilityThreshold * 2) {
      return null;
    }

    const cooldownKey = `${symbol}_VOLATILITY`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'VOLATILITY_ALERT',
      priority: priceChange > 10 ? 'CRITICAL' : 'HIGH',
      symbol,
      title: `High Volatility - ${symbol}`,
      message: `価格変動: ${priceChange.toFixed(2)}%, ATR: ${volatilityPercent.toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentPrice,
        changePercent: priceChange,
      },
      actionable: false,
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  // ============================================================================
  // Market Alerts
  // ============================================================================

  /**
   * ブレイクアウトアラートを検出
   */
  detectBreakout(
    symbol: string,
    currentPrice: number,
    resistanceLevel: number,
    supportLevel: number,
    volume: number,
    avgVolume: number
  ): Alert | null {
    if (!this.config.breakoutAlerts) return null;

    const volumeSpike = volume > avgVolume * this.config.volumeSpikeThreshold;
    const breakoutUp = currentPrice > resistanceLevel * 0.995;
    const breakoutDown = currentPrice < supportLevel * 1.005;

    if (!breakoutUp && !breakoutDown) return null;

    const cooldownKey = `${symbol}_BREAKOUT_${breakoutUp ? 'UP' : 'DOWN'}`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'BREAKOUT',
      priority: volumeSpike ? 'HIGH' : 'MEDIUM',
      symbol,
      title: `${breakoutUp ? 'Upside' : 'Downside'} Breakout - ${symbol}`,
      message: `${breakoutUp ? '抵抗線' : '支持線'}を突破しました。出来高: ${(volume/avgVolume).toFixed(1)}倍平均`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentPrice,
        volume,
        reason: breakoutUp 
          ? `Resistance broken at ${resistanceLevel.toFixed(0)}` 
          : `Support broken at ${supportLevel.toFixed(0)}`,
      },
      actionable: true,
      action: {
        type: breakoutUp ? 'BUY' : 'SELL',
        price: currentPrice,
      },
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  /**
   * トレンド反転を検出
   */
  detectTrendReversal(
    symbol: string,
    currentSignal: string,
    previousSignal: string,
    currentPrice: number
  ): Alert | null {
    if (!this.config.trendReversalAlerts) return null;
    if (currentSignal === previousSignal) return null;
    if (currentSignal === 'HOLD' || previousSignal === 'HOLD') return null;

    const cooldownKey = `${symbol}_REVERSAL`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'TREND_REVERSAL',
      priority: 'HIGH',
      symbol,
      title: `Trend Reversal - ${symbol}`,
      message: `トレンドが${previousSignal}から${currentSignal}に反転しました`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentPrice,
        reason: `Signal changed from ${previousSignal} to ${currentSignal}`,
      },
      actionable: true,
      action: {
        type: currentSignal as 'BUY' | 'SELL' | 'HOLD',
        price: currentPrice,
      },
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  /**
   * 出来高スパイクを検出
   */
  detectVolumeSpike(
    symbol: string,
    currentVolume: number,
    averageVolume: number,
    currentPrice: number
  ): Alert | null {
    const ratio = currentVolume / averageVolume;
    if (ratio < this.config.volumeSpikeThreshold) return null;

    const cooldownKey = `${symbol}_VOLUME`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'VOLUME_SPIKE',
      priority: ratio > 5 ? 'HIGH' : 'MEDIUM',
      symbol,
      title: `Volume Spike - ${symbol}`,
      message: `出来高が${ratio.toFixed(1)}倍のスパイクを記録しました`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentPrice,
        volume: currentVolume,
      },
      actionable: false,
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  /**
   * 価格ギャップを検出
   */
  detectPriceGap(
    symbol: string,
    previousClose: number,
    currentOpen: number
  ): Alert | null {
    const gapPercent = ((currentOpen - previousClose) / previousClose) * 100;
    const gapThreshold = 3; // 3%

    if (Math.abs(gapPercent) < gapThreshold) return null;

    const cooldownKey = `${symbol}_GAP_${gapPercent > 0 ? 'UP' : 'DOWN'}`;
    if (this.isInCooldown(cooldownKey)) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'PRICE_GAP',
      priority: Math.abs(gapPercent) > 5 ? 'HIGH' : 'MEDIUM',
      symbol,
      title: `${gapPercent > 0 ? 'Up' : 'Down'} Gap - ${symbol}`,
      message: `価格ギャップ: ${gapPercent > 0 ? '+' : ''}${gapPercent.toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      data: {
        price: currentOpen,
        changePercent: gapPercent,
      },
      actionable: false,
      acknowledged: false,
    };

    this.recordAlert(cooldownKey);
    return alert;
  }

  // ============================================================================
  // Position Management
  // ============================================================================

  /**
   * ポジションを登録
   */
  registerPosition(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): void {
    this.activePositions.set(symbol, {
      symbol,
      entryPrice,
      currentPrice: entryPrice,
      stopLoss,
      takeProfit,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      alerts: [],
    });
  }

  /**
   * ポジションを更新
   */
  updatePosition(symbol: string, currentPrice: number): void {
    const position = this.activePositions.get(symbol);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.unrealizedPnl = (currentPrice - position.entryPrice);
    position.unrealizedPnlPercent = (position.unrealizedPnl / position.entryPrice) * 100;
  }

  /**
   * ポジションを削除
   */
  removePosition(symbol: string): void {
    this.activePositions.delete(symbol);
  }

  // ============================================================================
  // Alert Management
  // ============================================================================

  /**
   * アラートを発行
   */
  emitAlert(alert: Alert): void {
    this.alerts.push(alert);
    
    // サブスクライバーに通知
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Alert subscriber error:', error instanceof Error ? error : new Error(String(error)));
      }
    });

    // プッシュ通知
    if (this.config.pushNotifications) {
      this.sendPushNotification(alert);
    }

    // デスクトップ通知
    if (this.config.desktopNotifications && typeof window !== 'undefined') {
      this.sendDesktopNotification(alert);
    }
  }

  /**
   * アラートを確認済みにする
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * 未確認アラートを取得
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * アラート履歴を取得
   */
  getAlertHistory(
    symbol?: string,
    type?: AlertType,
    limit: number = 100
  ): Alert[] {
    let filtered = this.alerts;
    
    if (symbol) {
      filtered = filtered.filter(a => a.symbol === symbol);
    }
    
    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }
    
    return filtered.slice(-limit).reverse();
  }

  /**
   * アラートサブスクリプション
   */
  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createExitAlert(
    symbol: string,
    type: AlertType,
    priority: AlertPriority,
    exitPrice: number,
    position: PositionAlert,
    customMessage?: string
  ): Alert {
    const pnl = (exitPrice - position.entryPrice);
    const pnlPercent = (pnl / position.entryPrice) * 100;

    return {
      id: this.generateAlertId(),
      type,
      priority,
      symbol,
      title: `${type.replace('_', ' ')} - ${symbol}`,
      message: customMessage || `${type.replace('_', ' ')} triggered at ${exitPrice.toFixed(0)}`,
      timestamp: new Date().toISOString(),
      data: {
        price: exitPrice,
        entryPrice: position.entryPrice,
        exitPrice,
        pnl,
        changePercent: pnlPercent,
      },
      actionable: true,
      action: {
        type: 'CLOSE',
        price: exitPrice,
      },
      acknowledged: false,
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isInCooldown(key: string): boolean {
    const lastAlert = this.alertHistory.get(key);
    if (!lastAlert) return false;

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlert < cooldownMs;
  }

  private recordAlert(key: string): void {
    this.alertHistory.set(key, Date.now());
  }

  private async sendPushNotification(alert: Alert): Promise<void> {
    // プッシュ通知の実装（実際のサービスに応じて）
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(alert.title, {
          body: alert.message,
          icon: '/icon.png',
          badge: '/badge.png',
          tag: alert.id,
          requireInteraction: alert.priority === 'CRITICAL',
        });
      } catch (error) {
        logger.error('Push notification failed:', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private sendDesktopNotification(alert: Alert): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/icon.png',
        requireInteraction: alert.priority === 'CRITICAL',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/icon.png',
          });
        }
      });
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AlertConfig {
    return { ...this.config };
  }

  reset(): void {
    this.alerts = [];
    this.alertHistory.clear();
    this.activePositions.clear();
    this.subscribers.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const winningAlertEngine = new WinningAlertEngine();
export default WinningAlertEngine;
