import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import { useTradingStore } from '../store/tradingStore';
import '@testing-library/jest-dom';

// Mock window.alert
const alertMock = jest.fn();
global.alert = alertMock;

// Use actual store but mock addPosition
jest.mock('../store/tradingStore', () => ({
  ...jest.requireActual('../store/tradingStore'),
  useTradingStore: () => ({
    portfolio: { cash: 10000000 },
    addPosition: jest.fn(),
    setCash: jest.fn(),
    addJournalEntry: jest.fn(),
  }),
}));

describe('OrderPanel Interaction Tests', () => {
  const mockStock = { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' as const };

  beforeEach(() => {
    alertMock.mockClear();
  });

  it('should allow changing quantity and show total cost', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '200' } });
    await waitFor(() => {
      expect(screen.getByText('￥2,000,000')).toBeInTheDocument(); // 200 * 10000
    });
  });

  it('should execute buy order and call addPosition after confirmation', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);

    // Click the buy order button to show confirmation dialog
    fireEvent.click(screen.getByText('買い注文を発注'));

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText('注文を確定')).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByText('注文を確定'));

    // Wait for alert to be called
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('注文を実行しました'));
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('買い'));
    });
  });

  it('should show success alert after confirming order', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);

    // Click the buy order button
    fireEvent.click(screen.getByText('買い注文を発注'));

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('注文を確定')).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByText('注文を確定'));

    // Check alert was called with buy order details
    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('買い'));
    });
  });
});
