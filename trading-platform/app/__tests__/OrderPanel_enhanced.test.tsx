import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import { useTradingStore } from '../store/tradingStore';
import '@testing-library/jest-dom';

describe('OrderPanel Interaction Tests', () => {
  const mockStock = { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' as const };

  it('should allow changing quantity and show total cost', () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '200' } });
    expect(screen.getByText('￥2,000,000')).toBeInTheDocument(); // 200 * 10000
  });

  it('should execute buy order and call addPosition after confirmation', async () => {
    const addPositionSpy = jest.spyOn(useTradingStore.getState(), 'addPosition');
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);
    
    fireEvent.click(screen.getByText('買い注文を発注'));
    fireEvent.click(screen.getByText('注文を確定'));

    expect(addPositionSpy).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '7974',
      side: 'LONG',
      quantity: 100
    }));
  });

  it('should show success alert after confirming order', async () => {
    render(<OrderPanel stock={mockStock} currentPrice={10000} />);
    fireEvent.click(screen.getByText('買い注文を発注'));
    fireEvent.click(screen.getByText('注文を確定'));
    expect(await screen.findByText(/注文を送信しました/)).toBeInTheDocument();
  });
});
