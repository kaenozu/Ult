import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { useTradingStore } from '@/app/store/tradingStore';

// Mock store
jest.mock('@/app/store/tradingStore', () => ({
    useTradingStore: jest.fn(),
}));

describe('OrderPanel', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const };
    const mockAddPosition = jest.fn();
    const mockSetCash = jest.fn();
    const mockAddJournalEntry = jest.fn();

    const defaultStore = {
        portfolio: { cash: 1000000, positions: [] },
        addPosition: mockAddPosition,
        setCash: mockSetCash,
        addJournalEntry: mockAddJournalEntry,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockReturnValue(defaultStore);
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

    it('handles quantity change', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);
        const input = screen.getByLabelText('数量');
        fireEvent.change(input, { target: { value: '200' } });
        expect(input).toHaveValue(200);
        // Cost: 200 * 2000 = 400,000. Cash 1,000,000. OK.
        expect(screen.getByText('買い注文を発注')).toBeEnabled();
    });

    it('disables buy button if insufficient funds', () => {
        (useTradingStore as unknown as jest.Mock).mockReturnValue({
            ...defaultStore,
            portfolio: { cash: 1000, positions: [] } // Low cash
        });

        render(<OrderPanel stock={mockStock} currentPrice={2000} />);
        // Quantity default 100 -> cost 200,000
        expect(screen.getByText('資金不足です')).toBeDisabled();
    });

    it('handles limit order inputs', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);
        const typeSelect = screen.getByLabelText('注文種別');
        fireEvent.change(typeSelect, { target: { value: 'LIMIT' } });

        const priceInput = screen.getByLabelText('指値価格');
        fireEvent.change(priceInput, { target: { value: '1900' } });
        expect(priceInput).toHaveValue(1900);
    });

    it('executes order via modal confirmation', async () => {
        // Use fake timers to handle success message timeout if needed, but for now simple flow
        jest.useFakeTimers();

        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open modal
        fireEvent.click(screen.getByText('買い注文を発注'));

        expect(screen.getByText('注文の確認')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Cancel first
        fireEvent.click(screen.getByText('キャンセル'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        // Re-open and Confirm
        fireEvent.click(screen.getByText('買い注文を発注'));
        fireEvent.click(screen.getByText('注文を確定'));

        expect(mockSetCash).toHaveBeenCalled();
        expect(mockAddPosition).toHaveBeenCalledWith(expect.objectContaining({
            symbol: '7203',
            quantity: 100,
            side: 'LONG'
        }));
        expect(mockAddJournalEntry).toHaveBeenCalled();

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
