/**
 * SignalPanel - Comprehensive Test Suite
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalPanel } from '@/app/components/SignalPanel';
import { JAPAN_STOCKS } from '@/app/data/stocks';
import { Signal } from '@/app/types';
import * as analysisLib from '@/app/lib/analysis';

// Setup dynamic mock for useWebSocket
let mockWebSocketState = {
  status: 'OPEN',
  lastMessage: null as any
};

jest.mock('@/app/hooks/useWebSocket', () => ({
  useWebSocket: () => mockWebSocketState
}));

// Mock analysis lib
jest.mock('@/app/lib/analysis', () => ({
  calculateAIHitRate: jest.fn(() => ({ hitRate: 0, totalTrades: 0, wins: 0 }))
}));

// Mock backtest lib
jest.mock('@/app/lib/backtest', () => ({
  runBacktest: jest.fn(() => ({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfitPercent: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    trades: []
  }))
}));

// Mock store
jest.mock('@/app/store/tradingStore', () => ({
  useTradingStore: jest.fn(() => ({
    aiStatus: {
      trades: [
        { symbol: '7203', type: 'BUY', entryDate: '2025-01-01', status: 'CLOSED', profitPercent: 5.0, reflection: 'Good trade', entryPrice: 1000, exitPrice: 1050 },
        { symbol: '7203', type: 'SELL', entryDate: '2025-01-02', status: 'OPEN', entryPrice: 1100 }
      ],
      virtualBalance: 1000000,
      totalProfit: 50000
    },
    processAITrades: jest.fn()
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('SignalPanel', () => {
  const mockStock = JAPAN_STOCKS[0];
  const mockSignal: Signal = {
    symbol: mockStock.symbol,
    type: 'BUY',
    confidence: 80,
    predictedChange: 5,
    targetPrice: 1000,
    stopLoss: 900,
    reason: 'Test Reason',
    predictionDate: '2026-01-22'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocketState = { status: 'OPEN', lastMessage: null };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });
  });

  it('renders loading state correctly', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={true} />);
    expect(screen.getByText('市場データを分析中...')).toBeInTheDocument();
  });

  it('renders loading state when signal is null even if not loading', () => {
    render(<SignalPanel stock={mockStock} signal={null} loading={false} />);
    expect(screen.getByText('市場データを分析中...')).toBeInTheDocument();
  });

  it('renders signal tab with correct data', async () => {
    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });
    expect(screen.getByText('シグナル')).toHaveClass('bg-[#233648]');
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(screen.getByText('買い')).toBeInTheDocument();
  });

  it('switches tabs and renders content', async () => {
    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    // To Backtest
    fireEvent.click(screen.getByText('バックテスト'));
    expect(screen.getByText('バックテスト')).toHaveClass('bg-[#233648]');
    expect(screen.getByText('勝率')).toBeInTheDocument();

    // To AI
    fireEvent.click(screen.getByText('AI戦績'));
    expect(screen.getByText('AI戦績')).toHaveClass('bg-[#233648]');
    expect(screen.getByText('AI仮想口座合計損益')).toBeInTheDocument();

    // Back to Signal (Coverage for line 120)
    fireEvent.click(screen.getByText('シグナル'));
    expect(screen.getByText('シグナル')).toHaveClass('bg-[#233648]');
    expect(screen.getByText('買い')).toBeInTheDocument();
  });

  it('fetches precise hit rate on mount', async () => {
    (analysisLib.calculateAIHitRate as jest.Mock).mockReturnValue({ hitRate: 75, totalTrades: 100, wins: 75 });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: Array(150).fill({}) })
    });

    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api/market?type=history'));
    });
  });

  it('falls back to local OHLCV for hit rate if API data insufficient', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] })
    });

    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} ohlcv={[{ date: '2025-01-01', close: 100, open: 100, high: 100, low: 100, volume: 100 }]} />);
    });

    expect(analysisLib.calculateAIHitRate).toHaveBeenCalled();
  });

  it('updates live signal from WebSocket', async () => {
    const { rerender } = render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    expect(screen.queryByText('Live Update')).not.toBeInTheDocument();

    mockWebSocketState = {
      status: 'OPEN',
      lastMessage: {
        type: 'SIGNAL_UPDATE',
        data: { ...mockSignal, confidence: 99, reason: 'Live Update' }
      }
    };

    await act(async () => {
      rerender(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Live Update')).toBeInTheDocument();
    });

    const confidenceElements = screen.getAllByText('99%');
    expect(confidenceElements.length).toBeGreaterThan(0);
  });

  it('ignores WebSocket signal for different stock', async () => {
    const { rerender } = render(<SignalPanel stock={mockStock} signal={mockSignal} />);

    mockWebSocketState = {
      status: 'OPEN',
      lastMessage: {
        type: 'SIGNAL_UPDATE',
        data: { ...mockSignal, symbol: 'OTHER', reason: 'Ignore Me' }
      }
    };

    await act(async () => {
      rerender(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    expect(screen.queryByText('Ignore Me')).not.toBeInTheDocument();
  });

  it('resets live signal when stock changes', async () => {
    const { rerender } = render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    const newStock = { ...mockStock, symbol: 'NEW' };
    const newSignal = { ...mockSignal, symbol: 'NEW', reason: 'New Stock Signal' };

    await act(async () => {
      rerender(<SignalPanel stock={newStock} signal={newSignal} />);
    });

    expect(screen.getByText('New Stock Signal')).toBeInTheDocument();
  });

  it('renders backtest trades history', async () => {
    const { runBacktest } = require('@/app/lib/backtest');
    (runBacktest as jest.Mock).mockReturnValue({
      totalTrades: 1,
      winningTrades: 1,
      losingTrades: 0,
      winRate: 100,
      totalProfitPercent: 10,
      maxDrawdown: 0,
      profitFactor: 2,
      trades: [
        { type: 'BUY', entryDate: '2025-01-01', profitPercent: 10 }
      ]
    });

    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} ohlcv={[{ date: '2025-01-01', close: 100 } as any]} />);
    });

    // Switch to backtest tab
    fireEvent.click(screen.getByText('バックテスト'));

    expect(screen.getByText(/100%/)).toBeInTheDocument(); // Win rate
    expect(screen.getByText('買い')).toBeInTheDocument(); // Trade type type
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
  });

  it('handles hit rate fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Precise hit rate fetch failed:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles hit rate fetch status error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Server Error'
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<SignalPanel stock={mockStock} signal={mockSignal} />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Precise hit rate fetch failed:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });
});
