import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useExecuteOrderAtomicV2, useExecuteOrder } from '@/app/store/orderExecutionStore';

// Mock stores
jest.mock('@/app/store/portfolioStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
    useOrderExecutionStore: jest.fn(),
    useExecuteOrderAtomicV2: jest.fn(),
    useExecuteOrder: jest.fn()
}));

describe('OrderPanel', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrderAtomicV2 = jest.fn().mockReturnValue({ success: true });

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
        (useExecuteOrderAtomicV2 as jest.Mock).mockReturnValue(mockExecuteOrderAtomicV2);
        (useExecuteOrder as jest.Mock).mockReturnValue(mockExecuteOrderAtomicV2);
    });

    it('renders correctly', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);
        expect(screen.getByText('7203 を取引')).toBeInTheDocument();
        expect(screen.getByText(/余力:/)).toBeInTheDocument();
        expect(screen.getByText('買い注文を発注')).toBeInTheDocument();
    });

    it('switches sides', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);
        const sellButton = screen.getByText('空売り');
        fireEvent.click(sellButton);
        expect(screen.getByText('空売り注文を発注')).toBeInTheDocument();

        const buyButton = screen.getByText('買い');
        fireEvent.click(buyButton);
        expect(screen.getByText('買い注文を発注')).toBeInTheDocument();
    });

    it('executes order via modal confirmation', async () => {
        jest.useFakeTimers();

        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));

        // Confirm
        fireEvent.click(screen.getByText('注文を確定'));

        expect(mockExecuteOrderAtomicV2).toHaveBeenCalledWith(expect.objectContaining({
            symbol: '7203',
            quantity: 100,
            side: 'LONG'
        }));

        // Success message
        expect(screen.getByText('注文を送信しました')).toBeInTheDocument();

        // Fast forward timer
        act(() => {
            jest.runAllTimers();
        });
        expect(screen.queryByText('注文を送信しました')).not.toBeInTheDocument();

        jest.useRealTimers();
    });

    it('renders with correct accessibility attributes', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open risk settings
        const riskButton = screen.getByText('リスク管理設定');
        fireEvent.click(riskButton);

        // Check for toggle switches and their labels
        // Verify that switches have accessible names (via aria-labelledby)
        expect(screen.getByLabelText('トレイリングストップ')).toBeInTheDocument();
        expect(screen.getByLabelText('ボラティリティ調整')).toBeInTheDocument();
        expect(screen.getByLabelText('ケリー基準ポジションサイジング')).toBeInTheDocument();

        // Check volatility selector buttons
        const lowVolButton = screen.getByText('低');

        // Initially not pressed (default is 1.5, low is 1.3)
        expect(lowVolButton).toHaveAttribute('aria-pressed', 'false');

        // Click and verify pressed state
        fireEvent.click(lowVolButton);
        expect(lowVolButton).toHaveAttribute('aria-pressed', 'true');
    });
});
