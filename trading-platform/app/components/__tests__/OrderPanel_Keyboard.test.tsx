import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

// Mock stores
jest.mock('@/app/store/portfolioStore');

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('OrderPanel Keyboard Accessibility', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrder = jest.fn().mockReturnValue({ success: true });

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
        executeOrder: mockExecuteOrder,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
    });

    it('focuses the confirm button when modal opens', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));

        // Check for focus on the confirm button
        const confirmButton = screen.getByText('注文を確定');
        expect(confirmButton).toHaveFocus();
    });

    it('closes the modal when Escape key is pressed', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Press Escape
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

        // Modal should be closed
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('restores focus to the trigger button when modal closes', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Find trigger button
        const triggerButton = screen.getByText('買い注文を発注');

        // Open modal
        fireEvent.click(triggerButton);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Close modal via Escape
        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

        // Check focus restoration
        expect(triggerButton).toHaveFocus();
    });
});
