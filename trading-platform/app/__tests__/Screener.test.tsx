import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Screener from '../screener/page';
import { useTradingStore } from '../store/tradingStore';
import { marketClient } from '../lib/api/data-aggregator';
import '@testing-library/jest-dom';

// Mock useRouter and usePathname
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/screener',
}));

// Mock marketClient
jest.mock('../lib/api/data-aggregator', () => ({
  marketClient: {
    fetchQuotes: jest.fn().mockResolvedValue([]),
    fetchSignal: jest.fn().mockResolvedValue({ success: true, data: { type: 'BUY', confidence: 85 } }),
    fetchOHLCV: jest.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

describe('Screener Page - Default Filters and AI Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTradingStore.setState({
      selectedStock: null,
    });
  });

  it('sets default filters to BUY and 80% confidence', () => {
    render(<Screener />);
    
    // スライダーの初期値が80であることを確認
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('80');
    
    // 「買い」ボタンがアクティブ（背景色がprimary）であることを確認
    const buyButton = screen.getByRole('button', { name: '買い' });
    expect(buyButton).toHaveClass('bg-primary');
  });

  it('starts AI analysis when the button is clicked', async () => {
    render(<Screener />);
    
    const analyzeButton = screen.getByRole('button', { name: /AIシグナル分析を開始/ });
    fireEvent.click(analyzeButton);
    
    expect(screen.getByText(/AI分析実行中.../)).toBeInTheDocument();
    
    // 分析完了を待機
    await waitFor(() => {
      expect(screen.getByText(/再分析を実行/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('navigates to workstation when a stock is clicked', async () => {
    render(<Screener />);
    
    // 表の中の銘柄（例: 7203）をクリック
    const toyotaRow = screen.getByText('7203');
    fireEvent.click(toyotaRow);
    
    expect(useTradingStore.getState().selectedStock?.symbol).toBe('7203');
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
