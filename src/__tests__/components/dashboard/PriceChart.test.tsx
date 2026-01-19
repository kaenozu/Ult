import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PriceChart from '../../../components/features/dashboard/PriceChart';

// Mock the recharts components to avoid import issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='responsive-container'>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='line-chart'>{children}</div>
  ),
  Line: () => <div data-testid='line' />,
  XAxis: () => <div data-testid='x-axis' />,
  YAxis: () => <div data-testid='y-axis' />,
  CartesianGrid: () => <div data-testid='cartesian-grid' />,
  Tooltip: () => <div data-testid='tooltip' />,
}));

describe('PriceChart Component', () => {
  const mockPriceData = [
    {
      date: '2024-01-01',
      open: 98,
      high: 102,
      low: 97,
      close: 100,
      volume: 10000,
    },
    {
      date: '2024-01-02',
      open: 100,
      high: 107,
      low: 99,
      close: 105,
      volume: 12000,
    },
    {
      date: '2024-01-03',
      open: 105,
      high: 106,
      low: 101,
      close: 102,
      volume: 9000,
    },
  ];

  const defaultProps = {
    data: mockPriceData,
  };

  it('renders without crashing', () => {
    render(<PriceChart {...defaultProps} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders the line chart', () => {
    render(<PriceChart {...defaultProps} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('displays correct chart elements', () => {
    render(<PriceChart {...defaultProps} />);
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    render(<PriceChart {...defaultProps} data={[]} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('handles signal and target price', () => {
    render(<PriceChart {...defaultProps} signal={1} targetPrice={110} />);
    const container = screen.getByTestId('responsive-container');
    expect(container).toBeInTheDocument();
  });
});
