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

    // Verify inputs are accessible via labels
    expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
    expect(screen.getByLabelText('Market')).toBeInTheDocument();
    expect(screen.getByLabelText('Strategy')).toBeInTheDocument();
    expect(screen.getByLabelText('Timeframe')).toBeInTheDocument();

    // Verify default values
    expect(screen.getByLabelText('Symbol')).toHaveValue('AAPL');
    expect(screen.getByLabelText('Market')).toHaveValue('usa');
  });

  it('shows loading state when running backtest', async () => {
    render(<BacktestPanel />);

    const runButton = screen.getByRole('button', { name: /run backtest/i });
    expect(runButton).toBeInTheDocument();
    expect(screen.getByTestId('icon-play')).toBeInTheDocument();

    // Start backtest
    fireEvent.click(runButton);

    // Check loading state
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Running...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();

    // Check aria-busy
    // We look for the CardContent which should have aria-busy="true"
    // Since CardContent renders a div, we can look for it by role or just querySelector if needed,
    // but aria-busy is not a role.
    // Let's find the container that has aria-busy.
    // The structure is Card > CardHeader ... CardContent (aria-busy) ...
    // We can just query by attribute.
    // Note: getByRole('status') or similar might not work unless we gave it a role.
    // But testing-library doesn't have getByAriaBusy.
    // We can check if *any* element has aria-busy="true".
    const busyElement = document.querySelector('[aria-busy="true"]');
    expect(busyElement).toBeInTheDocument();

    // Wait for finish
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /run backtest/i })).toBeEnabled();
    });

    expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
    expect(screen.getByTestId('icon-play')).toBeInTheDocument();
  });
});
