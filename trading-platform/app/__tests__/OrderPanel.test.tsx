import { render, screen, fireEvent } from '@testing-library/react';
import { OrderPanel } from '../components/OrderPanel';
import { Stock } from '../types';

// Mock zustand
jest.mock('@/app/store/portfolioStore', () => ({
  usePortfolioStore: () => ({
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
  market: 'usa',
  sector: 'テクノロジー',
};

describe('OrderPanel', () => {
  it('renders inputs with accessible labels', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    // Check by label text
    expect(screen.getByLabelText(/注文種別/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/数量/i).length).toBeGreaterThan(0);

    // Check association
    const select = screen.getByLabelText(/注文種別/i);
    expect(select.tagName).toBe('SELECT');
  });

  it('renders Buy/Sell buttons with accessible state', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    const buyButton = screen.getByRole('button', { name: '買い' });
    const sellButton = screen.getByRole('button', { name: '空売り' });

    expect(buyButton).toHaveAttribute('aria-pressed', 'true');
    expect(sellButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders confirmation modal with correct accessibility roles', () => {
    render(<OrderPanel stock={mockStock} currentPrice={150} />);

    // Trigger modal
    const actionButton = screen.getByText('\u8CB7\u3044\u6CE8\u6587\u3092\u767A\u6CE8');
    fireEvent.click(actionButton);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });
});
