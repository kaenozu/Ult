import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';

// Mock store
jest.mock('@/app/store/portfolioStore');

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
        (usePortfolioStore as any).mockReturnValue(defaultStore);
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
