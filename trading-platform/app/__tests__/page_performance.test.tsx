/** @jest-environment jsdom */
import { render, act } from '@testing-library/react';
import Workstation from '../page';
import { usePortfolioStore } from '../store/portfolioStore';
import { useUIStore } from '../store/uiStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { Header } from '@/app/components/Header';

// Mock translations
jest.mock('@/app/i18n/provider', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useStockData
jest.mock('../hooks/useStockData', () => ({
  useStockData: () => ({
    loading: false,
    error: null,
    selectedStock: null,
    chartData: [],
    indexData: [],
    chartSignal: null,
    interval: 'daily',
    handleStockSelect: jest.fn(),
    setInterval: jest.fn(),
  }),
}));

// Mock child components
jest.mock('@/app/components/Header', () => ({ Header: jest.fn(() => <div>Header</div>) }));
jest.mock('../components/Navigation', () => ({ Navigation: () => <div>Navigation</div> }));
jest.mock('../components/StockTable', () => ({ StockTable: () => <div>StockTable</div> }));
jest.mock('../components/PositionTable', () => ({ PositionTable: () => <div>PositionTable</div> }));
jest.mock('../components/HistoryTable', () => ({ HistoryTable: () => <div>HistoryTable</div> }));
jest.mock('../components/SignalPanel', () => ({ SignalPanel: () => <div>SignalPanel</div> }));
jest.mock('../components/StockChart', () => ({ StockChart: () => <div>StockChart</div> }));
jest.mock('../components/OrderPanel', () => ({ OrderPanel: () => <div>OrderPanel</div> }));
jest.mock('../components/LeftSidebar', () => ({ LeftSidebar: () => <div>LeftSidebar</div> }));
jest.mock('../components/RightSidebar', () => ({ RightSidebar: () => <div>RightSidebar</div> }));
jest.mock('../components/ChartToolbar', () => ({ ChartToolbar: () => <div>ChartToolbar</div> }));
jest.mock('../components/BottomPanel', () => ({ BottomPanel: () => <div>BottomPanel</div> }));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

describe('Workstation Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUIStore.setState({ theme: 'dark' });
    useWatchlistStore.setState({ watchlist: [] });
    usePortfolioStore.setState({ portfolio: { positions: [], orders: [], totalValue: 0, totalProfit: 0, dailyPnL: 0, cash: 1000000 }, aiStatus: 'active' });
  });

  it('should not re-render when unrelated store state changes', () => {
    render(<Workstation />);

    // Header should have been rendered once
    expect(Header).toHaveBeenCalledTimes(1);

    // Trigger unrelated state change (theme toggle)
    act(() => {
      useUIStore.getState().toggleTheme();
    });

    // If optimized, should still be 1. If not, it will be 2.
    expect(Header).toHaveBeenCalledTimes(1);
  });
});
