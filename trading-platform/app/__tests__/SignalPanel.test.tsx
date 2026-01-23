/**
 * SignalPanel - TDD Test Suite
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';

describe('SignalPanel', () => {
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

  it('renders signal data correctly', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText(/主要因:/)).toBeInTheDocument(); // Updated UI text
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders loading state when signal is null', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={true} />);
    expect(screen.getByText('Analyzing Market Data...')).toBeInTheDocument();
  });

  it('switches to backtest tab', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} ohlcv={[]} />);
    
    // Check initial state (Signal tab)
    expect(screen.getByText('BUY')).toBeInTheDocument();

    // Click Backtest tab
    const backtestTab = screen.getByText('検証結果');
    fireEvent.click(backtestTab);

    // Check backtest view
    expect(screen.getByText('勝率')).toBeInTheDocument();
    expect(screen.getByText('合計損益')).toBeInTheDocument();
  });
});
