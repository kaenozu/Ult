import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { useTradingStore } from '@/app/store/tradingStore';
import { useExecuteOrder } from '@/app/store/orderExecutionStore';

// Mock stores
jest.mock('@/app/store/tradingStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
    useExecuteOrder: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

describe('OrderPanel UX Enhancements', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrder = jest.fn();

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
        (useExecuteOrder as jest.Mock).mockReturnValue(mockExecuteOrder);
    });

    it('success message should have role="status"', async () => {
        mockExecuteOrder.mockReturnValue({ success: true });
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Trigger an order
        // The button text is "買い注文を発注" (encoded in source)
        const orderButton = screen.getByRole('button', { name: /買い注文を発注/i });
        fireEvent.click(orderButton);

        // Confirm in modal
        const confirmButton = screen.getByRole('button', { name: '注文を確定' });
        fireEvent.click(confirmButton);

        // Wait for success message
        await screen.findByText('注文を送信しました');

        // Check for role="status"
        // This will fail until implemented
        const statusRegion = screen.getByRole('status');
        expect(statusRegion).toBeInTheDocument();
        expect(statusRegion).toHaveTextContent('注文を送信しました');
    });

    it('error message should have role="alert"', async () => {
        mockExecuteOrder.mockReturnValue({ success: false, error: '資金不足です' });
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Trigger an order
        const orderButton = screen.getByRole('button', { name: /買い注文を発注/i });
        fireEvent.click(orderButton);

        // Confirm in modal
        const confirmButton = screen.getByRole('button', { name: '注文を確定' });
        fireEvent.click(confirmButton);

        // Wait for error message
        await screen.findByText('資金不足です');

        // Check for role="alert"
        // This will fail until implemented
        const alertRegion = screen.getByRole('alert');
        expect(alertRegion).toBeInTheDocument();
        expect(alertRegion).toHaveTextContent('資金不足です');
    });

    it('risk settings toggle should have aria-controls pointing to the panel', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Find the toggle button text
        const toggleText = screen.getByText('リスク管理設定');
        fireEvent.click(toggleText); // Click to expand

        // The button is the parent of the text span, or closely related
        // In the component: <button ...><span>リスク管理設定</span>...</button>
        // We can find the button that contains this text.
        // Or verify by finding the button that has aria-expanded="true"
        const button = screen.getByRole('button', { expanded: true });

        // Check if aria-controls is present
        // This will fail until implemented
        const ariaControlsId = button.getAttribute('aria-controls');
        expect(ariaControlsId).toBeTruthy();

        // Check if the panel exists with that ID
        if (ariaControlsId) {
            const panel = document.getElementById(ariaControlsId);
            expect(panel).toBeInTheDocument();
            // Panel content verification
            expect(panel).toHaveTextContent('トレイリングストップ');
        }
    });
});
