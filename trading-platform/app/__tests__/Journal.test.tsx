import { render, screen, fireEvent } from '@testing-library/react';
import Journal from '../journal/page';
import { useTradingStore } from '../store/tradingStore';
import '@testing-library/jest-dom';

// Mock Dependencies
jest.mock('../components/Navigation', () => ({
    Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

describe('Journal Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty stats and empty state message when journal is empty', () => {
        (useTradingStore as any).setState({
            journal: [],
        });

        render(<Journal />);

        expect(screen.getByText('トレードジャーナル')).toBeInTheDocument();
        expect(screen.getByText('Win Rate')).toBeInTheDocument();
        expect(screen.getByText('0.0%')).toBeInTheDocument(); // Initial win rate
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

        (useTradingStore as any).setState({
            journal: mockJournal,
        });

        render(<Journal />);

        // Win Rate: 1 win, 1 loss, 1 zero = 33.3%
        expect(screen.getAllByText('33.3%')[0]).toBeInTheDocument();

        // Total Profit: 10000 - 500 = 9500
        expect(screen.getAllByText(/\+.*9,500/)[0]).toBeInTheDocument();

        // Trades Tab should show entries
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Trades (3)')).toBeInTheDocument();
    });

    it('switches between Trades and Analysis tabs', () => {
        (useTradingStore as any).setState({
            journal: [],
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
        // Only wins
        (useTradingStore as any).setState({
            journal: [
                { id: '1', status: 'CLOSED', profit: 1000 },
            ],
        });
        const { rerender } = render(<Journal />);
        expect(screen.getByText('∞')).toBeInTheDocument();

        // Zero wins (avoid infinity but check 0.00)
        (useTradingStore as any).setState({
            journal: [
                { id: '1', status: 'CLOSED', profit: -1000 },
            ],
        });
        rerender(<Journal />);
        expect(screen.getAllByText('0.00')[0]).toBeInTheDocument();

        // One win, one loss
        (useTradingStore as any).setState({
            journal: [
                { id: '1', status: 'CLOSED', profit: 1000 },
                { id: '2', status: 'CLOSED', profit: -500 },
            ],
        });
        rerender(<Journal />);
        // avgWin = 1000, avgLoss = 500, profitFactor = 2.00
        expect(screen.getAllByText('2.00')[0]).toBeInTheDocument();
    });

    it('renders net loss correctly', () => {
        (useTradingStore as any).setState({
            journal: [
                { id: '1', status: 'CLOSED', profit: -5000, symbol: 'LOSS' },
            ],
        });

        render(<Journal />);
        expect(screen.getAllByText(/-.*5,000/)[0]).toBeInTheDocument();
    });

    it('handles trades without profit value', () => {
        (useTradingStore as any).setState({
            journal: [
                { id: '1', status: 'CLOSED', symbol: 'TEST' }, // profit undefined
            ],
        });
        render(<Journal />);
        expect(screen.getByText('TEST')).toBeInTheDocument();
    });
});
