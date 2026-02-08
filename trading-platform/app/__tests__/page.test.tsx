import { render, screen } from '@testing-library/react';
import Workstation from '../page';
import { useWatchlistStore } from '../store/watchlistStore';
import { Stock } from '../types';
import '@testing-library/jest-dom';

// Mock child components to focus on page logic
jest.mock('../components/Header', () => ({ Header: () => <div>Header</div> }));
jest.mock('../components/Navigation', () => ({ Navigation: () => <div>Navigation</div> }));
jest.mock('../components/StockTable', () => ({ StockTable: () => <div>StockTable</div> }));
jest.mock('../components/PositionTable', () => ({ PositionTable: () => <div>PositionTable</div> }));
jest.mock('../components/HistoryTable', () => ({ HistoryTable: () => <div>HistoryTable</div> }));
jest.mock('../components/SignalPanel', () => ({ SignalPanel: () => <div>SignalPanel</div> }));
jest.mock('../components/StockChart', () => ({ StockChart: () => <div>StockChart</div> }));
jest.mock('../components/OrderPanel', () => ({ OrderPanel: () => <div>OrderPanel</div> }));

// Mock translations
jest.mock('@/app/i18n/provider', () => ({
  useTranslations: () => (key: string) => key,
}));

import { useStockData } from '../hooks/useStockData';

// Mock useStockData
jest.mock('../hooks/useStockData');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

describe('Workstation Page - Initial State', () => {
  const defaultMockStockData = {
    loading: false,
    error: null,
    selectedStock: null,
    chartData: [],
    indexData: [],
    chartSignal: null,
    interval: 'daily',
    handleStockSelect: jest.fn(),
    setInterval: jest.fn(),
    fallbackApplied: false,
    dataDelayMinutes: 0
  };

  beforeEach(() => {
    (useStockData as jest.Mock).mockReturnValue(defaultMockStockData);
  });

  it('shows placeholder message when watchlist is empty', () => {
    // Mock useStockData returns null selectedStock by default
    render(<Workstation />);
    
    expect(screen.getByText('page.noStockSelected')).toBeInTheDocument();
    expect(screen.getByText('page.noStockSelectedDescription')).toBeInTheDocument();
  });

  it('does not show placeholder when a stock is selected', () => {
    const mockStock: Stock = { 
      symbol: '7203', 
      name: 'トヨタ', 
      market: 'japan', 
      sector: '自動車',
      price: 3000,
      change: 0,
      changePercent: 0,
      volume: 1000000
    };
    
    (useStockData as jest.Mock).mockReturnValue({
      ...defaultMockStockData,
      selectedStock: mockStock,
    });

    render(<Workstation />);
    
    expect(screen.queryByText('page.noStockSelected')).not.toBeInTheDocument();
  });
});
