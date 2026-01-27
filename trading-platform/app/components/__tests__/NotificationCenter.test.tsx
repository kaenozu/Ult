import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from '@/app/components/NotificationCenter';
import { useAlertStore } from '@/app/store/alertStore';
import { Alert, AlertSeverity } from '@/app/lib/alertTypes';

describe('NotificationCenter', () => {
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

  it('renders notification bell icon', () => {
    render(<NotificationCenter />);
    const bellIcon = screen.getByTitle('通知センター');
    expect(bellIcon).toBeInTheDocument();
  });

  it('shows unread badge when there are unread alerts', async () => {
    const testAlert: Alert = {
      id: 'test-1',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'テストアラート',
      message: 'テストメッセージ',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    useAlertStore.getState().addAlert(testAlert);
    render(<NotificationCenter />);

    await waitFor(() => {
      const badge = screen.getByText('1');
      expect(badge).toBeInTheDocument();
    });
  });

  it('does not show badge when all alerts are acknowledged', () => {
    const acknowledgedAlert: Alert = {
      id: 'test-2',
      type: 'MARKET',
      severity: 'MEDIUM',
      symbol: '^N225',
      title: '市場イベント',
      message: 'テスト',
      timestamp: new Date().toISOString(),
      acknowledged: true,
    };

    useAlertStore.getState().addAlert(acknowledgedAlert);
    render(<NotificationCenter />);

    const badges = screen.queryByText(/\d+/);
    expect(badges).not.toBeInTheDocument();
  });

  it('opens dropdown when bell icon is clicked', async () => {
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const dropdown = screen.getByText('通知センター');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('filters alerts by severity', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: '高優先度',
        message: '高優先度アラート',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'MEDIUM',
        symbol: '^N225',
        title: '中優先度',
        message: '中優先度アラート',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const highFilter = screen.getByText('🔴 高');
      fireEvent.click(highFilter);

      expect(screen.getByText('高優先度')).toBeInTheDocument();
      expect(screen.queryByText('中優先度')).not.toBeInTheDocument();
    });
  });

  it('acknowledges alert when clicked', async () => {
    const alert: Alert = {
      id: 'test-ack',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'テスト',
      message: 'テストメッセージ',
      timestamp: new Date().toISOString(),
      acknowledged: false,
      actionable: {
        type: 'BUY',
        confidence: 85,
        targetPrice: 1000,
      },
    };

    useAlertStore.getState().addAlert(alert);
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const alertElement = screen.getByText('テスト');
      fireEvent.click(alertElement);

      expect(useAlertStore.getState().alerts[0].acknowledged).toBe(true);
    });
  });

  it('acknowledges all alerts when button is clicked', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト1',
        message: 'テストメッセージ1',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'MEDIUM',
        symbol: '^N225',
        title: 'テスト2',
        message: 'テストメッセージ2',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const acknowledgeAllButton = screen.getByText('全既読');
      fireEvent.click(acknowledgeAllButton);

      const state = useAlertStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.alerts.every(a => a.acknowledged)).toBe(true);
    });
  });

  it('shows settings panel', async () => {
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const settingsButton = screen.getByTitle('設定');
      fireEvent.click(settingsButton);

      expect(screen.getByText('通知種類')).toBeInTheDocument();
      expect(screen.getByText('優先度フィルター')).toBeInTheDocument();
      expect(screen.getByText('通知設定')).toBeInTheDocument();
    });
  });

  it('disables notifications when setting is off', async () => {
    useAlertStore.getState().updateSettings({ enabled: false });
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    expect(bellIcon).toBeInTheDocument();

    const bellOffIcon = screen.queryByTitle('通知センターが無効');
    expect(bellOffIcon).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      const dropdown = screen.getByText('通知センター');
      expect(dropdown).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
    });

    const dropdown = screen.queryByText('通知センター');
    expect(dropdown).not.toBeInTheDocument();
  });

  it('shows actionable alert information', async () => {
    const alert: Alert = {
      id: 'test-actionable',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'ブレイクアウト検知',
      message: '1000円で強いサポートラインを突破',
      timestamp: new Date().toISOString(),
      acknowledged: false,
      actionable: {
        type: 'BUY',
        confidence: 85,
        targetPrice: 1030,
        stopLoss: 980,
      },
    };

    useAlertStore.getState().addAlert(alert);
    render(<NotificationCenter />);

    const bellIcon = screen.getByTitle('通知センター');
    fireEvent.click(bellIcon);

    await waitFor(() => {
      expect(screen.getByText('買い')).toBeInTheDocument();
      expect(screen.getByText('信頼度: 85%')).toBeInTheDocument();
      expect(screen.getByText(/1030/)).toBeInTheDocument();
      expect(screen.getByText(/980/)).toBeInTheDocument();
    });
  });
});
