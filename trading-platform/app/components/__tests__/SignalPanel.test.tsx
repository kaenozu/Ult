import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '../SignalPanel';
import { useTradingStore } from '@/app/store/tradingStore';
import { useWebSocket } from '@/app/hooks/useWebSocket';

// Mocks
jest.mock('@/app/store/tradingStore', () => ({
  useTradingStore: jest.fn(),
}));

jest.mock('@/app/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('@/app/lib/backtest', () => ({
  runBacktest: jest.fn().mockReturnValue({
    totalTrades: 10,
    winningTrades: 6,
    losingTrades: 4,
    winRate: 60,
    totalProfitPercent: 15.5,
    maxDrawdown: 5,
    profitFactor: 1.5,
    trades: []
  }),
}));

jest.mock('@/app/lib/analysis', () => ({
  calculateAIHitRate: jest.fn().mockReturnValue({ hitRate: 70, totalTrades: 20 }),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  })
) as jest.Mock;

describe('SignalPanel Accessibility', () => {
  const mockStock = {
    symbol: '7203',
    name: 'Toyota',
    market: 'japan' as const,
    description: 'Test',
    sector: 'Auto',
    price: 2000,
    change: 10,
    changePercent: 0.5,
  };

  const mockSignal = {
    symbol: '7203',
    type: 'BUY' as const,
    confidence: 80,
    predictedChange: 2,
    targetPrice: 2100,
    stopLoss: 1950,
    reason: 'Test reason',
    predictionDate: '2024-05-23',
    predictionError: 0.5,
  };

  const mockAiStatus = {
    trades: [],
    totalProfit: 1000,
    virtualBalance: 1000000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        aiStatus: mockAiStatus,
        processAITrades: jest.fn(),
      };
      return selector ? selector(state) : state;
    });
    (useWebSocket as unknown as jest.Mock).mockReturnValue({
      status: 'OPEN',
      lastMessage: null,
    });
  });

  it('renders tablist and tabs with correct roles', async () => {
    await act(async () => {
        render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    const tablist = screen.getByRole('tablist', { name: '分析パネル' });
    expect(tablist).toBeInTheDocument();

    const signalTab = screen.getByRole('tab', { name: 'シグナル' });
    const backtestTab = screen.getByRole('tab', { name: 'バックテスト' });
    const aiTab = screen.getByRole('tab', { name: 'AI戦績' });

    expect(signalTab).toBeInTheDocument();
    expect(backtestTab).toBeInTheDocument();
    expect(aiTab).toBeInTheDocument();
  });

  it('has correct aria-selected state and controls proper panels', async () => {
    await act(async () => {
        render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    const signalTab = screen.getByRole('tab', { name: 'シグナル' });
    const backtestTab = screen.getByRole('tab', { name: 'バックテスト' });

    // Initial state: Signal tab selected
    expect(signalTab).toHaveAttribute('aria-selected', 'true');
    expect(backtestTab).toHaveAttribute('aria-selected', 'false');

    // Panel association
    const panelId = signalTab.getAttribute('aria-controls');
    expect(panelId).toBe('panel-signal');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', panelId);
    expect(panel).toHaveAttribute('aria-labelledby', signalTab.getAttribute('id'));
  });

  it('switches tabs and updates accessibility attributes', async () => {
    await act(async () => {
        render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    const backtestTab = screen.getByRole('tab', { name: 'バックテスト' });

    // Click backtest tab
    await act(async () => {
        fireEvent.click(backtestTab);
    });

    expect(backtestTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'シグナル' })).toHaveAttribute('aria-selected', 'false');

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'panel-backtest');
  });
});
