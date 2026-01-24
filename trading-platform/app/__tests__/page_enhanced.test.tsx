import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Workstation from '../page';
import { useStockData } from '../hooks/useStockData';
import '@testing-library/jest-dom';

// Mock the hook
jest.mock('../hooks/useStockData');

describe('Workstation Page Comprehensive Tests', () => {
  const mockHandleStockSelect = jest.fn();
  const mockSelectedStock = { symbol: '7974', name: '任天堂', price: 10000, market: 'japan' as const };

  beforeEach(() => {
    (useStockData as jest.Mock).mockReturnValue({
      selectedStock: mockSelectedStock,
      chartData: [{ date: '2026-01-01', open: 10000, high: 10500, low: 9800, close: 10000, volume: 1000000 }],
      indexData: [],
      chartSignal: null,
      loading: false,
      error: null,
      handleStockSelect: mockHandleStockSelect
    });
  });

  it('should render all main components', () => {
    render(<Workstation />);
    expect(screen.getAllByText(/ウォッチリスト/)[0]).toBeInTheDocument();
    expect(screen.getByText(/分析 & シグナル/)).toBeInTheDocument();
    expect(screen.getByText(/任天堂/)).toBeInTheDocument();
  });

  it('should show error state in workstation if hook returns error', () => {
    (useStockData as jest.Mock).mockReturnValue({
      selectedStock: null,
      chartData: [],
      indexData: [],
      chartSignal: null,
      loading: false,
      error: 'Connection failed',
      handleStockSelect: mockHandleStockSelect
    });

    render(<Workstation />);
    expect(screen.getByText((content) => content.includes('データの取得に失敗しました'))).toBeInTheDocument();
    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });
});
