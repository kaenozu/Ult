
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useTradingStore } from '@/app/store/tradingStore';
import * as orderExecutionStore from '@/app/store/orderExecutionStore';
import { useUIStore } from '@/app/store/uiStore';
import { useSymbolAccuracy } from '@/app/hooks/useSymbolAccuracy';

// Mock dependencies
jest.mock('@/app/store/portfolioStore');
jest.mock('@/app/store/tradingStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
  useExecuteOrder: jest.fn(),
}));
jest.mock('@/app/store/uiStore');
jest.mock('@/app/hooks/useSymbolAccuracy');
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
}));

describe('OrderPanel', () => {
  const mockExecuteOrder = jest.fn();
  const mockUpdatePortfolio = jest.fn();
  const mockAddNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (usePortfolioStore as unknown as jest.Mock).mockReturnValue({
      updatePortfolio: mockUpdatePortfolio,
    });

    (useTradingStore as unknown as jest.Mock).mockReturnValue({
      portfolio: { orders: [] },
    });

    // Mock useExecuteOrder to return the execute function and loading state
    (orderExecutionStore.useExecuteOrder as jest.Mock).mockReturnValue({
      executeOrder: mockExecuteOrder,
      isLoading: false,
      error: null
    });

    (useUIStore as unknown as jest.Mock).mockReturnValue({
      addNotification: mockAddNotification,
    });

    (useSymbolAccuracy as unknown as jest.Mock).mockReturnValue({
      accuracy: 0.85,
      trend: 'up',
    });
  });

  it('renders order form correctly', () => {
    render(<OrderPanel symbol="AAPL" currentPrice={150.00} />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sell/i })).toBeInTheDocument();
  });

  it('handles quantity input changes', () => {
    render(<OrderPanel symbol="AAPL" currentPrice={150.00} />);

    const input = screen.getByLabelText(/shares/i);
    fireEvent.change(input, { target: { value: '10' } });

    expect(input).toHaveValue(10);
    // Total should update: 10 * 150 = 1500
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
  });

  it('submits order successfully', async () => {
    mockExecuteOrder.mockResolvedValue({ success: true, orderId: '123' });

    render(<OrderPanel symbol="AAPL" currentPrice={150.00} />);

    const input = screen.getByLabelText(/shares/i);
    fireEvent.change(input, { target: { value: '10' } });

    const buyButton = screen.getByRole('button', { name: /buy/i });
    fireEvent.click(buyButton); // Select Buy side

    const submitButton = screen.getByRole('button', { name: /execute/i }); // Assuming execute button text
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockExecuteOrder).toHaveBeenCalledWith(expect.objectContaining({
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        price: 150.00
      }));
    });
  });

  it('displays error message on failure', async () => {
    mockExecuteOrder.mockRejectedValue(new Error('Insufficient funds'));

    render(<OrderPanel symbol="AAPL" currentPrice={150.00} />);

    const submitButton = screen.getByRole('button', { name: /execute/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: expect.stringContaining('Insufficient funds')
      }));
    });
  });
});
