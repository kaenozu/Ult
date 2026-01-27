import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';
import { useTradingStore } from '@/app/store/tradingStore';
import { ALL_STOCKS } from '@/app/data/stocks';

jest.mock('@/app/store/tradingStore', () => ({
    useTradingStore: jest.fn()
}));

// Mock data
jest.mock('@/app/data/stocks', () => ({
    ALL_STOCKS: [
        { symbol: '7203', name: 'Toyota', market: 'japan' },
        { symbol: 'AAPL', name: 'Apple', market: 'usa' }
    ],
    fetchStockMetadata: jest.fn().mockResolvedValue({ symbol: 'NEW', name: 'New Stock', market: 'usa' })
}));

jest.mock('lucide-react', () => ({
    Search: () => <span data-testid="icon-search" />,
    Settings: () => <span data-testid="icon-settings" />,
    User: () => <span data-testid="icon-user" />,
    Wifi: () => <span data-testid="icon-wifi" />,
    WifiOff: () => <span data-testid="icon-wifioff" />,
    Edit2: () => <span data-testid="icon-edit" />,
    Plus: () => <span data-testid="icon-plus" />,
    Loader2: () => <span data-testid="icon-loader" />
}));

jest.mock('../NotificationCenter', () => ({
    NotificationCenter: () => <div data-testid="notification-center">NotificationCenter</div>
}));

describe('Header', () => {
    const mockSetCash = jest.fn();
    const mockAddToWatchlist = jest.fn();
    const mockSetSelectedStock = jest.fn();
    const mockToggleConnection = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useTradingStore as unknown as jest.Mock).mockReturnValue({
            portfolio: { cash: 1000000, positions: [], dailyPnL: 5000, totalValue: 1005000 },
            isConnected: true,
            toggleConnection: mockToggleConnection,
            setCash: mockSetCash,
            addToWatchlist: mockAddToWatchlist,
            setSelectedStock: mockSetSelectedStock,
            watchlist: []
        });
    });

    it('renders header info', () => {
        render(<Header />);
        expect(screen.getByText('TRADER PRO')).toBeInTheDocument();
        expect(screen.getAllByText(/1,000,000/)[0]).toBeInTheDocument();
        expect(screen.getByText('接続済み')).toBeInTheDocument();
    });

    it('toggles connection', () => {
        render(<Header />);
        fireEvent.click(screen.getByTitle('切断')); // isConnected=true
        expect(mockToggleConnection).toHaveBeenCalled();
    });

    it('edits cash balance', () => {
        render(<Header />);
        const editTrigger = screen.getByText('余力').parentElement;
        if (editTrigger) fireEvent.click(editTrigger);

        const input = screen.getByDisplayValue('1000000');
        fireEvent.change(input, { target: { value: '2000000' } });
        fireEvent.blur(input);

        expect(mockSetCash).toHaveBeenCalledWith(2000000);
    });

    it('searches and selects stock', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');

        fireEvent.change(input, { target: { value: 'Toyota' } });
        expect(screen.getByText('7203')).toBeInTheDocument(); // In results

        fireEvent.click(screen.getByText('7203'));
        expect(mockSetSelectedStock).toHaveBeenCalled();
        expect(mockAddToWatchlist).toHaveBeenCalled();
    });

    it('handles exact match on Enter', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');

        fireEvent.change(input, { target: { value: '7203' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ symbol: '7203' }));
    });
});
