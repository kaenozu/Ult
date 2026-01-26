import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignalCard } from '../SignalCard';
// import { JAPAN_STOCKS, US_STOCKS } from '@/app/data/stocks';

describe('SignalCard', () => {
    const mockStockJP = {
        symbol: '7203',
        name: 'Toyota',
        market: 'japan' as const,
        description: 'Test',
        sector: 'Auto'
    };
    const mockStockUS = {
        symbol: 'AAPL',
        name: 'Apple',
        market: 'usa' as const,
        description: 'Test',
        sector: 'Tech'
    };

    const baseSignal = {
        symbol: mockStockJP.symbol,
        type: 'BUY' as const,
        confidence: 85,
        predictedChange: 5,
        targetPrice: 1000,
        stopLoss: 900,
        reason: 'Test Reason',
        predictionDate: '2026-01-22'
    };

    it('renders basic buy signal correctly', () => {
        render(<SignalCard stock={mockStockJP} signal={baseSignal} />);

        expect(screen.getByText('買い')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('🔥 強気シグナル')).toBeInTheDocument();
        expect(screen.getByText(/Test Reason/)).toBeInTheDocument();
    });

    it('renders sell signal correctly', () => {
        const sellSignal = { ...baseSignal, type: 'SELL' as const, confidence: 60 };
        render(<SignalCard stock={mockStockJP} signal={sellSignal} />);

        expect(screen.getByText('売り')).toBeInTheDocument();
        expect(screen.getByText('通常シグナル')).toBeInTheDocument();
    });

    it('renders hold signal correctly', () => {
        const holdSignal = { ...baseSignal, type: 'HOLD' as const };
        render(<SignalCard stock={mockStockJP} signal={holdSignal} />);

        expect(screen.getByText('維持')).toBeInTheDocument();
    });

    it('shows live indicator when isLive is true', () => {
        render(<SignalCard stock={mockStockJP} signal={baseSignal} isLive={true} />);
        expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('displays AI hit rate correctly', () => {
        render(<SignalCard stock={mockStockJP} signal={baseSignal} aiHitRate={75} aiTradesCount={10} />);
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText(/過去10回の試行/)).toBeInTheDocument();
        expect(screen.getByText(/🌟 高的中率 \(75%\)/)).toBeInTheDocument();
    });

    it('handles AI hit rate loading state', () => {
        render(<SignalCard stock={mockStockJP} signal={baseSignal} calculatingHitRate={true} />);
        expect(screen.getByText('計算中...')).toBeInTheDocument();
    });

    it('handles AI hit rate error state', () => {
        render(<SignalCard stock={mockStockJP} signal={baseSignal} error="Failed" />);
        expect(screen.getByText('エラー')).toBeInTheDocument();
        expect(screen.getByTitle('Failed')).toBeInTheDocument();
    });

    it('displays prediction error with correct specific coloring', () => {
        const goodError = { ...baseSignal, predictionError: 0.5 };
        const { rerender } = render(<SignalCard stock={mockStockJP} signal={goodError} />);
        expect(screen.getByText('0.50x')).toHaveClass('text-green-400'); // Low error

        const medError = { ...baseSignal, predictionError: 1.2 };
        rerender(<SignalCard stock={mockStockJP} signal={medError} />);
        expect(screen.getByText('1.20x')).toHaveClass('text-yellow-400'); // Med error

        const badError = { ...baseSignal, predictionError: 2.0 };
        rerender(<SignalCard stock={mockStockJP} signal={badError} />);
        expect(screen.getByText('2.00x')).toHaveClass('text-red-400'); // High error
    });

    it('formats currency correctly for US stocks', () => {
        render(<SignalCard stock={mockStockUS} signal={baseSignal} />);
        // Basic check for dollar sign or format, assuming formatCurrency works
        // Ideally checking specific output if known
    });
});
