import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

jest.mock('@/app/store/portfolioStore');

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

describe('OrderPanel Max Button', () => {
    // @ts-expect-error - Mock object doesn't perfectly match strict Stock type
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan', sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrder = jest.fn();

    const defaultStoreState = {
        portfolio: { cash: 1000000, positions: [] },
        executeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default implementation
        // @ts-expect-error - Mocking implementation
        usePortfolioStore.mockImplementation((selector) => {
            return selector ? selector(defaultStoreState) : defaultStoreState;
        });
    });

    it('renders "Max" button when side is BUY', () => {
        // @ts-expect-error - Passing mock stock object
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const buyButton = screen.getByText('買い');
        expect(buyButton).toHaveAttribute('aria-pressed', 'true');

        const maxButton = screen.getByText(/最大/);
        expect(maxButton).toBeInTheDocument();
        expect(maxButton).toHaveAttribute('aria-disabled', 'false');
        expect(maxButton).toHaveClass('text-green-400');
    });

    it('does NOT render "Max" button when side is SELL', () => {
        // @ts-expect-error - Passing mock stock object
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const sellButton = screen.getByText('空売り');
        fireEvent.click(sellButton);

        const maxButton = screen.queryByText(/最大/);
        expect(maxButton).not.toBeInTheDocument();
    });

    it('calculates max quantity correctly', () => {
        // @ts-expect-error - Passing mock stock object
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const maxButton = screen.getByText(/最大/);
        fireEvent.click(maxButton);

        const input = screen.getByLabelText('数量');
        // Cash 1,000,000 / Price 2,000 = 500
        expect(input).toHaveValue(500);
    });

    it('handles insufficient funds correctly', async () => {
        // Setup low cash scenario
        const lowCashState = {
            portfolio: { cash: 100, positions: [] }, // 100 < 2000
            executeOrder: mockExecuteOrder,
        };

        // Override mock for this test
        // @ts-expect-error - Mocking implementation
        usePortfolioStore.mockImplementation((selector) => {
            return selector ? selector(lowCashState) : lowCashState;
        });

        // @ts-expect-error - Passing mock stock object
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const maxButton = screen.getByText(/最大/);

        // 1. Verify visual disabled state
        expect(maxButton).toHaveClass('text-gray-500');
        expect(maxButton).toHaveClass('cursor-not-allowed');
        expect(maxButton).toHaveAttribute('aria-disabled', 'true');
        expect(maxButton).toHaveAttribute('aria-label', '現金が足りません');

        // 2. Click and verify error message
        fireEvent.click(maxButton);

        const errorMessage = await screen.findByText('現金が足りません');
        expect(errorMessage).toBeInTheDocument();

        // Ensure quantity did not change (default is 100)
        const input = screen.getByLabelText('数量');
        expect(input).toHaveValue(100);
    });
});
