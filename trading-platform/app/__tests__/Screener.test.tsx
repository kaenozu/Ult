import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Screener from '../screener/page';
import { useTradingStore } from '../store/tradingStore';
import { marketClient } from '../lib/api/data-aggregator';
import { fetchOHLCV } from '../data/stocks';
import { filterByTechnicals } from '../lib/screener-utils';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock Dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('../lib/api/data-aggregator', () => ({
    marketClient: {
        fetchQuotes: jest.fn(),
        fetchSignal: jest.fn(),
        fetchMarketIndex: jest.fn(),
    },
}));

jest.mock('../data/stocks', () => {
    const original = jest.requireActual('../data/stocks');
    return {
        ...original,
        fetchOHLCV: jest.fn(),
        JAPAN_STOCKS: [
            { symbol: '7203', name: 'トヨタ', market: 'japan', sector: '自動車', price: 3000, change: 0, changePercent: 0, volume: 1000000 },
        ],
        USA_STOCKS: [
            { symbol: 'AAPL', name: 'Apple', market: 'usa', sector: 'テクノロジー', price: 180, change: 0, changePercent: 0, volume: 5000000 },
        ],
    };
});

jest.mock('../lib/screener-utils', () => ({
    filterByTechnicals: jest.fn(),
}));

jest.mock('../components/Navigation', () => ({
    Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

describe('Screener Page', () => {
    const mockPush = jest.fn();
    const mockAddToWatchlist = jest.fn();
    const mockSetSelectedStock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            { symbol: 'AAPL', price: 185, change: 5, changePercent: 2.7, volume: 5500000 },
        ]);

        // Mock fetchMarketIndex for pre-warming cache
        (marketClient.fetchMarketIndex as jest.Mock).mockResolvedValue({
            data: [
                { date: '2026-01-01', open: 1000, high: 1050, low: 990, close: 1020, volume: 1000000 }
            ]
        });

        (useTradingStore as any).setState({
            addToWatchlist: mockAddToWatchlist,
            setSelectedStock: mockSetSelectedStock,
        });
    });

    it('renders and fetches initial quotes', async () => {
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            { symbol: 'AAPL', price: 185, change: 5, changePercent: 2.7, volume: 5500000 },
        ]);
        render(<Screener />);

        expect(screen.getAllByText('株式スクリーナー')[0]).toBeInTheDocument();

        await waitFor(() => {
            expect(marketClient.fetchQuotes).toHaveBeenCalled();
        });

        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('filters stocks by price range', async () => {
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            { symbol: 'AAPL', price: 185, change: 5, changePercent: 2.7, volume: 5500000 },
        ]);
        render(<Screener />);
        await waitFor(() => screen.getByText('7203'));

        // Filter for price > 1000
        const priceMinInput = screen.getByPlaceholderText('Min');
        fireEvent.change(priceMinInput, { target: { value: '1000' } });
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
        expect(screen.getByText('7203')).toBeInTheDocument();

        // Filter for price < 500
        fireEvent.change(priceMinInput, { target: { value: '' } });
        const priceMaxInput = screen.getByPlaceholderText('Max');
        fireEvent.change(priceMaxInput, { target: { value: '500' } });
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('7203')).not.toBeInTheDocument();
    });

    it('filters stocks by change, market and sector', async () => {
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            { symbol: 'AAPL', price: 185, change: 5, changePercent: 2.7, volume: 5500000 },
        ]);
        render(<Screener />);
        await waitFor(() => screen.getByText('7203'));

        // Market filter
        const marketSelect = screen.getByDisplayValue('全て');
        fireEvent.change(marketSelect, { target: { value: 'usa' } });
        expect(screen.queryByText('7203')).not.toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();

        fireEvent.change(marketSelect, { target: { value: '' } });

        // Change filter (Min %)
        const changeMinInput = screen.getByPlaceholderText('Min %');
        fireEvent.change(changeMinInput, { target: { value: '3' } });
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
        expect(screen.getByText('7203')).toBeInTheDocument();

        // Change filter (Max %)
        fireEvent.change(changeMinInput, { target: { value: '' } });
        const changeMaxInput = screen.getByPlaceholderText('Max %');
        fireEvent.change(changeMaxInput, { target: { value: '3' } });
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('7203')).not.toBeInTheDocument();

        // Volume filter
        fireEvent.change(changeMaxInput, { target: { value: '' } });
        const volumeMinInput = screen.getByPlaceholderText('Min Volume');
        fireEvent.change(volumeMinInput, { target: { value: '5000000' } });
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('7203')).not.toBeInTheDocument();

        // Sector filter
        fireEvent.change(volumeMinInput, { target: { value: '' } });
        const sectorInput = screen.getByPlaceholderText('Sector');
        fireEvent.change(sectorInput, { target: { value: '自動車' } });
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });

    it('filters by AI signal and confidence after analysis', async () => {
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            { symbol: 'AAPL', price: 185, change: 5, changePercent: 2.7, volume: 5500000 },
            { symbol: 'MSFT', price: 400, change: 10, changePercent: 2.5, volume: 2000000 },
        ]);
        (useTradingStore as any).setState({
            addToWatchlist: mockAddToWatchlist,
            setSelectedStock: mockSetSelectedStock,
        });

        // Mock signal: 7203=BUY(90), AAPL=SELL(70), MSFT=null
        (marketClient.fetchSignal as jest.Mock).mockImplementation((stock) => {
            if (stock.symbol === '7203') return Promise.resolve({ 
                success: true, 
                data: { 
                    symbol: '7203',
                    type: 'BUY', 
                    confidence: 90,
                    targetPrice: 3200,
                    stopLoss: 2900,
                    reason: 'Test reason',
                    predictedChange: 3.0,
                    predictionDate: '2026-01-01'
                } 
            });
            if (stock.symbol === 'AAPL') return Promise.resolve({ 
                success: true, 
                data: { 
                    symbol: 'AAPL',
                    type: 'SELL', 
                    confidence: 70,
                    targetPrice: 180,
                    stopLoss: 190,
                    reason: 'Test reason',
                    predictedChange: -2.0,
                    predictionDate: '2026-01-01'
                } 
            });
            return Promise.resolve({ success: true, data: null });
        });
        (fetchOHLCV as jest.Mock).mockResolvedValue(
            Array(30).fill({ date: '2026-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 })
        );
        (filterByTechnicals as jest.Mock).mockReturnValue(true);

        render(<Screener />);
        await waitFor(() => screen.getByText('7203'));

        // Start analysis
        fireEvent.click(screen.getByText('AIシグナル分析を開始'));
        await waitFor(() => screen.getByText('再分析を実行'));

        // Set confidence to 80 explicitly for this test scenario
        const slider = document.getElementById('minConfidence') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '80' } });

        // ANY & 80: Only 7203 (AAPL is 70, default signal is now 'ANY')
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
        expect(screen.queryByText('MSFT')).not.toBeInTheDocument();

        // BUY & 80: Only 7203
        fireEvent.click(screen.getAllByText('買い')[0]);
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

        // ANY & 60: 7203 and AAPL
        fireEvent.click(screen.getAllByText('全て')[0]);
        fireEvent.change(slider, { target: { value: '60' } });
        expect(screen.getByText('7203')).toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();

        // SELL & 60: Only AAPL
        fireEvent.click(screen.getAllByText('売り')[0]);
        expect(screen.queryByText('7203')).not.toBeInTheDocument();
        expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('handles sort changes (symbol and price)', async () => {
        render(<Screener />);

        const symbolHeader = screen.getAllByText(/銘柄コード/)[0];
        fireEvent.click(symbolHeader); // Sort by symbol asc

        let rows = screen.getAllByRole('row').slice(1);
        expect(rows[0]).toHaveTextContent('AAPL');
        expect(rows[1]).toHaveTextContent('7203');

        fireEvent.click(symbolHeader); // Sort by symbol desc
        rows = screen.getAllByRole('row').slice(1);
        expect(rows[0]).toHaveTextContent('7203');
        expect(rows[1]).toHaveTextContent('AAPL');

        const priceHeader = screen.getByText(/現在値/);
        fireEvent.click(priceHeader); // price desc
        rows = screen.getAllByRole('row').slice(1);
        expect(rows[0]).toHaveTextContent('7203'); // 3100
        expect(rows[1]).toHaveTextContent('AAPL'); // 185

        const changeHeader = screen.getAllByText(/騰落率/)[0];
        fireEvent.click(changeHeader); // already changePercent desc, so it should become asc
        fireEvent.click(changeHeader); // should become desc again
    });

    it('performs AI screening successfully', async () => {
        (marketClient.fetchSignal as jest.Mock).mockResolvedValue({
            success: true,
            data: { 
                symbol: '7203',
                type: 'BUY', 
                confidence: 85,
                targetPrice: 3200,
                stopLoss: 2900,
                reason: 'Test reason',
                predictedChange: 3.0,
                predictionDate: '2026-01-01'
            }
        });
        (fetchOHLCV as jest.Mock).mockResolvedValue(
            Array(30).fill({ date: '2026-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 })
        );
        (filterByTechnicals as jest.Mock).mockReturnValue(true);

        render(<Screener />);

        const analyzeButton = screen.getByText('AIシグナル分析を開始');
        fireEvent.click(analyzeButton);

        await waitFor(() => {
            expect(screen.getByText('再分析を実行')).toBeInTheDocument();
        }, { timeout: 10000 });

        expect(screen.getAllByText('買い')[0]).toBeInTheDocument();
        expect(screen.getAllByText('85%')[0]).toBeInTheDocument();
    });

    it('handles filter changes (confidence and trend)', () => {
        render(<Screener />);

        // Confidence slider
        const slider = document.getElementById('minConfidence') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '70' } });
        expect(screen.getByText('70%')).toBeInTheDocument();

        // Trend select
        const trendSelect = document.getElementById('trendFilter') as HTMLSelectElement;
        fireEvent.change(trendSelect, { target: { value: 'uptrend' } });
        expect(trendSelect.value).toBe('uptrend');
    });

    it('covers additional sort fields', () => {
        render(<Screener />);
        // Sort by name (which is also symbol-based sort in this mock)
        const nameHeader = screen.getByText('名称');
        fireEvent.click(nameHeader);

        // Sort by Price asc (already tested partially, but let's do it again explicitly)
        const priceHeader = screen.getByText(/現在値/);
        fireEvent.click(priceHeader); // price desc
        fireEvent.click(priceHeader); // price asc

        const changeHeader = screen.getAllByText(/騰落率/)[0];
        fireEvent.click(changeHeader); // already changePercent desc, so it should become asc
    });

    it('handles all types of regular filters', () => {
        render(<Screener />);

        // Price Min
        const priceMinInput = screen.getByPlaceholderText('Min');
        fireEvent.change(priceMinInput, { target: { value: '100' } });
        expect(priceMinInput).toHaveValue(100);

        // Price Max
        const priceMaxInput = screen.getByPlaceholderText('Max');
        fireEvent.change(priceMaxInput, { target: { value: '200' } });
        expect(priceMaxInput).toHaveValue(200);

        // Market select
        const marketSelect = screen.getByDisplayValue('全て');
        fireEvent.change(marketSelect, { target: { value: 'usa' } });
        expect(marketSelect).toHaveValue('usa');

        // Change filters
        const changeMinInput = screen.getByPlaceholderText('Min %');
        fireEvent.change(changeMinInput, { target: { value: '1' } });

        const changeMaxInput = screen.getByPlaceholderText('Max %');
        fireEvent.change(changeMaxInput, { target: { value: '5' } });

        // Volume filter
        const volumeMinInput = screen.getByPlaceholderText('Min Volume');
        fireEvent.change(volumeMinInput, { target: { value: '2000000' } });

        // Sector filter
        const sectorInput = screen.getByPlaceholderText('Sector');
        fireEvent.change(sectorInput, { target: { value: 'Technology' } });
    });

    it('handles technical analysis failure', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (fetchOHLCV as jest.Mock).mockResolvedValue(
            Array(30).fill({ date: '2026-01-01', open: 100, high: 105, low: 95, close: 100, volume: 1000 })
        );
        (filterByTechnicals as jest.Mock).mockReturnValue(true);
        (marketClient.fetchSignal as jest.Mock).mockRejectedValue(new Error('Analysis Failed'));

        render(<Screener />);
        const analyzeButton = screen.getByText('AIシグナル分析を開始');
        fireEvent.click(analyzeButton);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to analyze'), expect.any(Error));
        });
        consoleSpy.mockRestore();
    });

    it('handles sidebar toggle and overlay', () => {
        render(<Screener />);

        // Hamburger menu button (first button in header)
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);

        // Overlay should be visible and clickable
        const overlay = document.querySelector('.bg-black\\/50');
        if (overlay) {
            fireEvent.click(overlay);
        }
    });

    it('applies presets (oversold, uptrend, overbought, downtrend)', () => {
        render(<Screener />);

        const oversoldButton = screen.getByText('🔥 売られすぎ（買い）');
        fireEvent.click(oversoldButton);
        expect(screen.queryByText('再分析を実行')).not.toBeInTheDocument();

        const uptrendButton = screen.getByText('🚀 上昇トレンド（買い）');
        fireEvent.click(uptrendButton);

        const overboughtButton = screen.getByText('⚠️ 買われすぎ（売り）');
        fireEvent.click(overboughtButton);

        const downtrendButton = screen.getByText('📉 下降トレンド（売り）');
        fireEvent.click(downtrendButton);
    });

    it('navigates on stock click', async () => {
        render(<Screener />);
        await waitFor(() => screen.getByText('7203'));

        const toyotaRow = screen.getByText('7203').closest('tr');
        if (toyotaRow) {
            fireEvent.click(toyotaRow);
        }

        expect(mockAddToWatchlist).toHaveBeenCalled();
        expect(mockSetSelectedStock).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('resets filters', () => {
        render(<Screener />);
        const resetButton = screen.getByText('リセット');
        fireEvent.click(resetButton);
    });

    it('covers missing quote data during initial fetch', async () => {
        (marketClient.fetchQuotes as jest.Mock).mockResolvedValue([
            { symbol: '7203', price: 3100, change: 100, changePercent: 3.3, volume: 1100000 },
            // AAPL missing
        ]);
        render(<Screener />);
        await waitFor(() => expect(marketClient.fetchQuotes).toHaveBeenCalled());
    });
});
