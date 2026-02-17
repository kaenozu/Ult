import React from 'react';
import { render, screen } from '@testing-library/react';
import { StockChart } from '../components/StockChart';
import { OHLCV } from '../types';
import '@testing-library/jest-dom';

describe('StockChart Edge Case Tests', () => {
  const emptyData: OHLCV[] = [];
  const normalData = [
    { date: '2026-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 }
  ];

  it('should show loading state when data is empty and loading is true', () => {
    render(<StockChart data={emptyData} loading={true} />);
    expect(screen.getByText('チャートデータを読み込み中...')).toBeInTheDocument();
  });

  it('should show error message when error prop is provided', () => {
    render(<StockChart data={emptyData} error="API Error" />);
    expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('should render chart when data is provided', () => {
    render(<StockChart data={normalData} loading={false} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle extreme price values gracefully', () => {
    const extremeData = [
      { date: '2026-01-01', open: 0.0001, high: 0.0002, low: 0.00005, close: 0.00015, volume: 1000000 }
    ];
    const { container } = render(<StockChart data={extremeData} market="japan" />);
    expect(container).toBeDefined();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
