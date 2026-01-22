/**
 * SignalPanel - TDD Test Suite
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';
import { Signal } from '@/app/types';

describe('SignalPanel', () => {
  const mockStock = JAPAN_STOCKS[0];
  const mockSignal: Signal = {
    symbol: '7203',
    type: 'BUY',
    confidence: 80,
    predictedChange: 5,
    targetPrice: 1000,
    stopLoss: 900,
    reason: 'Test Reason',
    predictionDate: '2024-01-01'
  };

  it('renders signal data correctly', () => {
    render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
