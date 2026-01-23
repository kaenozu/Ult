/**
 * SignalPanel - TDD Test Suite
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';
import { Signal } from '@/app/types';

describe('SignalPanel', () => {
  const mockStock = JAPAN_STOCKS[0];
  const mockSignal: Signal = {
    symbol: mockStock.symbol,
    type: 'BUY',
    confidence: 80,
    predictedChange: 5,
    targetPrice: 1000,
    stopLoss: 900,
    reason: 'Test Reason',
    predictionDate: '2026-01-22'
  };

  it('renders signal data correctly', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    
    expect(screen.getByText('買い')).toBeInTheDocument();
    expect(screen.getByText(/AI分析エンジン/)).toBeInTheDocument();
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
  });

  it('renders loading state when signal is null', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={true} />);
    expect(screen.getByText('市場データを分析中...')).toBeInTheDocument();
  });

  it('switches to backtest tab', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} ohlcv={[]} />);
    
    // Check initial state (Signal tab)
    expect(screen.getByText('買い')).toBeInTheDocument();

    // Click Backtest tab
    const backtestTab = screen.getByText('検証結果');
    fireEvent.click(backtestTab);

    // Check backtest view
    expect(screen.getByText('勝率')).toBeInTheDocument();
    expect(screen.getByText('合計損益')).toBeInTheDocument();
  });
});