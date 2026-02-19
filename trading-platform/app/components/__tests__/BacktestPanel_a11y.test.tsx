import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BacktestPanel } from '../BacktestPanel';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ result: { success: true } }),
  })
) as jest.Mock;

// Mock lucide-react icons since they might not render in test environment properly or to simplify snapshots
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert" />,
  BarChart3: () => <span data-testid="icon-chart" />,
  Play: () => <span data-testid="icon-play" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

// Mock child components to avoid deep rendering issues
jest.mock('@/app/components/backtest/BacktestResultsDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="results-dashboard" />,
  BacktestResultsDashboard: () => <div data-testid="results-dashboard" />,
}));

describe('BacktestPanel Accessibility and UX', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders form elements with accessible labels', () => {
    render(<BacktestPanel />);

    // Verify inputs are accessible via labels (Japanese)
    expect(screen.getByLabelText('銘柄')).toBeInTheDocument();
    expect(screen.getByLabelText('市場')).toBeInTheDocument();
    expect(screen.getByLabelText('戦略')).toBeInTheDocument();
    expect(screen.getByLabelText('期間')).toBeInTheDocument();

    // Verify default values
    expect(screen.getByLabelText('銘柄')).toHaveValue('AAPL');
    expect(screen.getByLabelText('市場')).toHaveValue('usa');
  });

  it('shows loading state when running backtest', async () => {
    render(<BacktestPanel />);

    const runButton = screen.getByRole('button', { name: /バックテスト実行/i });
    expect(runButton).toBeInTheDocument();
    expect(screen.getByTestId('icon-play')).toBeInTheDocument();

    // Start backtest
    fireEvent.click(runButton);

    // Check loading state
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('実行中...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();

    // Check aria-busy (Improved robustness based on review)
    const contentContainer = screen.getByText('銘柄').closest('[aria-busy]');
    expect(contentContainer).toHaveAttribute('aria-busy', 'true');

    // Wait for finish
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /バックテスト実行/i })).toBeEnabled();
    });

    expect(contentContainer).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
    expect(screen.getByTestId('icon-play')).toBeInTheDocument();
  });
});
