export type AlertType = 'MARKET' | 'STOCK' | 'COMPOSITE';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type AlertActionType = 'BUY' | 'SELL' | 'HOLD';

export interface AlertActionable {
  type: AlertActionType;
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  symbol?: string;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  actionable?: AlertActionable;
}

export interface AlertSettings {
  enabled: boolean;
  types: {
    MARKET: boolean;
    STOCK: boolean;
    COMPOSITE: boolean;
  };
  severities: {
    HIGH: boolean;
    MEDIUM: boolean;
    LOW: boolean;
  };
  notifications: {
    sound: boolean;
    popup: boolean;
    push: boolean;
  };
  historyRetention: '7days' | '30days' | 'unlimited';
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  types: {
    MARKET: true,
    STOCK: true,
    COMPOSITE: true,
  },
  severities: {
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  },
  notifications: {
    sound: true,
    popup: true,
    push: false,
  },
  historyRetention: '30days',
};
