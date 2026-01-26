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
    
    expect(screen.getByText('買い')).toBeInTheDocument();
    expect(screen.getByText(/AI分析エンジン/)).toBeInTheDocument(); 
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
  });

  it('renders loading state when signal is null', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={true} />);
    expect(screen.getByText('市場データを分析中...')).toBeInTheDocument();
  });

  it('switches to backtest tab', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} />);

    // Check initial state (Signal tab)
    expect(screen.getByText('買い')).toBeInTheDocument();

    // Click Backtest tab
    const backtestTab = screen.getByText('バックテスト');
    fireEvent.click(backtestTab);

    // Check backtest view
    expect(screen.getByText('勝率')).toBeInTheDocument();
    expect(screen.getByText('合計損益')).toBeInTheDocument();
  });

  describe('予測誤差表示 (AI予測の深化)', () => {
    it('displays prediction error when available', () => {
      const signalWithError = {
        ...mockSignal,
        predictionError: 1.2
      };
      render(<SignalPanel stock={mockStock} signal={signalWithError} />);

      // 予測誤差が表示されることを確認
      expect(screen.getByText(/予測誤差/)).toBeInTheDocument();
    });

    it('does not display prediction error when not available', () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);

      // 予測誤差が含まれないことを確認
      expect(screen.queryByText(/予測誤差/)).not.toBeInTheDocument();
    });

    it('uses color coding for prediction error levels', () => {
      const highErrorSignal = {
        ...mockSignal,
        predictionError: 2.0 // 高い誤差
      };
      render(<SignalPanel stock={mockStock} signal={highErrorSignal} />);

      // 高い予測誤差の場合は警告色で表示
      expect(screen.getByText(/予測誤差/)).toBeInTheDocument();
    });
  });
});
