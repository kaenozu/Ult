import { 
  Alert, 
  AlertConfig, 
  AlertType, 
  PositionAlert,
  DEFAULT_ALERT_CONFIG,
  StrategyResult,
  OHLCV,
} from './types';
import { 
  detectEntrySignal,
  detectExitSignals,
  updateTrailingStop,
  detectDrawdownAlert,
  detectVolatilityAlert,
} from './conditions';
import {
  detectBreakout,
  detectTrendReversal,
  detectVolumeSpike,
  detectPriceGap,
} from './market-conditions';
import { notificationService } from './notifications';
import { CooldownManager } from './cooldown';
import { logger } from '@/app/core/logger';

class WinningAlertEngine {
  private config: AlertConfig;
  private alerts: Alert[] = [];
  private cooldownManager: CooldownManager;
  private activePositions: Map<string, PositionAlert> = new Map();
  private subscribers: Set<(alert: Alert) => void> = new Set();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
    this.cooldownManager = new CooldownManager(this.config.cooldownMinutes);
  }

  detectEntrySignal(symbol: string, strategyResult: StrategyResult, currentPrice: number): Alert | null {
    return detectEntrySignal(
      symbol,
      strategyResult,
      currentPrice,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectExitSignals(symbol: string, position: PositionAlert, currentData: OHLCV): Alert[] {
    return detectExitSignals(
      symbol,
      position,
      currentData,
      this.config,
      () => this.generateAlertId()
    );
  }

  updateTrailingStop(
    symbol: string,
    position: PositionAlert,
    highestPrice: number,
    lowestPrice: number,
    currentPrice: number,
    trailPercent: number = 5
  ): Alert | null {
    return updateTrailingStop(
      symbol,
      position,
      highestPrice,
      lowestPrice,
      currentPrice,
      trailPercent,
      this.config,
      () => this.generateAlertId()
    );
  }

  detectDrawdownAlert(
    symbol: string,
    currentDrawdown: number,
    peakEquity: number,
    currentEquity: number
  ): Alert | null {
    return detectDrawdownAlert(
      symbol,
      currentDrawdown,
      peakEquity,
      currentEquity,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectVolatilityAlert(
    symbol: string,
    currentPrice: number,
    previousPrice: number,
    atr: number
  ): Alert | null {
    return detectVolatilityAlert(
      symbol,
      currentPrice,
      previousPrice,
      atr,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectBreakout(
    symbol: string,
    currentPrice: number,
    resistanceLevel: number,
    supportLevel: number,
    volume: number,
    avgVolume: number
  ): Alert | null {
    return detectBreakout(
      symbol,
      currentPrice,
      resistanceLevel,
      supportLevel,
      volume,
      avgVolume,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectTrendReversal(
    symbol: string,
    currentSignal: string,
    previousSignal: string,
    currentPrice: number
  ): Alert | null {
    return detectTrendReversal(
      symbol,
      currentSignal,
      previousSignal,
      currentPrice,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectVolumeSpike(
    symbol: string,
    currentVolume: number,
    averageVolume: number,
    currentPrice: number
  ): Alert | null {
    return detectVolumeSpike(
      symbol,
      currentVolume,
      averageVolume,
      currentPrice,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

  detectPriceGap(symbol: string, previousClose: number, currentOpen: number): Alert | null {
    return detectPriceGap(
      symbol,
      previousClose,
      currentOpen,
      this.config,
      this.cooldownManager,
      () => this.generateAlertId()
    );
  }

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

  updatePosition(symbol: string, currentPrice: number): void {
    const position = this.activePositions.get(symbol);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.unrealizedPnl = (currentPrice - position.entryPrice);
    position.unrealizedPnlPercent = (position.unrealizedPnl / position.entryPrice) * 100;
  }

  removePosition(symbol: string): void {
    this.activePositions.delete(symbol);
  }

  emitAlert(alert: Alert): void {
    this.alerts.push(alert);
    
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Alert subscriber error:', error instanceof Error ? error : new Error(String(error)));
      }
    });

    if (this.config.pushNotifications) {
      notificationService.sendPushNotification(alert);
    }

    if (this.config.desktopNotifications && typeof window !== 'undefined') {
      notificationService.sendDesktopNotification(alert);
    }
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  getAlertHistory(symbol?: string, type?: AlertType, limit: number = 100): Alert[] {
    let filtered = this.alerts;
    
    if (symbol) {
      filtered = filtered.filter(a => a.symbol === symbol);
    }
    
    if (type) {
      filtered = filtered.filter(a => a.type === type);
    }
    
    return filtered.slice(-limit).reverse();
  }

  subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.cooldownMinutes !== undefined) {
      this.cooldownManager.updateCooldown(newConfig.cooldownMinutes);
    }
  }

  getConfig(): AlertConfig {
    return { ...this.config };
  }

  reset(): void {
    this.alerts = [];
    this.cooldownManager.clear();
    this.activePositions.clear();
    this.subscribers.clear();
  }
}

export { WinningAlertEngine };
export default WinningAlertEngine;
