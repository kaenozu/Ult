import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../Header';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useUIStore } from '@/app/store/uiStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';

jest.mock('@/app/store/portfolioStore');
jest.mock('@/app/store/uiStore');
jest.mock('@/app/store/watchlistStore');

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

jest.mock('@/app/i18n/provider', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'ja',
    useSetLocale: () => jest.fn(),
}));

jest.mock('../ConnectionQualityIndicator', () => ({
    ConnectionQualityIndicator: ({ onReconnect }: any) => (
        <button title="切断" onClick={onReconnect}>接続済み</button>
    )
}));

jest.mock('../LocaleSwitcher', () => ({
    LocaleSwitcher: () => <div data-testid="locale-switcher">LocaleSwitcher</div>
}));

const mockReconnect = jest.fn();
jest.mock('@/app/hooks/useResilientWebSocket', () => ({
    useResilientWebSocket: () => ({
        status: 'CONNECTED',
        metrics: {},
        reconnect: mockReconnect,
    })
}));

describe('Header', () => {
    const mockSetCash = jest.fn();
    const mockAddToWatchlist = jest.fn();
    const mockSetSelectedStock = jest.fn();
    const mockToggleConnection = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (usePortfolioStore as any).mockReturnValue({
            portfolio: { cash: 1000000, positions: [], dailyPnL: 5000, totalValue: 1005000 },
            setCash: mockSetCash,
        });
        (useUIStore as any).mockReturnValue({
            isConnected: true,
            toggleConnection: mockToggleConnection,
            setSelectedStock: mockSetSelectedStock,
        });
        (useWatchlistStore as any).mockReturnValue({
            watchlist: [],
            addToWatchlist: mockAddToWatchlist,
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
        expect(mockReconnect).toHaveBeenCalled();
    });

    it('edits cash balance', () => {
        render(<Header />);
        const editTrigger = screen.getByText('header.cash').parentElement;
        if (editTrigger) fireEvent.click(editTrigger);

        const input = screen.getByDisplayValue('1000000');
        fireEvent.change(input, { target: { value: '2000000' } });
        fireEvent.blur(input);

        expect(mockSetCash).toHaveBeenCalledWith(2000000);
    });

    it('searches and selects stock', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('header.searchPlaceholder');

        fireEvent.change(input, { target: { value: 'Toyota' } });
        expect(screen.getByText('7203')).toBeInTheDocument(); // In results

        fireEvent.click(screen.getByText('7203'));
        expect(mockSetSelectedStock).toHaveBeenCalled();
        expect(mockAddToWatchlist).toHaveBeenCalled();
    });

    it('handles exact match on Enter', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('header.searchPlaceholder');

        fireEvent.change(input, { target: { value: '7203' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ symbol: '7203' }));
    });

    it('shows "Added" status for watchlisted item', () => {
        (useWatchlistStore as any).mockReturnValue({
            watchlist: [{ symbol: '7203' }], // Toyota is watched
            addToWatchlist: mockAddToWatchlist,
        });

        render(<Header />);
        const input = screen.getByPlaceholderText('header.searchPlaceholder');
        fireEvent.change(input, { target: { value: 'Toyota' } });

        expect(screen.getByText('追加済み')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-plus')).toBeNull();
    });

    it('navigates search results with keyboard', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('header.searchPlaceholder');

        // Search for 'a' to get multiple results (Toyota, Apple)
        fireEvent.change(input, { target: { value: 'a' } });

        // Results should be visible
        // Assuming order is as in ALL_STOCKS: Toyota, Apple
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();

        // ArrowDown to highlight first item (Toyota)
        fireEvent.keyDown(input, { key: 'ArrowDown' });

        // ArrowDown to highlight second item (Apple)
        fireEvent.keyDown(input, { key: 'ArrowDown' });

        // Enter to select highlighted item (Apple)
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL' }));
    });
});
