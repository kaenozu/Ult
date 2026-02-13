import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock store BEFORE importing components that use it
jest.mock('@/app/store/themeStore', () => ({
    useThemeStore: jest.fn()
}));

import { useThemeStore } from '@/app/store/themeStore';
import { LeftSidebar } from '../LeftSidebar';
import { RightSidebar } from '../RightSidebar';
import { BottomPanel } from '../BottomPanel';
import { ChartToolbar } from '../ChartToolbar';
import { Navigation } from '../Navigation';

// Mock dependencies
jest.mock('../StockTable', () => ({ StockTable: () => <div data-testid="StockTable" /> }));
jest.mock('../SignalPanel', () => ({ SignalPanel: () => <div data-testid="SignalPanel" /> }));
jest.mock('../OrderPanel', () => ({ OrderPanel: () => <div data-testid="OrderPanel" /> }));
jest.mock('../PositionTable', () => ({ PositionTable: () => <div data-testid="PositionTable" /> }));
jest.mock('../HistoryTable', () => ({ HistoryTable: () => <div data-testid="HistoryTable" /> }));
jest.mock('../AlertPanel', () => ({ AlertPanel: () => <div data-testid="AlertPanel" /> }));
jest.mock('../DataQualityPanel', () => ({ DataQualityPanel: () => <div data-testid="DataQualityPanel" /> }));
jest.mock('../DataDelayBadge', () => ({ DataDelayBadge: () => <span data-testid="DataDelayBadge" /> }));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    BarChart3: () => <span data-testid="icon" />,
    Grid3X3: () => <span data-testid="icon" />,
    FileText: () => <span data-testid="icon" />,
    Filter: () => <span data-testid="icon" />,
    Moon: () => <span data-testid="icon" />,
    Sun: () => <span data-testid="icon" />,
    Brain: () => <span data-testid="icon" />,
    Database: () => <span data-testid="icon" />,
    TrendingUp: () => <span data-testid="icon" />,
    BookOpen: () => <span data-testid="icon" />,
    Target: () => <span data-testid="icon" />,
    Activity: () => <span data-testid="icon" />,
    Globe: () => <span data-testid="icon" />,
    Settings2: () => <span data-testid="icon" />
}));

jest.mock('next/navigation', () => ({
    usePathname: () => '/'
}));

describe('Shell Components', () => {
    describe('LeftSidebar', () => {
        const props = {
            isOpen: true,
            onClose: jest.fn(),
            watchlist: [],
            onSelect: jest.fn(),
            selectedSymbol: undefined
        };

        it('renders StockTable', () => {
            render(<LeftSidebar {...props} />);
            expect(screen.getByTestId('StockTable')).toBeInTheDocument();
            expect(screen.getByText('ウォッチリスト')).toBeInTheDocument();
        });

        it('handles close interaction (mobile)', () => {
            render(<LeftSidebar {...props} />);
            // Finding close button usually by SVG or aria handling, here we rely on button presence
            // Let's assume the first button is close (x icon)
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);
            expect(props.onClose).toHaveBeenCalled();
        });
    });

    describe('RightSidebar', () => {
        const props = {
            isOpen: true,
            onClose: jest.fn(),
            displayStock: { symbol: 'TEST', name: 'Test', price: 100, change: 0, changePercent: 0, market: 'japan' as const },
            chartSignal: null,
            ohlcv: [],
            loading: false
        };

        it('switches between Signal and Order panels', () => {
            render(<RightSidebar {...props} />);
            expect(screen.getByTestId('SignalPanel')).toBeInTheDocument();
            expect(screen.queryByTestId('OrderPanel')).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('注文'));
            expect(screen.getByTestId('OrderPanel')).toBeInTheDocument();
            expect(screen.queryByTestId('SignalPanel')).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('分析 & シグナル'));
            expect(screen.getByTestId('SignalPanel')).toBeInTheDocument();
        });
    });

    describe('BottomPanel', () => {
        const props = {
            portfolio: { cash: 1000, positions: [], orders: [] },
            journal: [],
            onClosePosition: jest.fn()
        };

        it('renders PositionTable by default', () => {
            render(<BottomPanel {...props} />);
            expect(screen.getByTestId('PositionTable')).toBeInTheDocument();
        });

        it('switches tabs', () => {
            render(<BottomPanel {...props} />);
            fireEvent.click(screen.getByText(/注文一覧/));
            expect(screen.getByText('有効な注文はありません')).toBeInTheDocument();

            fireEvent.click(screen.getByText(/取引履歴/));
            expect(screen.getByTestId('HistoryTable')).toBeInTheDocument();
        });

        it('has correct ARIA attributes', () => {
            render(<BottomPanel {...props} />);

            // Check tablist
            expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', '取引情報パネル');

            // Check tabs
            const tabs = screen.getAllByRole('tab');
            expect(tabs).toHaveLength(3);
            expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
            expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

            // Check tabpanel
            const panel = screen.getByRole('tabpanel');
            expect(panel).toHaveAttribute('id', 'panel-positions');
            expect(panel).toHaveAttribute('aria-labelledby', 'tab-positions');

            // Switch tab and verify updates
            fireEvent.click(tabs[1]);
            expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
            expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-orders');
        });
    });

    describe('ChartToolbar', () => {
        const props = {
            stock: { symbol: 'TEST', name: 'Test', price: 100, change: 0, changePercent: 0, market: 'japan' as const },
            latestData: { date: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 },
            showSMA: true,
            setShowSMA: jest.fn(),
            showBollinger: false,
            setShowBollinger: jest.fn(),
            interval: 'D',
            setInterval: jest.fn()
        };

        it('renders stock info and controls', () => {
            render(<ChartToolbar {...props} />);
            expect(screen.getByText('TEST')).toBeInTheDocument();
            expect(screen.getByText('SMA')).toBeInTheDocument();
        });

        it('toggles indicators', () => {
            render(<ChartToolbar {...props} />);
            fireEvent.click(screen.getByText('SMA'));
            expect(props.setShowSMA).toHaveBeenCalledWith(false);
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            (useThemeStore as unknown as jest.Mock).mockReturnValue({
                theme: 'dark',
                toggleTheme: jest.fn()
            });
        });

        it('renders nav items', () => {
            render(<Navigation />);
            expect(screen.getByText('ワークステーション')).toBeInTheDocument();
            expect(screen.getByText('ジャーナル')).toBeInTheDocument();
        });
    });
});
