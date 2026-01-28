import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockChart } from '../components/StockChart';
import { OHLCV } from '../types';
import '@testing-library/jest-dom';

// Mock Chart.js to avoid canvas errors in Node environment
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />,
  Bar: () => <div data-testid="mock-bar-chart" />,
}));

describe('StockChart Edge Case Tests', () => {
  const emptyData: OHLCV[] = [];
  const normalData = [
    { date: '2026-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }
  ];

  it('should show loading state when data is empty and loading is true', () => {
    render(<StockChart data={emptyData} loading={true} />);
    expect(screen.getByText('データを取得中...')).toBeInTheDocument();
  });

  it('should show error message when error prop is provided', () => {
    render(<StockChart data={emptyData} error="API Error" />);
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('should render chart when data is provided', () => {
    render(<StockChart data={normalData} loading={false} />);
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  it('should handle extreme price values gracefully', () => {
    const extremeData = [
      { date: '2026-01-01', open: 0.0001, high: 0.0002, low: 0.00005, close: 0.00015, volume: 1000000 }
    ];
    const { container } = render(<StockChart data={extremeData} market="japan" />);
    expect(container).toBeDefined();
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });
});
