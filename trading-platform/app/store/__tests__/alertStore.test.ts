import { useAlertStore } from '@/app/store/alertStore';
import { Alert } from '@/app/lib/alertTypes';

describe('alertStore', () => {
  beforeEach(() => {
    useAlertStore.getState().alerts = [];
    useAlertStore.getState().unreadCount = 0;
    useAlertStore.getState().settings = {
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
  });

  describe('addAlert', () => {
    it('adds alert to store', () => {
      const alert: Alert = {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト',
        message: 'テストメッセージ',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      useAlertStore.getState().addAlert(alert);

      const state = useAlertStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0]).toEqual(alert);
      expect(state.unreadCount).toBe(1);
    });

    it('limits alerts to 50 items', () => {
      for (let i = 0; i < 60; i++) {
        useAlertStore.getState().addAlert({
          id: `test-${i}`,
          type: 'STOCK',
          severity: 'MEDIUM',
          symbol: '4385',
          title: `テスト${i}`,
          message: `メッセージ${i}`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });
      }

      const state = useAlertStore.getState();
      expect(state.alerts).toHaveLength(50);
      expect(state.alerts[0].id).toBe('test-59');
      expect(state.alerts[49].id).toBe('test-10');
    });
  });

  describe('acknowledgeAlert', () => {
    it('marks alert as acknowledged', () => {
      const alert: Alert = {
        id: 'test-ack',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト',
        message: 'テストメッセージ',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      useAlertStore.getState().addAlert(alert);
      expect(useAlertStore.getState().unreadCount).toBe(1);

      useAlertStore.getState().acknowledgeAlert(alert.id);

      const state = useAlertStore.getState();
      expect(state.alerts[0].acknowledged).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('handles non-existent alert id', () => {
      expect(() => {
        useAlertStore.getState().acknowledgeAlert('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('acknowledgeAll', () => {
    it('marks all alerts as acknowledged', () => {
      const alerts: Alert[] = [
        {
          id: 'test-1',
          type: 'STOCK',
          severity: 'HIGH',
          symbol: '4385',
          title: 'テスト1',
          message: 'メッセージ1',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: 'test-2',
          type: 'MARKET',
          severity: 'MEDIUM',
          symbol: '^N225',
          title: 'テスト2',
          message: 'メッセージ2',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
      ];

      alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
      expect(useAlertStore.getState().unreadCount).toBe(2);

      useAlertStore.getState().acknowledgeAll();

      const state = useAlertStore.getState();
      expect(state.alerts.every(a => a.acknowledged)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('updateSettings', () => {
    it('updates enabled setting', () => {
      useAlertStore.getState().updateSettings({ enabled: false });

      expect(useAlertStore.getState().settings.enabled).toBe(false);
    });

    it('updates type filters', () => {
      useAlertStore.getState().updateSettings({
        types: {
          MARKET: false,
          STOCK: true,
          COMPOSITE: true,
        }
      });

      const state = useAlertStore.getState();
      expect(state.settings.types.MARKET).toBe(false);
      expect(state.settings.types.STOCK).toBe(true);
      expect(state.settings.types.COMPOSITE).toBe(true);
    });

    it('updates severity filters', () => {
      useAlertStore.getState().updateSettings({
        severities: {
          HIGH: true,
          MEDIUM: false,
          LOW: false,
        }
      });

      const state = useAlertStore.getState();
      expect(state.settings.severities.HIGH).toBe(true);
      expect(state.settings.severities.MEDIUM).toBe(false);
      expect(state.settings.severities.LOW).toBe(false);
    });

    it('updates notification settings', () => {
      useAlertStore.getState().updateSettings({
        notifications: {
          sound: false,
          popup: true,
          push: true,
        }
      });

      const state = useAlertStore.getState();
      expect(state.settings.notifications.sound).toBe(false);
      expect(state.settings.notifications.popup).toBe(true);
      expect(state.settings.notifications.push).toBe(true);
    });
  });

  describe('clearAcknowledged', () => {
    it('removes all acknowledged alerts', () => {
      const alerts: Alert[] = [
        {
          id: 'test-1',
          type: 'STOCK',
          severity: 'HIGH',
          symbol: '4385',
          title: 'テスト1',
          message: 'メッセージ1',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        },
        {
          id: 'test-2',
          type: 'MARKET',
          severity: 'MEDIUM',
          symbol: '^N225',
          title: 'テスト2',
          message: 'メッセージ2',
          timestamp: new Date().toISOString(),
          acknowledged: true,
        },
      ];

      alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
      expect(useAlertStore.getState().alerts.length).toBe(2);

      useAlertStore.getState().clearAcknowledged();

      const state = useAlertStore.getState();
      expect(state.alerts.length).toBe(1);
      expect(state.alerts[0].id).toBe('test-1');
      expect(state.alerts[0].acknowledged).toBe(false);
    });
  });

  describe('createMarketAlert', () => {
    it('adds market alert via service', () => {
      const stateBefore = useAlertStore.getState().alerts.length;

      useAlertStore.getState().createMarketAlert({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 3.0,
      });

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.alerts.length).toBe(stateBefore + 1);
    });
  });

  describe('createStockAlert', () => {
    it('adds stock alert via service', () => {
      const stateBefore = useAlertStore.getState().alerts.length;

      useAlertStore.getState().createStockAlert({
        symbol: '4385',
        alertType: 'BREAKOUT',
        details: {
          price: 1000,
          level: 'strong',
          levelType: 'resistance',
          confidence: 85,
        },
      });

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.alerts.length).toBe(stateBefore + 1);
    });
  });

  describe('createCompositeAlert', () => {
    it('adds composite alert via service', () => {
      const stateBefore = useAlertStore.getState().alerts.length;

      useAlertStore.getState().createCompositeAlert({
        symbol: '4385',
        marketTrend: 'UP',
        stockSignal: 'BUY',
        correlation: 0.8,
      });

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.alerts.length).toBe(stateBefore + 1);
    });
  });
});
