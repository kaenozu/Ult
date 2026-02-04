import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { useTradingStore } from '@/app/store/tradingStore';
import { useOrderExecutionStore, useExecuteOrderAtomicV2, useExecuteOrder } from '@/app/store/orderExecutionStore';

// Mock stores
jest.mock('@/app/store/tradingStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
    useOrderExecutionStore: jest.fn(),
    useExecuteOrder: jest.fn(),
    useExecuteOrderAtomicV2: jest.fn()
}));

describe('OrderPanel', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrderAtomicV2 = jest.fn().mockReturnValue({ success: true });

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
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
});
