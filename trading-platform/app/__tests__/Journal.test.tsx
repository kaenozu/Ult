import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../components/Navigation', () => ({
    Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

jest.mock('../store/journalStore', () => ({
    useJournalStore: jest.fn(),
}));

import { useJournalStore } from '../store/journalStore';
import Journal from '../journal/page';

const mockUseJournalStore = useJournalStore as jest.MockedFunction<typeof useJournalStore>;

describe('Journal Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty stats and empty state message when journal is empty', () => {
        mockUseJournalStore.mockReturnValue({
            journal: [],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });

        render(<Journal />);

        expect(screen.getAllByText('トレードジャーナル').length).toBeGreaterThan(0);
        expect(screen.getByText('Win Rate')).toBeInTheDocument();
        expect(screen.getByText('0.0%')).toBeInTheDocument();
        expect(screen.getByText('No closed trades yet')).toBeInTheDocument();
    });

    it('renders trades and calculates stats correctly', () => {
        const mockJournal = [
            {
                id: '1',
                symbol: '7203',
                status: 'CLOSED',
                signalType: 'BUY',
                date: '2026-01-20',
                entryPrice: 3000,
                exitPrice: 3100,
                quantity: 100,
                profit: 10000,
                profitPercent: 3.33,
            },
            {
                id: '2',
                symbol: 'AAPL',
                status: 'CLOSED',
                signalType: 'SELL',
                date: '2026-01-21',
                entryPrice: 180,
                exitPrice: 175,
                quantity: 100,
                profit: -500,
                profitPercent: -2.7,
            },
            {
                id: '3',
                symbol: 'ZERO',
                status: 'CLOSED',
                profit: 0,
            }
        ];

        mockUseJournalStore.mockReturnValue({
            journal: mockJournal,
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });

        render(<Journal />);

        expect(screen.getAllByText('33.3%')[0]).toBeInTheDocument();
        expect(screen.getAllByText(/\+.*9,500/)[0]).toBeInTheDocument();
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Trades (3)')).toBeInTheDocument();
    });

    it('switches between Trades and Analysis tabs', () => {
        mockUseJournalStore.mockReturnValue({
            journal: [],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });

        render(<Journal />);

        const analysisTab = screen.getByText('Analysis');
        fireEvent.click(analysisTab);

        expect(screen.getByText('Performance Over Time')).toBeInTheDocument();
        expect(screen.getByText('Monthly Returns')).toBeInTheDocument();
        expect(screen.queryByText('No closed trades yet')).not.toBeInTheDocument();

        const tradesTab = screen.getByText('Trades (0)');
        fireEvent.click(tradesTab);
        expect(screen.getByText('No closed trades yet')).toBeInTheDocument();
    });

    it('calculates Profit Factor correctly (Infinity, zero win, and regular)', () => {
        mockUseJournalStore.mockReturnValue({
            journal: [{ id: '1', status: 'CLOSED', profit: 1000 }],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });
        const { rerender } = render(<Journal />);
        expect(screen.getByText('∞')).toBeInTheDocument();

        mockUseJournalStore.mockReturnValue({
            journal: [{ id: '1', status: 'CLOSED', profit: -1000 }],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });
        rerender(<Journal />);
        expect(screen.getAllByText('0.00')[0]).toBeInTheDocument();

        mockUseJournalStore.mockReturnValue({
            journal: [
                { id: '1', status: 'CLOSED', profit: 1000 },
                { id: '2', status: 'CLOSED', profit: -500 },
            ],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });
        rerender(<Journal />);
        expect(screen.getAllByText('2.00')[0]).toBeInTheDocument();
    });

    it('renders net loss correctly', () => {
        mockUseJournalStore.mockReturnValue({
            journal: [{ id: '1', status: 'CLOSED', profit: -5000, symbol: 'LOSS' }],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });

        render(<Journal />);
        expect(screen.getAllByText(/-.*5,000/)[0]).toBeInTheDocument();
    });

    it('handles trades without profit value', () => {
        mockUseJournalStore.mockReturnValue({
            journal: [{ id: '1', status: 'CLOSED', symbol: 'TEST' }],
            addJournalEntry: jest.fn(),
            updateJournalEntry: jest.fn(),
            deleteJournalEntry: jest.fn(),
        });
        render(<Journal />);
        expect(screen.getByText('TEST')).toBeInTheDocument();
    });
});
