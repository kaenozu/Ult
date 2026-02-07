import { render, screen } from '@testing-library/react';
import Workstation from '../page';
import { useTradingStore } from '../store/tradingStore';
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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

describe('Workstation Page - Initial State', () => {
  it('shows placeholder message when watchlist is empty', () => {
    // ストアを「銘柄なし」の状態にする
    useTradingStore.setState({
      watchlist: [],
      selectedStock: null,
    });

    render(<Workstation />);
    
    expect(screen.getByText('銘柄が未選択です')).toBeInTheDocument();
    expect(screen.getByText(/ウォッチリストから銘柄を選択するか/)).toBeInTheDocument();
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
    
    useTradingStore.setState({
      selectedStock: mockStock,
      watchlist: [mockStock],
    });

    render(<Workstation />);
    
    expect(screen.queryByText('銘柄が未選択です')).not.toBeInTheDocument();
  });
});
