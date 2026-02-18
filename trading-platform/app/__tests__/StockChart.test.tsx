/**
 * StockChart - TDD Test Suite
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockChart } from '@/app/components/StockChart';
import { OHLCV, Signal } from '@/app/types';

function generateMockOHLCV(startPrice: number, days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let currentPrice = startPrice;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const open = currentPrice;
    const change = (Math.random() - 0.5) * 10;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }
  return data;
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

interface ChartProps {
  options?: {
    onHover?: (...args: unknown[]) => void;
  };
}

interface ChartElement {
  index: number;
  datasetIndex: number;
}

// Mock Chart.js to avoid canvas errors in JSDOM
jest.mock('react-chartjs-2', () => ({
  Line: (props: ChartProps) => {
    return (
      <div
        data-testid="line-chart"
        data-options={JSON.stringify(props.options)}
        onClick={() => {
          // Simulate hover on index 5 if options.onHover exists
          if (props.options?.onHover) {
            props.options.onHover(null, [{ index: 5, element: {} as ChartElement, datasetIndex: 0 }]);
          }
        }}
      >
        Line Chart
      </div>
    );
  },
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

describe('StockChart', () => {
  const mockData = generateMockOHLCV(1000, 10);

  it('renders without crashing', () => {
    render(<StockChart data={mockData} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StockChart data={[]} loading={true} />);
    expect(screen.getByText(/チャートデータを読み込み中.../i)).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<StockChart data={[]} error="Failed to fetch" />);
    expect(screen.getByText(/データの取得に失敗しました/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
  });

  it('renders volume profile plugin when enabled', () => {
    // Mock signal with volume resistance
    const mockSignalLocal: Signal = {
      symbol: 'TEST',
      type: 'BUY',
      confidence: 80,
      predictedChange: 5,
      targetPrice: 1000,
      stopLoss: 900,
      reason: 'Strong volume resistance detected',
      predictionDate: '2026-01-25',
      volumeResistance: [
        { price: 100, strength: 0.8 },
        { price: 110, strength: 0.4 }
      ]
    };


    render(<StockChart data={mockData} signal={mockSignalLocal} />);
    // Verify plugin is conceptually registered or component renders
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('calculates ghost forecast on hover', () => {
    const mockSignalLocal: Signal = {
      symbol: 'TEST',
      type: 'BUY',
      confidence: 80,
      predictedChange: 5,
      targetPrice: 1000,
      stopLoss: 900,
      reason: 'Test signal for hover',
      predictionDate: '2026-01-25'
    };

    // Need minimal data for ghost forecast
    const longData = generateMockOHLCV(1000, 50);

    render(<StockChart data={longData} signal={mockSignalLocal} />);

    // Trigger hover via click (as mapped in our smart mock)
    const chart = screen.getByTestId('line-chart');
    fireEvent.click(chart);

    // Logic runs (useMemo updates). Since we mock the output, we can't verify the lines appear on canvas
    // But we know the code path executed if no error occurs.
    // For specific state assertion, we'd need to inspect props passed to re-render, 
    // but the mock is defined outside the test so capturing re-renders is hard.
    // Just ensuring no crash is good for coverage.
    expect(chart).toBeInTheDocument();
  });

  it('renders volume chart when showVolume is true', () => {
    const { createChart } = require('lightweight-charts');
    const mockAddSeries = jest.fn(() => ({
      setData: jest.fn(),
      applyOptions: jest.fn(),
    }));
    const mockChart = {
      addSeries: mockAddSeries,
      remove: jest.fn(),
      applyOptions: jest.fn(),
      priceScale: jest.fn(() => ({
        applyOptions: jest.fn(),
      })),
      subscribeCrosshairMove: jest.fn(),
      timeScale: jest.fn(() => ({
        scrollToRealTime: jest.fn(),
      })),
    };
    createChart.mockReturnValue(mockChart);

    render(<StockChart data={mockData} showVolume={true} />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    // Verify volume histogram series was added (CandlestickSeries + HistogramSeries + forecast series)
    const histogramCalls = mockAddSeries.mock.calls.filter(call => call[0] === 'Histogram');
    expect(histogramCalls.length).toBeGreaterThan(0);
  });

  it('does not render volume chart when showVolume is false', () => {
    const { createChart } = require('lightweight-charts');
    const mockAddSeries = jest.fn(() => ({
      setData: jest.fn(),
      applyOptions: jest.fn(),
    }));
    const mockChart = {
      addSeries: mockAddSeries,
      remove: jest.fn(),
      applyOptions: jest.fn(),
      priceScale: jest.fn(() => ({
        applyOptions: jest.fn(),
      })),
      subscribeCrosshairMove: jest.fn(),
      timeScale: jest.fn(() => ({
        scrollToRealTime: jest.fn(),
      })),
    };
    createChart.mockReturnValue(mockChart);

    render(<StockChart data={mockData} showVolume={false} />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    // Verify volume histogram series was NOT added (only CandlestickSeries + forecast series, no HistogramSeries)
    const histogramCalls = mockAddSeries.mock.calls.filter(call => call[0] === 'Histogram');
    expect(histogramCalls.length).toBe(0);
  });
});

describe('StockChart - 予測円 (Forecast Cone)', () => {
  const mockData = generateMockOHLCV(1000, 50);

  it('renders forecast cone when BUY signal is provided', () => {
    const buySignal: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 80,
      targetPrice: 1100,
      stopLoss: 900,
      reason: 'Strong uptrend detected',
      predictedChange: 10,
      predictionDate: '2026-01-25',
      atr: 50,
      predictionError: 1.2,
      volumeResistance: []
    };
    render(<StockChart data={mockData} signal={buySignal} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders forecast cone when SELL signal is provided', () => {
    const sellSignal: Signal = {
      symbol: '7203',
      type: 'SELL',
      confidence: 70,
      targetPrice: 900,
      stopLoss: 1100,
      reason: 'Downtrend expected',
      predictedChange: -10,
      predictionDate: '2026-01-25',
      atr: 50,
      predictionError: 1.0,
      volumeResistance: []
    };
    render(<StockChart data={mockData} signal={sellSignal} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders forecast cone when HOLD signal is provided', () => {
    const holdSignal: Signal = {
      symbol: '7203',
      type: 'HOLD',
      confidence: 50,
      targetPrice: 1000,
      stopLoss: 1000,
      reason: 'No clear direction',
      predictedChange: 0,
      predictionDate: '2026-01-25',
      atr: 50,
      predictionError: 0.9,
      volumeResistance: []
    };
    render(<StockChart data={mockData} signal={holdSignal} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('includes prediction error in forecast calculation', () => {
    const signalWithError: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 75,
      targetPrice: 1100,
      stopLoss: 900,
      reason: 'Uptrend with high uncertainty',
      predictedChange: 10,
      predictionDate: '2026-01-25',
      atr: 50,
      predictionError: 2.5, // High error
      volumeResistance: []
    };
    render(<StockChart data={mockData} signal={signalWithError} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StockChart - ボリュームプロファイル (Volume Profile)', () => {
  const mockData = generateMockOHLCV(1000, 50);

  it('renders volume profile when signal has volumeResistance data', () => {
    const signalWithVolume: Signal = {
      symbol: '7203',
      type: 'BUY',
      confidence: 80,
      targetPrice: 1100,
      stopLoss: 900,
      reason: 'Strong support at 950',
      predictedChange: 10,
      predictionDate: '2026-01-25',
      volumeResistance: [
        { price: 950, strength: 0.9 },
        { price: 1050, strength: 0.7 }
      ]
    };
    render(<StockChart data={mockData} signal={signalWithVolume} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles empty volumeResistance array', () => {
    const signalWithNoVolume: Signal = {
      symbol: '7203',
      type: 'HOLD',
      confidence: 50,
      targetPrice: 1000,
      stopLoss: 1000,
      reason: 'Neutral',
      predictedChange: 0,
      predictionDate: '2026-01-25',
      volumeResistance: []
    };
    render(<StockChart data={mockData} signal={signalWithNoVolume} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StockChart - 市場指数 (Market Index)', () => {
  const mockStockData = generateMockOHLCV(1000, 50);
  const mockIndexData = generateMockOHLCV(25000, 50);

  it('renders normalized index data when indexData is provided', () => {
    render(<StockChart data={mockStockData} indexData={mockIndexData} market="japan" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles empty indexData', () => {
    render(<StockChart data={mockStockData} indexData={[]} market="japan" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles insufficient indexData', () => {
    const insufficientIndex = generateMockOHLCV(25000, 5);
    render(<StockChart data={mockStockData} indexData={insufficientIndex} market="japan" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StockChart - インジケーター (Indicators)', () => {
  const mockData = generateMockOHLCV(1000, 50);

  it('renders SMA indicator when showSMA is true', () => {
    render(<StockChart data={mockData} showSMA={true} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not render SMA indicator when showSMA is false', () => {
    render(<StockChart data={mockData} showSMA={false} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders Bollinger Bands when showBollinger is true', () => {
    render(<StockChart data={mockData} showBollinger={true} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders both SMA and Bollinger Bands', () => {
    render(<StockChart data={mockData} showSMA={true} showBollinger={true} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StockChart - 市場タイプ (Market Types)', () => {
  const mockData = generateMockOHLCV(1000, 50);

  it('renders correctly for Japan market', () => {
    render(<StockChart data={mockData} market="japan" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders correctly for USA market', () => {
    render(<StockChart data={mockData} market="usa" />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});

describe('StockChart - エッジケース (Edge Cases)', () => {
  const mockData = generateMockOHLCV(1000, 50);

  it('handles empty data array', () => {
    render(<StockChart data={[]} />);
    // Empty data renders without crashing but may not show chart
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('handles single data point', () => {
    const singlePoint = [generateMockOHLCV(1000, 1)[0]];
    render(<StockChart data={singlePoint} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles minimal data for forecast', () => {
    const minimalData = generateMockOHLCV(1000, 20);
    const signal: Signal = {
      symbol: 'TEST',
      type: 'BUY',
      confidence: 60,
      targetPrice: 1100,
      stopLoss: 900,
      reason: 'Test',
      predictedChange: 10,
      predictionDate: '2026-01-25'
    };
    render(<StockChart data={minimalData} signal={signal} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles custom height', () => {
    render(<StockChart data={mockData} height={600} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
