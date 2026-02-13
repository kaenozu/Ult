import React from 'react';
import { render, screen } from '@testing-library/react';
import { BacktestResultsDashboard } from '../index';
import { BacktestResult } from '@/app/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div />,
  TrendingDown: () => <div />,
  Activity: () => <div />,
  BarChart3: () => <div />,
  PieChart: () => <div />,
  Calendar: () => <div />,
  Clock: () => <div />,
  Target: () => <div />,
  AlertTriangle: () => <div />,
  Award: () => <div />,
  Percent: () => <div />,
  DollarSign: () => <div />,
  Shield: () => <div />,
  Zap: () => <div />,
}));

const mockResult: BacktestResult = {
  symbol: '7203',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  totalReturn: 15.5,
  winRate: 60,
  winningTrades: 6,
  losingTrades: 4,
  totalTrades: 10,
  maxDrawdown: 5.2,
  profitFactor: 1.8,
  avgProfit: 3.5,
  avgLoss: 2.1,
  trades: [],
  equityCurve: [],
};

describe('BacktestResultsDashboard', () => {
  it('should render the dashboard header', () => {
    render(<BacktestResultsDashboard result={mockResult} />);
    expect(screen.getByText(/バックテスト結果/i)).toBeInTheDocument();
    expect(screen.getByText(/7203/i)).toBeInTheDocument();
  });

  it('should render summary metrics', () => {
    render(<BacktestResultsDashboard result={mockResult} />);
    expect(screen.getAllByText(/15.5%/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/60%/i)[0]).toBeInTheDocument();
  });
});
