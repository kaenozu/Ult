/**
 * SignalPanel - TDD Test Suite
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';

// Mock generateMockSignal to avoid random behavior
jest.mock('@/app/data/stocks', () => {
  const actual = jest.requireActual('@/app/data/stocks');
  return {
    ...actual,
    generateMockSignal: jest.fn(() => ({
      type: 'BUY',
      confidence: 80,
      predictedChange: 5,
      targetPrice: 1000,
      stopLoss: 900,
      reason: 'Test Reason'
    }))
  };
});

describe('SignalPanel', () => {
  const mockStock = JAPAN_STOCKS[0];

  it('renders signal data correctly', async () => {
    render(<SignalPanel stock={mockStock} />);
    
    await waitFor(() => {
      expect(screen.getByText('BUY')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Reason')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });
});
