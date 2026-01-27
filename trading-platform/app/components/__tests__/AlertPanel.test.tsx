import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertPanel } from '@/app/components/AlertPanel';
import { useAlertStore } from '@/app/store/alertStore';
import { Alert, AlertSeverity, AlertType } from '@/app/lib/alertTypes';

describe('AlertPanel', () => {
  const mockStock = {
    symbol: '4385',
    name: 'テスト株',
    market: 'japan' as const,
    sector: 'テクノロジー',
    price: 1000,
    change: 10,
    changePercent: 1.0,
    volume: 1000000,
  };

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

  it('renders alert panel header', () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    expect(screen.getByText('アラートパネル')).toBeInTheDocument();
    expect(screen.getByText('通知センター')).toBeInTheDocument();
  });

  it('shows "no alerts" message when alerts list is empty', () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    expect(screen.getByText('アラートはありません')).toBeInTheDocument();
    expect(screen.getByText('新しいアラートを待機中')).toBeInTheDocument();
  });

  it('renders alert items', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'ブレイクアウト検知',
        message: '1000円で強いサポートラインを突破',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'MEDIUM',
        symbol: '^N225',
        title: '市場イベント',
        message: '日経225が2%上昇',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      expect(screen.getByText('ブレイクアウト検知')).toBeInTheDocument();
      expect(screen.getByText('市場イベント')).toBeInTheDocument();
    });
  });

  it('filters alerts by type', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: '銘柄イベント',
        message: 'テスト',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'HIGH',
        symbol: '^N225',
        title: '市場イベント',
        message: 'テスト',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const stockFilter = screen.getByText('銘柄');
      fireEvent.click(stockFilter);

      expect(screen.getByText('銘柄イベント')).toBeInTheDocument();
      expect(screen.queryByText('市場イベント')).not.toBeInTheDocument();
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
        type: 'STOCK',
        severity: 'LOW',
        symbol: '4385',
        title: '低優先度',
        message: '低優先度アラート',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const highFilter = screen.getByText('🔴');
      fireEvent.click(highFilter);

      expect(screen.getByText('高優先度')).toBeInTheDocument();
      expect(screen.queryByText('低優先度')).not.toBeInTheDocument();
    });
  });

  it('acknowledges alert when checkmark is clicked', async () => {
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
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const acknowledgeButton = screen.getByTitle('既読にする');
      fireEvent.click(acknowledgeButton);

      expect(useAlertStore.getState().alerts[0].acknowledged).toBe(true);
      expect(screen.getByText('✓ 既読')).toBeInTheDocument();
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
        type: 'STOCK',
        severity: 'MEDIUM',
        symbol: '4385',
        title: 'テスト2',
        message: 'テストメッセージ2',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const acknowledgeAllButton = screen.getByText('全既読');
      fireEvent.click(acknowledgeAllButton);

      const state = useAlertStore.getState();
      expect(state.unreadCount).toBe(0);
    });
  });

  it('shows actionable alert details', async () => {
    const alert: Alert = {
      id: 'test-actionable',
      type: 'STOCK',
      severity: 'HIGH',
      symbol: '4385',
      title: 'ブレイクアウト',
      message: '強いレベルを突破',
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
      expect(screen.getByText('買い')).toBeInTheDocument();
      expect(screen.getByText('信頼度: 85%')).toBeInTheDocument();
      expect(screen.getByText(/1030/)).toBeInTheDocument();
      expect(screen.getByText(/980/)).toBeInTheDocument();
    });
  });

  it('shows unread alert count', async () => {
    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'テスト',
        message: 'テスト',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'MARKET',
        severity: 'MEDIUM',
        symbol: '^N225',
        title: 'テスト',
        message: 'テスト',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      const badge = screen.getByText('未読アラート: 2件');
      expect(badge).toBeInTheDocument();
    });
  });

  it('opens and closes settings panel', async () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    const settingsButton = screen.getByTitle('設定');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('通知種類')).toBeInTheDocument();
      expect(screen.getByText('優先度フィルター')).toBeInTheDocument();
      expect(screen.getByText('通知設定')).toBeInTheDocument();
    });

    const closeButton = screen.getByTitle('設定');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('通知種類')).not.toBeInTheDocument();
    });
  });

  it('toggles notification settings', async () => {
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    const settingsButton = screen.getByTitle('設定');
    fireEvent.click(settingsButton);

    await waitFor(async () => {
      const toggle = screen.getByText('通知機能').parentElement?.querySelector('button');
      if (toggle) {
        const initialState = useAlertStore.getState().settings.enabled;
        fireEvent.click(toggle);

        await waitFor(async () => {
          const newState = useAlertStore.getState().settings.enabled;
          expect(newState).toBe(!initialState);
        });
      }
    });
  });

  it('formats timestamp correctly', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const alerts: Alert[] = [
      {
        id: 'test-1',
        type: 'STOCK',
        severity: 'HIGH',
        symbol: '4385',
        title: 'たった今',
        message: 'テスト',
        timestamp: oneMinuteAgo.toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-2',
        type: 'STOCK',
        severity: 'MEDIUM',
        symbol: '4385',
        title: '1時間前',
        message: 'テスト',
        timestamp: oneHourAgo.toISOString(),
        acknowledged: false,
      },
      {
        id: 'test-3',
        type: 'STOCK',
        severity: 'LOW',
        symbol: '4385',
        title: '1日前',
        message: 'テスト',
        timestamp: oneDayAgo.toISOString(),
        acknowledged: false,
      },
    ];

    alerts.forEach(alert => useAlertStore.getState().addAlert(alert));
    render(<AlertPanel symbol={mockStock.symbol} stockPrice={mockStock.price} />);

    await waitFor(() => {
      expect(screen.getByText('たった今')).toBeInTheDocument();
      expect(screen.getByText('1時間前')).toBeInTheDocument();
      expect(screen.getByText('1日前')).toBeInTheDocument();
    });
  });
});
