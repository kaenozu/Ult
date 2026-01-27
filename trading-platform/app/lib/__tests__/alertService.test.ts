import { AlertService } from '@/app/lib/alertService';
import { useAlertStore } from '@/app/store/alertStore';

describe('AlertService', () => {
  let serviceInstance: AlertService;

  beforeEach(() => {
    serviceInstance = AlertService.getInstance();
    (serviceInstance as any).alerts = [];
    (serviceInstance as any).settings.enabled = true;
    (serviceInstance as any).settings.severities = {
      HIGH: true,
      MEDIUM: true,
      LOW: true,
    };
    useAlertStore.getState().alerts = [];
    useAlertStore.getState().unreadCount = 0;
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
  });

  describe('createMarketAlert', () => {
    it('creates HIGH severity alert for 3% change', () => {
      const alert = serviceInstance.createMarketAlert({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 3.5,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.severity).toBe('HIGH');
        expect(alert.type).toBe('MARKET');
      }
    });

    it('returns null when alerts match disabled severity (tested via shouldAlert)', () => {
      // Accessing private settings for testing
      (serviceInstance as any).settings.severities.MEDIUM = false;
      const alert = serviceInstance.createMarketAlert({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 0.1, // MEDIUM severity
      });
      expect(alert).toBeNull();
    });
  });

  describe('createStockAlert', () => {
    it('creates BREAKOUT alert with HIGH severity for strong level', () => {
      const alert = serviceInstance.createStockAlert({
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
        expect(alert.actionable?.type).toBe('SELL');
      }
    });
  });

  describe('createCompositeAlert', () => {
    it('creates composite alert for matching signals', () => {
      const alert = serviceInstance.createCompositeAlert({
        symbol: '4385',
        marketTrend: 'UP',
        stockSignal: 'BUY',
        correlation: 0.8,
      });

      expect(alert).not.toBeNull();
      if (alert) {
        expect(alert.type).toBe('COMPOSITE');
        expect(alert.actionable?.type).toBe('BUY');
      }
    });
  });

  describe('acknowledgeAlert', () => {
    it('marks alert as acknowledged', () => {
      const alert = serviceInstance.createMarketAlert({
        symbol: '^N225',
        trend: 'UP',
        changePercent: 1.0,
      });

      if (alert) {
        serviceInstance.addAlert(alert);
        serviceInstance.acknowledgeAlert(alert.id);
        const alerts = serviceInstance.getAlerts();
        expect(alerts[0].acknowledged).toBe(true);
      }
    });
  });

  describe('clearAcknowledged', () => {
    it('removes all acknowledged alerts', () => {
      const alert1 = serviceInstance.createMarketAlert({ symbol: 'A', trend: 'UP', changePercent: 1 });
      const alert2 = serviceInstance.createMarketAlert({ symbol: 'B', trend: 'UP', changePercent: 1 });

      if (alert1 && alert2) {
        serviceInstance.addAlert(alert1);
        serviceInstance.addAlert(alert2);
        serviceInstance.acknowledgeAlert(alert1.id);
        serviceInstance.clearAcknowledged();
        expect(serviceInstance.getAlerts().length).toBe(1);
      }
    });
  });

  describe('addAlert', () => {
    it('limits alert list to 50 items', () => {
      for (let i = 0; i < 60; i++) {
        const alert = serviceInstance.createMarketAlert({
          symbol: `S-${i}`,
          trend: 'UP',
          changePercent: 1.0,
        });
        if (alert) serviceInstance.addAlert(alert);
      }
      expect(serviceInstance.getAlerts().length).toBe(50);
    });
  });

  describe('getUnreadCount', () => {
    it('returns correct unread count', () => {
      const alert = serviceInstance.createMarketAlert({ symbol: 'A', trend: 'UP', changePercent: 1 });
      if (alert) {
        serviceInstance.addAlert(alert);
        expect(serviceInstance.getUnreadCount()).toBe(1);
        serviceInstance.acknowledgeAlert(alert.id);
        expect(serviceInstance.getUnreadCount()).toBe(0);
      }
    });
  });
});