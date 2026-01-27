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

    it('selects single result automatically on Enter', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');

        // Search returns only Toyota (simulated)
        fireEvent.change(input, { target: { value: 'To' } });
        // Note: Mock data ALL_STOCKS has Toyota and Apple. 'To' matches Toyota. 'Apple' doesn't.

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Toyota' }));
    });

    it('closes results on Escape', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        fireEvent.change(input, { target: { value: 'A' } }); // Must have value to show results
        fireEvent.focus(input);
        expect(screen.queryByText('検索結果')).toBeInTheDocument();

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByText('検索結果')).not.toBeInTheDocument();
    });

    it('submits cash on Enter and cancels on Escape', () => {
        render(<Header />);
        const editTrigger = screen.getByText('余力').parentElement;
        if (editTrigger) fireEvent.click(editTrigger);

        const input = screen.getByDisplayValue('1000000');

        // Escape
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(screen.queryByDisplayValue('1000000')).toBeNull(); // Input removed (view mode)

        // Re-open
        fireEvent.click(screen.getByText('余力').parentElement!);
        const input2 = screen.getByDisplayValue('1000000');

        // Enter
        fireEvent.change(input2, { target: { value: '500' } });
        fireEvent.keyDown(input2, { key: 'Enter' });
        expect(mockSetCash).toHaveBeenCalledWith(500);
    });

    it('shows results on focus', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        fireEvent.change(input, { target: { value: 'A' } });
        fireEvent.focus(input);
        // "検索結果" header roughly indicates results are shown
        expect(screen.getByText('検索結果')).toBeInTheDocument();
    });

    it('handles click outside to close search', () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        fireEvent.change(input, { target: { value: 'A' } });
        fireEvent.focus(input);
        expect(screen.getByText('検索結果')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('検索結果')).not.toBeInTheDocument();
    });

    it('shows "Added" status for watchlisted item', () => {
        (useTradingStore as unknown as jest.Mock).mockReturnValue({
            portfolio: { cash: 1000000, positions: [], dailyPnL: 5000, totalValue: 1005000 },
            isConnected: true,
            watchlist: [{ symbol: '7203' }], // Toyota is watched
            setCash: mockSetCash,
            addToWatchlist: mockAddToWatchlist,
            setSelectedStock: mockSetSelectedStock
        });

        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        fireEvent.change(input, { target: { value: 'Toyota' } });

        expect(screen.getByText('追加済み')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-plus')).toBeNull();
    });

    it('handles auxiliary buttons (alerts)', () => {
        window.alert = jest.fn();
        render(<Header />);

        fireEvent.click(screen.getByTitle('設定'));
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('設定機能'));

        fireEvent.click(screen.getByTitle('ユーザープロフィール'));
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('ユーザープロフィール'));
    });

    it('handles API search exception', async () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const { fetchStockMetadata } = require('@/app/data/stocks');
        fetchStockMetadata.mockRejectedValueOnce(new Error('Network Fail'));

        fireEvent.change(input, { target: { value: 'ERROR' } });

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter' });
        });

        expect(fetchStockMetadata).toHaveBeenCalledWith('ERROR');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('fetch error'), expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('triggers API search for unknown symbol', async () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');

        // Setup mock for new stock
        const { fetchStockMetadata } = require('@/app/data/stocks');
        fetchStockMetadata.mockResolvedValueOnce({ symbol: '9984', name: 'SoftBank', market: 'japan' });

        fireEvent.change(input, { target: { value: '9984' } });

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter' });
        });

        expect(fetchStockMetadata).toHaveBeenCalledWith('9984');
        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ symbol: '9984' }));
    });

    it('handles API search failure gracefully', async () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const { fetchStockMetadata } = require('@/app/data/stocks');
        fetchStockMetadata.mockResolvedValueOnce(null);

        fireEvent.change(input, { target: { value: 'UNKNOWN' } });

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter' });
        });

        expect(fetchStockMetadata).toHaveBeenCalledWith('UNKNOWN');
        expect(mockSetSelectedStock).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('ignores empty search', async () => {
        render(<Header />);
        const input = screen.getByPlaceholderText('銘柄名、コードで検索');

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter' });
        });

        expect(mockSetSelectedStock).not.toHaveBeenCalled();
    });
});
