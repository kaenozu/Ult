import { create } from 'zustand';
import { alertNotificationSystem, AlertCondition, Alert, NotificationChannelType } from '@/app/lib/AlertNotificationSystem';

interface AlertNotificationState {
  conditions: AlertCondition[];
  alerts: Alert[];
  channels: Map<NotificationChannelType, { enabled: boolean; config: any }>;
  
  // Condition actions
  addCondition: (condition: Omit<AlertCondition, 'id' | 'createdAt'>) => string;
  updateCondition: (id: string, updates: Partial<AlertCondition>) => void;
  removeCondition: (id: string) => void;
  toggleCondition: (id: string, enabled: boolean) => void;
  
  // Alert actions
  acknowledgeAlert: (id: string) => void;
  clearAcknowledgedAlerts: () => void;
  
  // Channel actions
  toggleChannel: (type: NotificationChannelType, enabled: boolean) => void;
  configureChannel: (type: NotificationChannelType, config: any) => void;
  
  // Monitoring
  startMonitoring: (intervalMs?: number) => void;
  stopMonitoring: () => void;
  
  // Init
  initialize: () => void;
}

export const useAlertNotificationStore = create<AlertNotificationState>((set, get) => {
  // Set up event listeners
  alertNotificationSystem.on('conditionAdded', () => {
    set({ conditions: alertNotificationSystem.getAllConditions() });
  });

  alertNotificationSystem.on('conditionUpdated', () => {
    set({ conditions: alertNotificationSystem.getAllConditions() });
  });

  alertNotificationSystem.on('conditionRemoved', () => {
    set({ conditions: alertNotificationSystem.getAllConditions() });
  });

  alertNotificationSystem.on('conditionToggled', () => {
    set({ conditions: alertNotificationSystem.getAllConditions() });
  });

  alertNotificationSystem.on('alertCreated', () => {
    set({ alerts: alertNotificationSystem.getAllAlerts() });
  });

  alertNotificationSystem.on('alertAcknowledged', () => {
    set({ alerts: alertNotificationSystem.getAllAlerts() });
  });

  alertNotificationSystem.on('acknowledgedAlertsCleared', () => {
    set({ alerts: alertNotificationSystem.getAllAlerts() });
  });

  alertNotificationSystem.on('channelToggled', () => {
    const channelsMap = new Map();
    alertNotificationSystem.getAllChannels().forEach(ch => {
      channelsMap.set(ch.type, { enabled: ch.enabled, config: ch.config });
    });
    set({ channels: channelsMap });
  });

  alertNotificationSystem.on('channelConfigured', () => {
    const channelsMap = new Map();
    alertNotificationSystem.getAllChannels().forEach(ch => {
      channelsMap.set(ch.type, { enabled: ch.enabled, config: ch.config });
    });
    set({ channels: channelsMap });
  });

  return {
    conditions: [],
    alerts: [],
    channels: new Map(),

    addCondition: (condition) => {
      return alertNotificationSystem.addCondition(condition);
    },

    updateCondition: (id, updates) => {
      alertNotificationSystem.updateCondition(id, updates);
    },

    removeCondition: (id) => {
      alertNotificationSystem.removeCondition(id);
    },

    toggleCondition: (id, enabled) => {
      alertNotificationSystem.toggleCondition(id, enabled);
    },

    acknowledgeAlert: (id) => {
      alertNotificationSystem.acknowledgeAlert(id);
    },

    clearAcknowledgedAlerts: () => {
      alertNotificationSystem.clearAcknowledgedAlerts();
    },

    toggleChannel: (type, enabled) => {
      alertNotificationSystem.toggleChannel(type, enabled);
    },

    configureChannel: (type, config) => {
      alertNotificationSystem.configureChannel(type, config);
    },

    startMonitoring: (intervalMs = 5000) => {
      alertNotificationSystem.startMonitoring(intervalMs);
    },

    stopMonitoring: () => {
      alertNotificationSystem.stopMonitoring();
    },

    initialize: () => {
      set({
        conditions: alertNotificationSystem.getAllConditions(),
        alerts: alertNotificationSystem.getAllAlerts(),
      });
      
      const channelsMap = new Map();
      alertNotificationSystem.getAllChannels().forEach(ch => {
        channelsMap.set(ch.type, { enabled: ch.enabled, config: ch.config });
      });
      set({ channels: channelsMap });
    },
  };
});
