import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';
// Mock stores
jest.mock('@/app/store/portfolioStore');

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
        executeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup usePortfolioStore mock
        (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
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

        // Set quantity to 100
        fireEvent.change(screen.getByLabelText('数量'), { target: { value: '100' } });

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));

        // Confirm
        fireEvent.click(screen.getByText('注文を確定'));

        // Advance timers by 500ms to cover the UX delay
        await act(async () => {
            jest.advanceTimersByTime(500);
        });

        // Check if executeOrder (from store) was called
        await waitFor(() => {
            expect(mockPortfolioState.executeOrder).toHaveBeenCalledWith(expect.objectContaining({
                symbol: '7203',
                quantity: 100,
                side: 'LONG'
            }));
        });

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

    it('shows loading state during order processing', async () => {
        jest.useFakeTimers();
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));

        // Click confirm
        const confirmButton = screen.getByText('注文を確定');
        fireEvent.click(confirmButton);

        // Should show loading text and be disabled immediately
        expect(screen.getByText('処理中...')).toBeInTheDocument();
        expect(confirmButton).toBeDisabled();

        // Advance timers to complete processing
        await act(async () => {
            jest.advanceTimersByTime(500);
        });

        jest.useRealTimers();
    });
});
