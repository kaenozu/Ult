import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertPanel } from '@/app/components/AlertPanel';
import { useAlertStore } from '@/app/store/alertStore';
import { Alert } from '@/app/lib/alertTypes';
import { alertService } from '@/app/lib/alertService';
import '@testing-library/jest-dom';

describe('AlertPanel', () => {
  const mockStock = {
    symbol: '4385',
    name: '\u30c6\u30b9\u30c8\u682a', // テスト株
    market: 'japan' as const,
    sector: '\u30c6\u30af\u30ce\u30ed\u30b8\u30fc', // テクノロジー
    price: 1000,
    change: 10,
    changePercent: 1.0,
    volume: 1000000,
  };

  beforeEach(() => {
    // Reset singleton state
    (alertService as any).alerts = [];
    (alertService as any).settings.enabled = true;
    (alertService as any).settings.severities = {
      HIGH: true,
      MEDIUM: true,
      LOW: true,
    };

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

  it('renders alert panel header', () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);
    expect(screen.getByText(/\u30a2\u30e9\u30fc\u30c8\u30d1\u30cd\u30eb/)).toBeInTheDocument(); // アラートパネル
  });

  it('shows "no alerts" message when alerts list is empty', () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);
    expect(screen.getByText(/\u30a2\u30e9\u30fc\u30c8\u306f\u3042\u308a\u307e\u305b\u3093/)).toBeInTheDocument(); // アラートはありません
  });

  it('renders alert items', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: '\u30d6\u30ec\u30a4\u30af\u30a2\u30a6\u30c8\u691c\u77e5', // ブレイクアウト検知
        message: 'MESSAGE_1',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      expect(screen.getByText(/\u30d6\u30ec\u30a4\u30af\u30a2\u30a6\u30c8\u691c\u77e5/)).toBeInTheDocument();
    });
  });

  it('filters alerts by type', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'STOCK_ALERT',
        message: 'test',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'HIGH',
        symbol: '^N225',
        title: 'MARKET_ALERT',
        message: 'test',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const stockFilter = screen.getByText(/\u9298\u67c4/); // 銘柄
      fireEvent.click(stockFilter);
      expect(screen.getByText('STOCK_ALERT')).toBeInTheDocument();
      expect(screen.queryByText('MARKET_ALERT')).not.toBeInTheDocument();
    });
  });

  it('filters alerts by severity', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'HIGH_PRIO',
        message: 'test',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'STOCK',
        severity: 'LOW',
        symbol: '4385',
        title: 'LOW_PRIO',
        message: 'test',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const highFilter = screen.getByText('\ud83d\udd34'); // 🔴
      fireEvent.click(highFilter);
      expect(screen.getByText('HIGH_PRIO')).toBeInTheDocument();
      expect(screen.queryByText('LOW_PRIO')).not.toBeInTheDocument();
    });
  });

  it('acknowledges alert when checkmark is clicked', async () => {
    const alert: Alert = {
      id: 'test-ack',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'TEST_ACK',
      message: 'test',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    useAlertStore.getState().addAlert(alert);
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const acknowledgeButton = screen.getByTitle(/\u65e2\u8aad\u306b\u3059\u308b/); // 既読にする
      fireEvent.click(acknowledgeButton);
      expect(useAlertStore.getState().alerts[0].acknowledged).toBe(true);
    });
  });

  it('shows actionable alert details', async () => {
    const alert: Alert = {
      id: 'test-actionable',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'ACTIONABLE',
      message: 'test',
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
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      expect(screen.getByText(/\u8cb7\u3044/)).toBeInTheDocument(); // 買い
      expect(screen.getByTestId('alert-confidence')).toHaveTextContent('85%');
      expect(screen.getByTestId('alert-target-price')).toHaveTextContent('1030.00');
    });
  });

  it('shows unread alert count', async () => {
    const alerts: Alert[] = [
      { id: '1', type: 'STOCK', severity: 'HIGH', symbol: '4385', title: 'T1', message: 'T1', timestamp: new Date().toISOString(), acknowledged: false },
      { id: '2', type: 'STOCK', severity: 'HIGH', symbol: '4385', title: 'T2', message: 'T2', timestamp: new Date().toISOString(), acknowledged: false },
    ];
    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const badge = screen.getByTestId('unread-count-text');
      expect(badge).toHaveTextContent(/2/);
    });
  });

  it('toggles notification settings', async () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);
    const settingsButton = screen.getByTitle(/\u8a2d\u5b9a/); // 設定
    fireEvent.click(settingsButton);

    await waitFor(() => {
      const toggle = screen.getByTestId('notifications-enabled-toggle');
      const initialState = useAlertStore.getState().settings.enabled;
      fireEvent.click(toggle);
      expect(useAlertStore.getState().settings.enabled).toBe(!initialState);
    });
  });

  it('formats timestamp correctly', async () => {
    const now = new Date();
    const nowTimestamp = new Date(now.getTime() - 1000);

    const alert: Alert = {
      id: 't-now',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'T-NOW',
      message: 'test',
      timestamp: nowTimestamp.toISOString(),
      acknowledged: false,
    };

    useAlertStore.getState().addAlert(alert);
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      expect(screen.getByText(/\u305f\u3063\u305f\u4eca/)).toBeInTheDocument(); // たった今
    });
  });
});
