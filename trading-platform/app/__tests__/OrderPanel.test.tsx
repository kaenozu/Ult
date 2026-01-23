import { render, screen, fireEvent, within } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import { Stock } from '../types';

// Mock zustand
jest.mock('@/app/store/tradingStore', () => ({
  useTradingStore: () => ({
    portfolio: { cash: 20000 },
    addPosition: jest.fn(),
    setCash: jest.fn(),
    addJournalEntry: jest.fn(),
  }),
}));

const mockStock: Stock = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150,
  change: 1.5,
  changePercent: 1.0,
  volume: 1000000,
  market: 'us',
};

describe('OrderPanel', () => {
  it('renders inputs with accessible labels', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    // Check by label text
    expect(screen.getByLabelText(/Order Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();

    // Check association
    const quantityInput = screen.getByLabelText(/Quantity/i);
    expect(quantityInput).toHaveAttribute('type', 'number');
  });

  it('renders Buy/Sell buttons with accessible state', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    const buyButton = screen.getByRole('button', { name: 'BUY' });
    const sellButton = screen.getByRole('button', { name: 'SELL' });

    expect(buyButton).toHaveAttribute('aria-pressed', 'true');
    expect(sellButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(sellButton);

    expect(buyButton).toHaveAttribute('aria-pressed', 'false');
    expect(sellButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders confirmation modal with correct accessibility roles', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    // Trigger modal
    const actionButton = screen.getByText('PLACE BUY ORDER');
    fireEvent.click(actionButton);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');

    const title = within(modal).getByText('Confirm Order');
    const titleId = title.getAttribute('id');
    expect(titleId).toBeTruthy();
    expect(modal).toHaveAttribute('aria-labelledby', titleId);
  });
});
