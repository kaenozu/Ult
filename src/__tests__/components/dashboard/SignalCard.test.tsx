import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SignalCard from '@/components/features/dashboard/SignalCard';
import { getSignal, executeTrade } from '@/components/shared/utils/api';
import { SignalResponse } from '@/types';

// Mock the API functions
jest.mock('@/components/shared/utils/api', () => ({
  getSignal: jest.fn(),
  executeTrade: jest.fn(),
}));

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    isAuthenticated: true,
  }),
}));

const mockGetSignal = getSignal as jest.MockedFunction<typeof getSignal>;
const mockExecuteTrade = executeTrade as jest.MockedFunction<
  typeof executeTrade
>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
  );
};

describe('SignalCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockGetSignal.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithProviders(<SignalCard ticker='AAPL' name='Apple Inc.' />);

    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('displays signal data correctly', async () => {
    const mockSignal: SignalResponse = {
      ticker: 'AAPL',
      signal: 1,
      confidence: 0.85,
      explanation: 'Strong bullish momentum detected',
      strategy: 'Buy',
      entry_price: 150.25,
      take_profit: 165.0,
      stop_loss: 145.5,
    };

    mockGetSignal.mockResolvedValue(mockSignal);

    renderWithProviders(<SignalCard ticker='AAPL' name='Apple Inc.' />);

    await waitFor(() => {
      expect(
        screen.getByText('Strong bullish momentum detected')
      ).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('買いシグナル')).toBeInTheDocument();
    });
  });

  it('displays strategy information correctly', async () => {
    mockGetSignal.mockResolvedValue({
      ticker: 'AAPL',
      signal: 1,
      confidence: 0.75,
      explanation: 'Technical indicators suggest bullish trend',
      strategy: 'Buy',
      entry_price: 150.25,
      take_profit: 155,
      stop_loss: 148,
    });

    renderWithProviders(<SignalCard ticker='AAPL' name='Apple Inc.' />);

    await waitFor(() => {
      expect(
        screen.getByText('Technical indicators suggest bullish trend')
      ).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('handles very long ticker names', () => {
    mockGetSignal.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithProviders(
      <SignalCard ticker='VERYLONGTICKERNAME' name='Very Long Company Name' />
    );

    expect(screen.getByText('Very Long Company Name')).toBeInTheDocument();
  });

  it('executes trade on button click when entry price exists', async () => {
    mockGetSignal.mockResolvedValue({
      ticker: 'MSFT',
      signal: 1,
      confidence: 0.9,
      explanation: 'Breakout pattern detected',
      strategy: 'Buy',
      entry_price: 300.5,
      take_profit: 210,
      stop_loss: 290,
    });

    mockExecuteTrade.mockResolvedValue({
      success: true,
      message: 'Trade executed successfully',
      tradeId: 'trade_123',
    });

    renderWithProviders(<SignalCard ticker='MSFT' name='Microsoft Corp.' />);

    await waitFor(() => {
      expect(screen.getByText('Breakout pattern detected')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('注文実行'));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        ticker: 'MSFT',
        signal: 1,
        confidence: 0.9,
        explanation: 'Breakout pattern detected',
        strategy: 'Buy',
        entry_price: 300.5,
        take_profit: 210,
        stop_loss: 290,
      });
    });
  });

  it('does not execute trade when no entry price', async () => {
    mockGetSignal.mockResolvedValue({
      ticker: 'NVDA',
      signal: 0,
      confidence: 0.5,
      explanation: 'No clear signal',
      strategy: 'Wait',
    });

    renderWithProviders(<SignalCard ticker='NVDA' name='NVIDIA Corp.' />);

    await waitFor(() => {
      expect(screen.getByText('注文実行')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('注文実行'));

    expect(mockExecuteTrade).not.toHaveBeenCalled();
  });
});
