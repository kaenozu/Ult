import { render, screen, fireEvent } from '@testing-library/react';
import Page from '../page';
import '@testing-library/jest-dom';

// Mock all sub-components to focus on page logic & layout
jest.mock('@/app/components/Header', () => ({ Header: () => <div data-testid="Header" /> }));
jest.mock('@/app/components/Navigation', () => ({ Navigation: () => <div data-testid="Navigation" /> }));
jest.mock('@/app/components/StockChart', () => ({ StockChart: () => <div data-testid="StockChart" /> }));
jest.mock('@/app/components/ChartToolbar', () => ({ ChartToolbar: () => <div data-testid="ChartToolbar" /> }));
jest.mock('@/app/components/LeftSidebar', () => ({ LeftSidebar: () => <div data-testid="LeftSidebar" /> }));
jest.mock('@/app/components/RightSidebar', () => ({ RightSidebar: () => <div data-testid="RightSidebar" /> }));
jest.mock('@/app/components/BottomPanel', () => ({ BottomPanel: () => <div data-testid="BottomPanel" /> }));

// Mock hooks
import { useStockData } from '@/app/hooks/useStockData';
jest.mock('@/app/store/portfolioStore', () => ({
    usePortfolioStore: jest.fn()
}));
jest.mock('@/app/store/journalStore', () => ({
    useJournalStore: jest.fn()
}));
jest.mock('@/app/store/watchlistStore', () => ({
    useWatchlistStore: jest.fn()
}));
jest.mock('@/app/i18n/provider', () => ({
    useTranslations: () => (key: string) => {
        if (key === 'page.dataFetchError') return 'データの取得に失敗しました';
        if (key === 'page.noStockSelected') return '銘柄が未選択です';
        return key;
    },
}));

jest.mock('@/app/hooks/useStockData', () => ({
    useStockData: jest.fn()
}));

const mockPortfolioStore = {
    portfolio: { cash: 1000, positions: [] },
    closePosition: jest.fn()
};
const mockJournalStore = { journal: [] };
const mockWatchlistStore = { watchlist: [] };

const mockStockData = {
    selectedStock: null,
    chartData: [],
    indexData: [],
    chartSignal: null,
    loading: false,
    error: null,
    handleStockSelect: jest.fn(),
    interval: '5m',
    setInterval: jest.fn()
};

describe('Page (Workstation)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (require('@/app/store/portfolioStore').usePortfolioStore as jest.Mock).mockReturnValue(mockPortfolioStore);
        (require('@/app/store/journalStore').useJournalStore as jest.Mock).mockReturnValue(mockJournalStore);
        (require('@/app/store/watchlistStore').useWatchlistStore as jest.Mock).mockReturnValue(mockWatchlistStore);
        (useStockData as unknown as jest.Mock).mockReturnValue(mockStockData);
    });

    it('renders empty state when no stock selected', () => {
        render(<Page />);
        expect(screen.getByText('銘柄が未選択です')).toBeInTheDocument();
        expect(screen.getByTestId('LeftSidebar')).toBeInTheDocument();
        expect(screen.queryByTestId('StockChart')).not.toBeInTheDocument();
    });

    it('renders loading state', () => {
        (useStockData as unknown as jest.Mock).mockReturnValue({
            ...mockStockData,
            loading: true
        });
        const { container } = render(<Page />);
        // Check for spinner class or structure
        expect(container.getElementsByClassName('animate-spin').length).toBeGreaterThan(0);
    });

    it('renders error state', () => {
        (useStockData as unknown as jest.Mock).mockReturnValue({
            ...mockStockData,
            error: 'API Error'
        });
        render(<Page />);
        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    it('renders main workspace when stock selected', async () => {
        (useStockData as unknown as jest.Mock).mockReturnValue({
            ...mockStockData,
            selectedStock: { symbol: '7203', name: 'Toyota' },
            chartData: [{ date: '2023-01-01', close: 100 }],
        });

        render(<Page />);
        expect(screen.getByTestId('Header')).toBeInTheDocument();
        // Use findByTestId to wait for Suspense/lazy load
        expect(await screen.findByTestId('StockChart')).toBeInTheDocument();
        expect(screen.getByTestId('RightSidebar')).toBeInTheDocument();
        expect(screen.getByTestId('BottomPanel')).toBeInTheDocument();
    });

    it('toggles mobile sidebars', () => {
        render(<Page />);

        // Find toggle buttons (usually SVG icons in buttons)
        const buttons = screen.getAllByRole('button');
        // Assuming first is Left toggle, second is Right toggle based on order in DOM
        const leftToggle = buttons[0];

        fireEvent.click(leftToggle);
        // State change happens, but sidebar prop 'isOpen' updates.
        // Since we mocked LeftSidebar, we checks props if possible,
        // or checks for the backdrop presence which is conditional in real DOM

        // Check for backdrop click to close
        const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
        expect(backdrop).toBeInTheDocument();
        // Testing implementation details of backdrop usually requires querying by class if no role
    });
});
