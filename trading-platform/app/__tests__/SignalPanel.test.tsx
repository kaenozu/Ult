/**
 * SignalPanel - TDD Test Suite
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS, generateMockSignal } from '@/app/data/stocks';

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

  it('renders signal data correctly', async () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders loading state when signal is null', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={true} />);
    expect(screen.getByText('Analyzing Market Data...')).toBeInTheDocument();
  });
});
