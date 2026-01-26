import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryTable } from '../HistoryTable';
import { OrderBook } from '../OrderBook';

describe('Trading Details', () => {
    describe('HistoryTable', () => {
        it('renders empty message', () => {
            render(<HistoryTable entries={[]} />);
            expect(screen.getByText('取引履歴はありません')).toBeInTheDocument();
        });

        it('renders entries', () => {
            const entries = [{
                id: '1', symbol: 'TEST', date: '2023-01-01', signalType: 'BUY' as const,
                quantity: 100, entryPrice: 100, exitPrice: 0, status: 'OPEN' as const, profit: 0, profitPercent: 0, notes: ''
            }];
            render(<HistoryTable entries={entries} />);
            expect(screen.getByText('TEST')).toBeInTheDocument();
            expect(screen.getByText('保有中')).toBeInTheDocument();
        });

        it('renders closed entry with profit', () => {
            const entries = [{
                id: '2', symbol: 'TEST2', date: '2023-01-02', signalType: 'SELL' as const,
                quantity: 100, entryPrice: 100, exitPrice: 90, status: 'CLOSED' as const, profit: 1000, profitPercent: 10, notes: ''
            }];
            render(<HistoryTable entries={entries} />);
            expect(screen.getByText('決済済')).toBeInTheDocument();
            expect(screen.getAllByText(/1,000/)[0]).toBeInTheDocument();
        });
    });

    describe('OrderBook', () => {
        it('renders order book with data', () => {
            const stock = { symbol: 'TEST', name: 'Test', price: 1000, market: 'japan' as const };
            render(<OrderBook stock={stock as any} />); // partial mock
            expect(screen.getByText('板情報')).toBeInTheDocument();
            expect(screen.getByText('東証')).toBeInTheDocument();
            // Check for generated prices
            expect(screen.getAllByText(/1,000/).length).toBeGreaterThan(0);
        });

        it('renders default values if no stock', () => {
            render(<OrderBook stock={null} />);
            expect(screen.getByText('板情報')).toBeInTheDocument();
            expect(screen.getByText('NYSE')).toBeInTheDocument(); // Defaults to else branch or similar
        });
    });
});
