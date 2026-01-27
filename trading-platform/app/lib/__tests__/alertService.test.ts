import { alertService, AlertService } from '@/app/lib/alertService';
import { AlertSeverity } from '@/app/lib/alertTypes';

describe('AlertService', () => {
  let serviceInstance: AlertService;

  beforeEach(() => {
    serviceInstance = AlertService.getInstance();
    serviceInstance.clearAcknowledged();
  });

  describe('calculateSeverity', () => {
    it('returns HIGH when weighted score >= 70', () => {
      const severity = serviceInstance['calculateSeverity'](80, 75);
      expect(severity).toBe('HIGH');
    });

    it('returns MEDIUM when weighted score >= 40', () => {
      const severity = serviceInstance['calculateSeverity'](50, 45);
      expect(severity).toBe('MEDIUM');
    });

    it('returns LOW when weighted score < 40', () => {
      const severity = serviceInstance['calculateSeverity'](30, 25);
      expect(severity).toBe('LOW');
    });

    it('calculates correct weighted score', () => {
      const marketImpact = 80;
      const stockSignalStrength = 90;
      const expectedScore = (marketImpact * 0.4) + (stockSignalStrength * 0.6);

      const severity = serviceInstance['calculateSeverity'](marketImpact, stockSignalStrength);
      expect(severity).toBe('HIGH');
    });
  });

  describe('shouldTriggerCompositeAlert', () => {
    it('returns true for UP market and BUY signal with positive correlation', () => {
      const shouldTrigger = serviceInstance['shouldTriggerCompositeAlert']('UP', 'BUY', 0.8);
      expect(shouldTrigger).toBe(true);
    });

    it('returns true for DOWN market and SELL signal with positive correlation', () => {
      const shouldTrigger = serviceInstance['shouldTriggerCompositeAlert']('DOWN', 'SELL', 0.7);
      expect(shouldTrigger).toBe(true);
    });

    it('returns false when correlation is too low', () => {
      const shouldTrigger = serviceInstance['shouldTriggerCompositeAlert']('UP', 'BUY', 0.4);
      expect(shouldTrigger).toBe(false);
    });

    it('returns true for UP market and SELL signal with negative correlation', () => {
      const shouldTrigger = serviceInstance['shouldTriggerCompositeAlert']('UP', 'SELL', -0.7);
      expect(shouldTrigger).toBe(true);
    });

    it('returns false for conflicting signals with positive correlation', () => {
      const shouldTrigger = serviceInstance['shouldTriggerCompositeAlert']('UP', 'SELL', 0.8);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('createMarketAlert', () => {
    it('creates HIGH severity alert for 3% change', () => {
      const alert = serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 3.5,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('市場トレンド変化');
        expect(alert.message).toContain('+3.50%急騰');
        expect(alert.type).toBe('MARKET');
      }
    });

    it('creates MEDIUM severity alert for 1% change', () => {
      const alert = serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'DOWN',
        changePercent: -1.5,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('MEDIUM');
        expect(alert.title).toContain('市場トレンド変化');
        expect(alert.message).toContain('-1.50%急落');
        expect(alert.type).toBe('MARKET');
      }
    });

    it('creates NEUTRAL trend alert', () => {
      const alert = serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'NEUTRAL',
        changePercent: 0.5,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('MEDIUM');
        expect(alert.message).toContain('横ばい');
        expect(alert.type).toBe('MARKET');
      }
    });

    it('returns null when alerts are disabled', () => {
      const service = serviceInstance['getAlerts']();
      serviceInstance['clearAcknowledged']();

      const alert = serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 5.0,
      });

      expect(alert).toBeNull();
    });
  });

  describe('createStockAlert', () => {
    it('creates BREAKOUT alert with HIGH severity for strong level', () => {
      const alert = serviceInstance['createStockAlert']({
        symbol: '4385',
        alertType: 'BREAKOUT',
        details: {
          price: 1000,
          level: 'strong',
          levelType: 'resistance',
          confidence: 85,
        },
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('ブレイクアウト検知');
        expect(alert.actionable).toBeDefined();
        expect(alert.actionable?.type).toBe('SELL');
        expect(alert.actionable?.targetPrice).toBe(1030);
        expect(alert.actionable?.stopLoss).toBe(1000);
      }
    });

    it('creates BREAKOUT alert with MEDIUM severity for medium level', () => {
      const alert = serviceInstance['createStockAlert']({
        symbol: '4385',
        alertType: 'BREAKOUT',
        details: {
          price: 1000,
          level: 'medium',
          levelType: 'support',
          confidence: 65,
        },
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('MEDIUM');
        expect(alert.actionable?.type).toBe('BUY');
        expect(alert.actionable?.confidence).toBeDefined();
      }
    });

    it('creates FORECAST_CHANGE alert for confidence increase', () => {
      const alert = serviceInstance['createStockAlert']({
        symbol: '4385',
        alertType: 'FORECAST_CHANGE',
        details: {
          confidence: 85,
          previousConfidence: 65,
        },
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('予測コーン信頼度上昇');
        expect(alert.message).toContain('65%から85%へ上昇');
      }
    });

    it('creates ACCURACY_DROP alert for low hit rate', () => {
      const alert = serviceInstance['createStockAlert']({
        symbol: '4385',
        alertType: 'ACCURACY_DROP',
        details: {
          hitRate: 35,
        },
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('的中率急低下');
        expect(alert.message).toContain('35%に低下');
      }
    });

    it('creates TREND_REVERSAL alert', () => {
      const alert = serviceInstance['createStockAlert']({
        symbol: '4385',
        alertType: 'TREND_REVERSAL',
        details: {
          confidence: 50,
        },
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('トレンド反転警告');
        expect(alert.actionable).toBeDefined();
        expect(alert.actionable?.type).toBe('HOLD');
      }
    });
  });

  describe('createCompositeAlert', () => {
    it('creates composite alert for matching signals', () => {
      const alert = serviceInstance['createCompositeAlert']({
        symbol: '4385',
        marketTrend: 'UP',
        stockSignal: 'BUY',
        correlation: 0.8,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.title).toContain('複合シグナル');
        expect(alert.message).toContain('市場上昇トレンド');
        expect(alert.message).toContain('強気複合シグナル');
        expect(alert.actionable?.type).toBe('BUY');
        expect(alert.actionable?.confidence).toBe(85);
      }
    });

    it('creates composite alert for opposite signals with negative correlation', () => {
      const alert = serviceInstance['createCompositeAlert']({
        symbol: '4385',
        marketTrend: 'DOWN',
        stockSignal: 'BUY',
        correlation: -0.8,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.type).toBe('COMPOSITE');
        expect(alert.actionable?.type).toBe('BUY');
      }
    });

    it('returns null for non-triggering conditions', () => {
      const alert = serviceInstance['createCompositeAlert']({
        symbol: '4385',
        marketTrend: 'UP',
        stockSignal: 'SELL',
        correlation: 0.9,
      });

      expect(alert).toBeNull();
    });
  });

  describe('acknowledgeAlert', () => {
    it('marks alert as acknowledged via service', () => {
      const testAlert = serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 1.0,
      });

      expect(testAlert).not.toBeNull();
      if (testAlert) {
        expect(testAlert.acknowledged).toBe(false);

        serviceInstance['acknowledgeAlert'](testAlert.id);

        const alerts = serviceInstance['getAlerts']();
        expect(alerts[0].acknowledged).toBe(true);
      }
    });

    it('handles non-existent alert id', () => {
      expect(() => {
        serviceInstance['acknowledgeAlert']('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('clearAcknowledged', () => {
    it('removes all acknowledged alerts via service', () => {
      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 1.0,
      });

      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'DOWN',
        changePercent: -1.0,
      });

      const alerts = serviceInstance['getAlerts']();
      expect(alerts.length).toBe(2);

      serviceInstance['acknowledgeAlert'](alerts[0].id);
      serviceInstance['clearAcknowledged']();

      const remainingAlerts = serviceInstance['getAlerts']();
      expect(remainingAlerts.length).toBe(1);
      expect(remainingAlerts[0].acknowledged).toBe(false);
    });
  });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.acknowledged).toBe(false);

        serviceInstance['acknowledgeAlert'](alert.id);

        expect(alert.acknowledged).toBe(true);
      }
    });

    it('does nothing for non-existent alert', () => {
      expect(() => {
        serviceInstance['acknowledgeAlert']('non-existent-id');
      }).not.toThrow();
    });

  describe('clearAcknowledged', () => {
    it('removes all acknowledged alerts', () => {
      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 1.0,
      });

      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'DOWN',
        changePercent: -1.0,
      });

      const alerts = serviceInstance['getAlerts']();
      expect(alerts.length).toBe(2);

      serviceInstance['acknowledgeAlert'](alerts[0].id);
      serviceInstance['clearAcknowledged']();

      const remainingAlerts = serviceInstance['getAlerts']();
      expect(remainingAlerts.length).toBe(1);
      expect(remainingAlerts[0].acknowledged).toBe(false);
    });
  });

  describe('addAlert', () => {
    it('adds alert to store via service', () => {
      const stateBefore = useAlertStore.getState().alerts.length;

      useAlertStore.getState().addAlert({
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト',
        message: 'テストメッセージ',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.alerts.length).toBe(stateBefore + 1);
      expect(stateAfter.alerts[0]).toEqual({
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト',
        message: 'テストメッセージ',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      });
      expect(stateAfter.unreadCount).toBe(1);
    });

    it('limits alert list to 50 items', () => {
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

  describe('addAlert', () => {
    it('adds alert to store via service', () => {
      for (let i = 0; i < 60; i++) {
        serviceInstance['createMarketAlert']({
          symbol: '^N225',
          trend: 'UP',
          changePercent: 1.0,
        });
      }

      const alerts = serviceInstance['getAlerts']();
      expect(alerts.length).toBe(50);
    });

  describe('getUnreadCount', () => {
    it('returns correct count of unread alerts', () => {
      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 1.0,
      });

      serviceInstance['createMarketAlert']({
        symbol: '^N225',
        trend: 'DOWN',
        changePercent: -1.0,
      });

      serviceInstance['acknowledgeAlert'](serviceInstance['getAlerts']()[0].id);

      const unreadCount = serviceInstance['getUnreadCount']();
      expect(unreadCount).toBe(1);
    });
  });
});