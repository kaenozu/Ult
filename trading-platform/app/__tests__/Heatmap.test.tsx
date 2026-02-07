import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Heatmap from '../heatmap/page';
import { useTradingStore } from '../store/tradingStore';
import { marketClient } from '../lib/api/data-aggregator';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock Dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('../lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuotes: jest.fn(),
    },
}));

jest.mock('../components/Navigation', () => ({
    Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

jest.mock('../data/stocks', () => ({
    ALL_STOCKS: [
        { symbol: '7203', name: 'トヨタ', market: 'japan', sector: '自動車', price: 3000 },
        { symbol: '7267', name: 'ホンダ', market: 'japan', sector: '自動車', price: 1800 },
        { symbol: 'AAPL', name: 'Apple', market: 'usa', sector: 'テクノロジー', price: 180 },
        { symbol: 'OTHER', name: 'Other', market: 'japan', sector: undefined, price: 100 },
        { symbol: 'NO_QUOTE', name: 'No Quote', market: 'japan', sector: '金融', price: 1000 },
    ],
}));

// Mock ResizeObserver for components that might use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

describe('Heatmap Page', () => {
    const mockPush = jest.fn();
    const mockBatchUpdateStockData = jest.fn();
    const mockSetSelectedStock = jest.fn();

    const mockQuotes = [
        { symbol: '7203', price: 3000, change: 50, changePercent: 1.6, volume: 1000000 },
        { symbol: '7267', price: 1800, change: 20, changePercent: 1.1, volume: 500000 },
        { symbol: 'AAPL', price: 180, change: -2, changePercent: -1.1, volume: 5000000 },
        { symbol: 'OTHER', price: 100, change: 0, changePercent: 0, volume: 1000 },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue(mockQuotes);

        // Mock Store
        (useTradingStore as any).setState({
            batchUpdateStockData: mockBatchUpdateStockData,
            setSelectedStock: mockSetSelectedStock,
        });
    });

    it('renders heatmap blocks and sidebar correctly', async () => {
        render(<Heatmap />);

        expect(screen.getByText('MARKET UNIVERSE')).toBeInTheDocument();
        expect(screen.getByText('セクター')).toBeInTheDocument();

        await waitFor(() => {
            expect(marketClient.fetchQuotes).toHaveBeenCalled();
        });

        // Check if some stock symbols from ALL_STOCKS are present
        // Since ALL_STOCKS is large, we check for a few known ones
        expect(screen.getByText('7203')).toBeInTheDocument(); // Toyota
        expect(screen.getByText('AAPL')).toBeInTheDocument(); // Apple
    });

    it('updates stock data on mount', async () => {
        render(<Heatmap />);

        await waitFor(() => {
            expect(mockBatchUpdateStockData).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ symbol: '7203' }),
                    expect.objectContaining({ symbol: 'AAPL' }),
                ])
            );
        });
    });

    it('filters stocks by market', async () => {
        render(<Heatmap />);

        const japanButton = screen.getByText('japan');
        fireEvent.click(japanButton);

        // After filtering by Japan, Apple (USA) should not be visible if filtered correctly
        // Note: The visibility might depend on how the grid is rendered. 
        // Let's check if the number of stocks changes or if specific USA stock is gone.
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
        expect(screen.getByText('7203')).toBeInTheDocument();

        const usaButton = screen.getByText('usa');
        fireEvent.click(usaButton);
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('7203')).not.toBeInTheDocument();

        const globalButton = screen.getByText('Global');
        fireEvent.click(globalButton);
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('filters stocks by sector', async () => {
        render(<Heatmap />);

        // '自動車' (Automobile) sector includes Toyota (7203)
        const autoSectorButtons = screen.getAllByText('自動車');
        fireEvent.click(autoSectorButtons[0]); // サイドバーのボタンをクリック

        expect(screen.getByText('7203')).toBeInTheDocument();
        // AAPL is 'テクノロジー' or '半導体' usually, not '自動車'
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });

    it('navigates to home and sets selected stock on block click', async () => {
        render(<Heatmap />);

        await waitFor(() => {
            expect(screen.getByText('7203')).toBeInTheDocument();
        });

        const toyotaBlock = screen.getByText('7203').closest('div');
        if (toyotaBlock) {
            fireEvent.click(toyotaBlock);
        }

        expect(mockSetSelectedStock).toHaveBeenCalledWith(expect.objectContaining({ symbol: '7203' }));
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('resets filters when reset button is clicked', async () => {
        render(<Heatmap />);

        const japanButton = screen.getByText('japan');
        fireEvent.click(japanButton);
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

        const resetButton = screen.getByText('リセット');
        fireEvent.click(resetButton);

        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('7203')).toBeInTheDocument();
    });

    it('handles API failure gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (marketClient.fetchQuotes as jest.Mock).mockRejectedValue(new Error('API Error'));

        render(<Heatmap />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Universe sync failed:', expect.any(Error));
        });

        consoleSpy.mockRestore();
    });
});
