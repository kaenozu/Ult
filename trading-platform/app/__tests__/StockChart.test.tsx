/**
 * StockChart - TDD Test Suite
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockChart } from '@/app/components/StockChart';
import { OHLCV } from '@/app/types';

function generateMockOHLCV(startPrice: number, days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let currentPrice = startPrice;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const open = currentPrice;
    const change = (Math.random() - 0.5) * 10;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }
  return data;
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Chart.js to avoid canvas errors in JSDOM
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

describe('StockChart', () => {
  const mockData = generateMockOHLCV(1000, 10);

  it('renders without crashing', () => {
    render(<StockChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StockChart data={[]} loading={true} />);
    expect(screen.getByText(/データを取得中.../i)).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<StockChart data={[]} error="Failed to fetch" />);
    expect(screen.getByText(/データの取得に失敗しました/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
  });

  it('renders volume chart when showVolume is true', () => {
    render(<StockChart data={mockData} showVolume={true} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('does not render volume chart when showVolume is false', () => {
    render(<StockChart data={mockData} showVolume={false} />);
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });
});
