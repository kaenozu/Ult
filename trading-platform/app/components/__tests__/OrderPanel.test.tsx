import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { useTradingStore } from '@/app/store/tradingStore';
import { useExecuteOrder } from '@/app/store/orderExecutionStore';

// Mock stores
jest.mock('@/app/store/tradingStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
    useExecuteOrder: jest.fn()
}));

// Mock ResizeObserver for any chart components (if any)
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('OrderPanel', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrder = jest.fn().mockReturnValue({ success: true });

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
        placeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup useTradingStore mock
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
        (useExecuteOrder as jest.Mock).mockReturnValue(mockExecuteOrder);
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

        expect(mockExecuteOrder).toHaveBeenCalledWith(expect.objectContaining({
            symbol: '7203',
            quantity: 100,
            side: 'LONG'
        }));

        // Success message
        await waitFor(() => {
            expect(screen.getByText('注文を送信しました')).toBeInTheDocument();
        });

        // Fast forward timer
        act(() => {
            jest.runAllTimers();
        });

        await waitFor(() => {
             expect(screen.queryByText('注文を送信しました')).not.toBeInTheDocument();
        });

        jest.useRealTimers();
    });
});
