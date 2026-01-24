import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';
import { runBacktest } from '@/app/lib/backtest';
import { OHLCV } from '@/app/types';

// Mock runBacktest
jest.mock('@/app/lib/backtest', () => ({
  runBacktest: jest.fn(() => ({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfitPercent: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    trades: []
  }))
}));

describe('SignalPanel Performance', () => {
  const mockStock = JAPAN_STOCKS[0];
  const mockSignal = {
    symbol: mockStock.symbol,
    type: 'BUY' as const,
    confidence: 80,
    predictedChange: 5,
    targetPrice: 1000,
    stopLoss: 900,
    reason: 'Test Reason',
    predictionDate: '2026-01-22'
  };
  const mockOHLCV: OHLCV[] = Array(100).fill({
      date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000
  });

  beforeEach(() => {
    (runBacktest as jest.Mock).mockClear();
  });

  it('delays backtest calculation until tab is selected', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} ohlcv={mockOHLCV} />);

    // Initially, runBacktest should NOT be called
    // This expects the OPTIMIZED behavior. If not optimized, this assertion will fail.
    expect(runBacktest).not.toHaveBeenCalled();

    // Switch to Backtest tab
    const backtestTab = screen.getByText('バックテスト');
    fireEvent.click(backtestTab);

    // Now it should be called
    expect(runBacktest).toHaveBeenCalled();
  });
});
