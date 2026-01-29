import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import { useTradingStore } from '../store/tradingStore';
import '@testing-library/jest-dom';

// Mock useTradingStore
jest.mock('../store/tradingStore');

describe('OrderPanel Interaction Tests', () => {
  const mockStock = { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' as const };
  const mockExecuteOrder = jest.fn().mockReturnValue({ success: true });
  const mockAddPosition = jest.fn();
  const mockSetCash = jest.fn();
  const mockAddJournalEntry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
            portfolio: { cash: 10000000, positions: [] },
            executeOrder: mockExecuteOrder,
            addPosition: mockAddPosition,
            setCash: mockSetCash,
            addJournalEntry: mockAddJournalEntry,
        };
        return selector ? selector(state) : state;
    });
  });

  it('should allow changing quantity and show total cost', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '200' } });
    await waitFor(() => {
      expect(screen.getByText('￥2,000,000')).toBeInTheDocument(); // 200 * 10000
    });
  });

  it('should execute buy order and call executeOrder after confirmation', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);

    // Click the buy order button (text depends on logic, likely "買い注文を発注" or similar if logic allows)
    // Based on previous test failures, text was "買い注文を発注"
    // But OrderPanel renders unicode in button: \u8CB7\u3044\u6CE8\u6587\u3092\u767A\u6CE8 which is "買い注文を発注"
    fireEvent.click(screen.getByText('買い注文を発注'));

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText('注文を確定')).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByText('注文を確定'));

    // Verify executeOrder was called
    expect(mockExecuteOrder).toHaveBeenCalled();

    // Wait for success message to appear
    await waitFor(() => {
      expect(screen.getByText('注文を送信しました')).toBeInTheDocument();
    });

    // Verify confirmation dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('注文を確定')).not.toBeInTheDocument();
    });
  });

  it('should show success message after confirming order', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);

    // Click the buy order button
    fireEvent.click(screen.getByText('買い注文を発注'));

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('注文を確定')).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByText('注文を確定'));

    // Check success message is displayed
    await waitFor(() => {
      expect(screen.getByText('注文を送信しました')).toBeInTheDocument();
    });

    // Verify the success message contains order details (green background indicates buy order)
    const successMessage = screen.getByText('注文を送信しました');
    expect(successMessage).toHaveClass('bg-green-600');
  });
});
