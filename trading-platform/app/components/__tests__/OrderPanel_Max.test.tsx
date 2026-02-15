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

    const mockStoreState = {
        portfolio: { cash: 1000000, positions: [] },
        executeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // @ts-expect-error - Mocking implementation on imported hook
        usePortfolioStore.mockImplementation((selector) => {
            return selector ? selector(mockStoreState) : mockStoreState;
        });
    });

    it('renders "Max" button when side is BUY', () => {
        // @ts-expect-error - Passing mock stock object
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const buyButton = screen.getByText('買い');
        expect(buyButton).toHaveAttribute('aria-pressed', 'true');

        const maxButton = screen.getByText(/最大/);
        expect(maxButton).toBeInTheDocument();
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
});
