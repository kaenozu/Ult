import React from 'react';
import { render, screen } from '@testing-library/react';
import { RiskDashboard } from '../index';
import { Portfolio } from '@/app/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Shield: () => <div data-testid="icon-shield" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  TrendingDown: () => <div />,
  Activity: () => <div />,
  PieChart: () => <div />,
  Target: () => <div />,
  DollarSign: () => <div />,
  BarChart3: () => <div />,
  Settings: () => <div />,
  ChevronDown: () => <div />,
  ChevronUp: () => <div />,
  Info: () => <div />,
  CheckCircle: () => <div />,
  XCircle: () => <div />,
}));

const mockPortfolio: Portfolio = {
  id: 'test-portfolio',
  userId: 'test-user',
  name: 'Test Portfolio',
  positions: [],
  totalValue: 100000,
  cash: 100000,
  updatedAt: new Date().toISOString(),
};

describe('RiskDashboard', () => {
  it('should render the main dashboard container', () => {
    render(<RiskDashboard portfolio={mockPortfolio} />);
    expect(screen.getByText(/Risk Management Dashboard/i)).toBeInTheDocument();
  });

  it('should show the overview tab by default', () => {
    render(<RiskDashboard portfolio={mockPortfolio} />);
    expect(screen.getByText(/Value at Risk/i)).toBeInTheDocument();
  });
});
