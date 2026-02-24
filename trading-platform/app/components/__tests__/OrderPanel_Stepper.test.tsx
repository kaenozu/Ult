import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

jest.mock('@/app/store/portfolioStore');

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

describe('OrderPanel Quantity Stepper', () => {
    const mockStock = {
        symbol: '7203',
        name: 'Toyota',
        price: 2000,
        change: 0,
        changePercent: 0,
        market: 'japan' as const,
        sector: 'Automotive',
        volume: 1000000
    };

    const mockExecuteOrder = jest.fn();

    const mockStoreState = {
        portfolio: { cash: 1000000, positions: [] },
        executeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockStoreState) : mockStoreState;
        });
    });

    it('should increment quantity when plus button is clicked', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const input = screen.getByLabelText('数量');
        const plusButton = screen.getByRole('button', { name: '数量を増やす' });

        expect(input).toHaveValue(1); // Default value

        fireEvent.click(plusButton);
        expect(input).toHaveValue(2);

        fireEvent.click(plusButton);
        expect(input).toHaveValue(3);
    });

    it('should decrement quantity when minus button is clicked', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const input = screen.getByLabelText('数量');
        const plusButton = screen.getByRole('button', { name: '数量を増やす' });
        const minusButton = screen.getByRole('button', { name: '数量を減らす' });

        // Increase first
        fireEvent.click(plusButton);
        fireEvent.click(plusButton);
        expect(input).toHaveValue(3);

        // Decrease
        fireEvent.click(minusButton);
        expect(input).toHaveValue(2);
    });

    it('should not decrement below 1', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const input = screen.getByLabelText('数量');
        const minusButton = screen.getByRole('button', { name: '数量を減らす' });

        expect(input).toHaveValue(1);
        expect(minusButton).toBeDisabled();

        fireEvent.click(minusButton);
        expect(input).toHaveValue(1);
    });

    it('should allow typing quantity directly', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const input = screen.getByLabelText('数量');

        fireEvent.change(input, { target: { value: '50' } });
        expect(input).toHaveValue(50);

        // Ensure stepper works after manual input
        const plusButton = screen.getByRole('button', { name: '数量を増やす' });
        fireEvent.click(plusButton);
        expect(input).toHaveValue(51);
    });

    it('should respect +100 button functionality', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        const input = screen.getByLabelText('数量');
        const plus100Button = screen.getByRole('button', { name: '数量を100増やす' });

        fireEvent.click(plus100Button);
        expect(input).toHaveValue(101);
    });
});
