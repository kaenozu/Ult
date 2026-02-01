import { AlertNotificationSystem, AlertCondition, Alert } from '../AlertNotificationSystem';

describe('AlertNotificationSystem', () => {
  let system: AlertNotificationSystem;

  beforeEach(() => {
    system = new AlertNotificationSystem();
  });

  afterEach(() => {
    system.destroy();
  });

  describe('Condition Management', () => {
    it('should add a new condition', () => {
      const conditionData = {
        name: 'Price Alert',
        type: 'price' as const,
        symbol: 'AAPL',
        condition: 'price > 150',
        threshold: 150,
        enabled: true,
      };

      const id = system.addCondition(conditionData);
      expect(id).toBeDefined();

      const condition = system.getCondition(id);
      expect(condition).toBeDefined();
      expect(condition?.name).toBe(conditionData.name);
      expect(condition?.type).toBe(conditionData.type);
    });

    it('should update an existing condition', () => {
      const id = system.addCondition({
        name: 'Test',
        type: 'price',
        condition: 'test',
        threshold: 100,
        enabled: true,
      });

      const updated = system.updateCondition(id, { threshold: 200 });
      expect(updated).toBe(true);

      const condition = system.getCondition(id);
      expect(condition?.threshold).toBe(200);
    });

    it('should remove a condition', () => {
      const id = system.addCondition({
        name: 'Test',
        type: 'price',
        condition: 'test',
        threshold: 100,
        enabled: true,
      });

      const removed = system.removeCondition(id);
      expect(removed).toBe(true);
      expect(system.getCondition(id)).toBeUndefined();
    });

    it('should toggle condition enabled state', () => {
      const id = system.addCondition({
        name: 'Test',
        type: 'price',
        condition: 'test',
        threshold: 100,
        enabled: true,
      });

      system.toggleCondition(id, false);
      const condition = system.getCondition(id);
      expect(condition?.enabled).toBe(false);
    });

    it('should get all conditions', () => {
      system.addCondition({
        name: 'Test 1',
        type: 'price',
        condition: 'test',
        threshold: 100,
        enabled: true,
      });
      system.addCondition({
        name: 'Test 2',
        type: 'indicator',
        condition: 'test',
        threshold: 200,
        enabled: true,
      });

      const conditions = system.getAllConditions();
      expect(conditions).toHaveLength(2);
    });
  });

  describe('Alert Management', () => {
    it('should create a new alert', () => {
      const conditionId = 'test-condition-1';
      const alertId = system.createAlert(
        conditionId,
        'Test alert message',
        'warning',
        { value: 150 }
      );

      expect(alertId).toBeDefined();

      const alert = system.getAlert(alertId);
      expect(alert).toBeDefined();
      expect(alert?.conditionId).toBe(conditionId);
      expect(alert?.message).toBe('Test alert message');
      expect(alert?.severity).toBe('warning');
      expect(alert?.acknowledged).toBe(false);
    });

    it('should acknowledge an alert', () => {
      const alertId = system.createAlert(
        'test-condition',
        'Test message',
        'info'
      );

      const acknowledged = system.acknowledgeAlert(alertId);
      expect(acknowledged).toBe(true);

      const alert = system.getAlert(alertId);
      expect(alert?.acknowledged).toBe(true);
    });

    it('should get unacknowledged alerts', () => {
      const id1 = system.createAlert('cond1', 'Message 1', 'info');
      const id2 = system.createAlert('cond2', 'Message 2', 'warning');
      system.createAlert('cond3', 'Message 3', 'critical');

      system.acknowledgeAlert(id1);

      const unacknowledged = system.getUnacknowledgedAlerts();
      expect(unacknowledged).toHaveLength(2);
      expect(unacknowledged.some(a => a.id === id2)).toBe(true);
    });

    it('should clear acknowledged alerts', () => {
      const id1 = system.createAlert('cond1', 'Message 1', 'info');
      const id2 = system.createAlert('cond2', 'Message 2', 'warning');

      system.acknowledgeAlert(id1);
      system.clearAcknowledgedAlerts();

      const alerts = system.getAllAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe(id2);
    });
  });

  describe('Channel Management', () => {
    it('should configure a channel', () => {
      system.configureChannel('email', { 
        smtp: 'smtp.test.com',
        from: 'test@test.com'
      });

      const channel = system.getChannel('email');
      expect(channel?.config.smtp).toBe('smtp.test.com');
    });

    it('should toggle a channel', () => {
      system.toggleChannel('email', true);

      const channel = system.getChannel('email');
      expect(channel?.enabled).toBe(true);
    });

    it('should get all channels', () => {
      const channels = system.getAllChannels();
      expect(channels.length).toBeGreaterThan(0);
      expect(channels.some(c => c.type === 'push')).toBe(true);
    });
  });

  describe('Event Emitting', () => {
    it('should emit conditionAdded event', (done) => {
      system.on('conditionAdded', (condition: AlertCondition) => {
        expect(condition.name).toBe('Test Condition');
        done();
      });

      system.addCondition({
        name: 'Test Condition',
        type: 'price',
        condition: 'test',
        threshold: 100,
        enabled: true,
      });
    });

    it('should emit alertCreated event', (done) => {
      system.on('alertCreated', (alert: Alert) => {
        expect(alert.message).toBe('Test Alert');
        done();
      });

      system.createAlert('cond1', 'Test Alert', 'info');
    });

    it('should emit channelToggled event', (done) => {
      system.on('channelToggled', (data: { type: string; enabled: boolean }) => {
        expect(data.type).toBe('email');
        expect(data.enabled).toBe(true);
        done();
      });

      system.toggleChannel('email', true);
    });
  });

  describe('Monitoring', () => {
    it('should start monitoring', (done) => {
      system.on('monitoringStarted', (intervalMs: number) => {
        expect(intervalMs).toBe(1000);
        system.stopMonitoring();
        done();
      });

      system.startMonitoring(1000);
    });

    it('should stop monitoring', (done) => {
      system.on('monitoringStopped', () => {
        done();
      });

      system.startMonitoring(1000);
      system.stopMonitoring();
    });

    it('should check conditions periodically', (done) => {
      let checkCount = 0;

      system.on('conditionsChecked', () => {
        checkCount++;
        if (checkCount >= 2) {
          system.stopMonitoring();
          done();
        }
      });

      system.startMonitoring(100);
    });
  });
});
