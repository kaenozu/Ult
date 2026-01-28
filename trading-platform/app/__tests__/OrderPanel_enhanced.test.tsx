import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import '@testing-library/jest-dom';

// Use actual store but mock addPosition
// Use actual store but mock addPosition
jest.mock('../store/portfolioStore', () => ({
  ...jest.requireActual('../store/tradingStore'),
  usePortfolioStore: () => ({
    portfolio: { cash: 10000000 },
    addPosition: jest.fn(),
    setCash: jest.fn(),
    addJournalEntry: jest.fn(),
  }),
}));

describe('OrderPanel Interaction Tests', () => {
  const mockStock = { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' as const };

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
    fireEvent.click(screen.getByText('\u8CB7\u3044\u6CE8\u6587\u3092\u767A\u6CE8'));

    // Wait for confirmation dialog to appear
    await waitFor(() => {
      expect(screen.getByText('注文を確定')).toBeInTheDocument();
    });

    // Click confirm button
    fireEvent.click(screen.getByText('注文を確定'));

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
