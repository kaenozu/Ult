import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Workstation from '../page';
import { useStockData } from '../hooks/useStockData';
import '@testing-library/jest-dom';

// Mock the hook
jest.mock('../hooks/useStockData');

describe('Workstation Page Comprehensive Tests', () => {
  const mockHandleStockSelect = jest.fn();
  const mockHandleClosePosition = jest.fn();

  beforeEach(() => {
    (useStockData as jest.Mock).mockReturnValue({
      watchlist: [{ symbol: '7974', name: '任天堂', price: 10000, changePercent: 5 }],
      portfolio: { positions: [], orders: [], totalValue: 0, totalProfit: 0, dailyPnL: 0, cash: 1000000 },
      journal: [],
      displayStock: { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' },
      chartData: [{ date: '2026-01-01', close: 10000 }],
      chartSignal: null,
      loading: false,
      error: null,
      handleStockSelect: mockHandleStockSelect,
      handleClosePosition: mockHandleClosePosition
    });
  });

  it('should render all main components', () => {
    render(<Workstation />);
    expect(screen.getAllByText(/ウォッチリスト/)[0]).toBeInTheDocument();
    expect(screen.getByText(/分析 & シグナル/)).toBeInTheDocument();
    expect(screen.getAllByText(/任天堂/).length).toBeGreaterThan(0);
  });

  it('should show error state in workstation if hook returns error', () => {
    (useStockData as jest.Mock).mockReturnValue({
      watchlist: [],
      portfolio: { positions: [], orders: [], totalValue: 0, totalProfit: 0, dailyPnL: 0, cash: 1000000 },
      journal: [],
      displayStock: null,
      chartData: [],
      chartSignal: null,
      loading: false,
      error: 'Connection failed',
      handleStockSelect: mockHandleStockSelect,
      handleClosePosition: mockHandleClosePosition
    });

    render(<Workstation />);
    // テキストが分割されている可能性を考慮し、より柔軟なマッチングを行う
    expect(screen.getByText((content) => content.includes('データの取得に失敗しました'))).toBeInTheDocument();
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });
});
