import { create } from 'zustand';
import { Alert, AlertSettings, DEFAULT_ALERT_SETTINGS } from '@/app/lib/alertTypes';
import { alertService } from '@/app/lib/alertService';

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  settings: AlertSettings;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  updateSettings: (settings: Partial<AlertSettings>) => void;
  clearAcknowledged: () => void;
  createMarketAlert: (data: {
    symbol: string;
    trend: 'UP' | 'DOWN' | 'NEUTRAL';
    changePercent: number;
  }) => void;
  createStockAlert: (data: {
    symbol: string;
    alertType: 'BREAKOUT' | 'FORECAST_CHANGE' | 'ACCURACY_DROP' | 'TREND_REVERSAL';
    details: {
      price?: number;
      level?: 'strong' | 'medium' | 'weak';
      levelType?: 'support' | 'resistance';
      confidence?: number;
      previousConfidence?: number;
      hitRate?: number;
    };
  }) => void;
  createCompositeAlert: (data: {
    symbol: string;
    marketTrend: 'UP' | 'DOWN' | 'NEUTRAL';
    stockSignal: 'BUY' | 'SELL' | 'HOLD';
    correlation: number;
  }) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  settings: DEFAULT_ALERT_SETTINGS,

  addAlert: (alert) => set((state) => {
    alertService.addAlert(alert);
    return {
      alerts: [alert, ...state.alerts].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    };
  }),

  acknowledgeAlert: (id) => set((state) => {
    alertService.acknowledgeAlert(id);
    const updatedAlerts = state.alerts.map(a =>
      a.id === id ? { ...a, acknowledged: true } : a
    );
    return {
      alerts: updatedAlerts,
      unreadCount: updatedAlerts.filter(a => !a.acknowledged).length,
    };
  }),

  acknowledgeAll: () => set((state) => {
    const updatedAlerts = state.alerts.map(a => ({ ...a, acknowledged: true }));
    alertService.clearAcknowledged();
    return {
      alerts: updatedAlerts,
      unreadCount: 0,
    };
  }),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),

  clearAcknowledged: () => set((state) => {
    alertService.clearAcknowledged();
    const unacknowledged = state.alerts.filter(a => !a.acknowledged);
    return {
      alerts: unacknowledged,
      unreadCount: unacknowledged.filter(a => !a.acknowledged).length,
    };
  }),

  createMarketAlert: (data) => {
    const alert = alertService.createMarketAlert(data);
    if (alert) {
      get().addAlert(alert);
    }
  },

  createStockAlert: (data) => {
    const alert = alertService.createStockAlert(data);
    if (alert) {
      get().addAlert(alert);
    }
  },

  createCompositeAlert: (data) => {
    const alert = alertService.createCompositeAlert(data);
    if (alert) {
      get().addAlert(alert);
    }
  },
}));
