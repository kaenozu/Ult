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
jest.mock('../components/LeftSidebar', () => ({ LeftSidebar: () => <div>LeftSidebar</div> }));
jest.mock('../components/RightSidebar', () => ({ RightSidebar: () => <div>RightSidebar</div> }));
jest.mock('../components/ChartToolbar', () => ({ ChartToolbar: () => <div>ChartToolbar</div> }));
jest.mock('../components/BottomPanel', () => ({ BottomPanel: () => <div>BottomPanel</div> }));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

// Mock next-intl
jest.mock('@/app/i18n/provider', () => ({
  useTranslations: () => (key: string) => {
    if (key === 'page.noStockSelected') return '銘柄が未選択です';
    if (key === 'page.noStockSelectedDescription') return 'ウォッチリストから銘柄を選択するか、検索してください。';
    if (key === 'page.searchStock') return '銘柄を検索';
    if (key === 'page.dataFetchError') return 'データ取得エラー';
    return key;
  },
}));

describe('Workstation Page - Initial State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStockData.mockReturnValue(defaultStockData);
  });

  it('shows placeholder message when watchlist is empty', () => {
    // ストアを「銘柄なし」の状態にする
    useWatchlistStore.setState({
      watchlist: [],
      selectedStock: null,
    });
    mockUseStockData.mockReturnValue({ ...defaultStockData, selectedStock: null });

    render(<Workstation />);
    
    // In test environment, translations return key
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
    
    useWatchlistStore.setState({
      selectedStock: mockStock,
      watchlist: [mockStock],
    });
    mockUseStockData.mockReturnValue({ ...defaultStockData, selectedStock: mockStock });

    render(<Workstation />);
    
    expect(screen.queryByText('page.noStockSelected')).not.toBeInTheDocument();
  });
});
