import { OHLCV, Stock, Signal } from '@/app/types';
import { StrategyResult } from '../../strategies/WinningStrategyEngine';

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
  entrySignals: boolean;
  minConfidence: number;
  exitSignals: boolean;
  stopLossAlerts: boolean;
  takeProfitAlerts: boolean;
  trailingStopAlerts: boolean;
  riskWarnings: boolean;
  drawdownThreshold: number;
  volatilityThreshold: number;
  breakoutAlerts: boolean;
  trendReversalAlerts: boolean;
  marketAnomalyAlerts: boolean;
  volumeSpikeThreshold: number;
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundAlerts: boolean;
  desktopNotifications: boolean;
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

export interface CooldownManager {
  isInCooldown(key: string): boolean;
  recordAlert(key: string): void;
}

export interface AlertNotifier {
  sendPushNotification(alert: Alert): Promise<void>;
  sendDesktopNotification(alert: Alert): void;
}

export type { OHLCV, Stock, Signal, StrategyResult };
