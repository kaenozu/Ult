import { render, screen } from '@testing-library/react';
import { AdvancedIndicatorsChart } from '../StockChart/AdvancedIndicatorsChart';
import { OHLCV } from '@/app/types';

describe('AdvancedIndicatorsChart', () => {
  const mockData: OHLCV[] = [
    { date: '2026-01-01', open: 145, high: 150, low: 144, close: 148, volume: 1000000 },
    { date: '2026-01-02', open: 148, high: 152, low: 147, close: 150, volume: 1200000 },
    { date: '2026-01-03', open: 150, high: 155, low: 149, close: 152, volume: 1100000 },
    { date: '2026-01-04', open: 152, high: 156, low: 151, close: 154, volume: 1300000 },
    { date: '2026-01-05', open: 154, high: 158, low: 153, close: 156, volume: 1400000 },
    { date: '2026-01-06', open: 156, high: 160, low: 155, close: 158, volume: 1500000 },
    { date: '2026-01-07', open: 158, high: 162, low: 157, close: 160, volume: 1600000 },
    { date: '2026-01-08', open: 160, high: 164, low: 159, close: 162, volume: 1700000 },
    { date: '2026-01-09', open: 162, high: 166, low: 161, close: 164, volume: 1800000 },
    { date: '2026-01-10', open: 164, high: 168, low: 163, close: 166, volume: 1900000 },
    { date: '2026-01-11', open: 166, high: 170, low: 165, close: 168, volume: 2000000 },
    { date: '2026-01-12', open: 168, high: 172, low: 167, close: 170, volume: 2100000 },
    { date: '2026-01-13', open: 170, high: 174, low: 169, close: 172, volume: 2200000 },
    { date: '2026-01-14', open: 172, high: 176, low: 171, close: 174, volume: 2300000 },
    { date: '2026-01-15', open: 174, high: 178, low: 173, close: 176, volume: 2400000 },
  ];

  it('renders no data message when data is empty', () => {
    render(<AdvancedIndicatorsChart data={[]} />);
    expect(screen.getByText('データなし')).toBeInTheDocument();
  });

  it('renders Stochastic Oscillator when showStochastic is true', () => {
    render(
      <AdvancedIndicatorsChart
        data={mockData}
        showStochastic={true}
        showADX={false}
        showWilliamsR={false}
      />
    );
    expect(screen.getByText('Stochastic Oscillator')).toBeInTheDocument();
  });

  it('renders ADX when showADX is true', () => {
    render(
      <AdvancedIndicatorsChart
        data={mockData}
        showStochastic={false}
        showADX={true}
        showWilliamsR={false}
      />
    );
    expect(screen.getByText('ADX (トレンド強度)')).toBeInTheDocument();
  });

  it('renders Williams %R when showWilliamsR is true', () => {
    render(
      <AdvancedIndicatorsChart
        data={mockData}
        showStochastic={false}
        showADX={false}
        showWilliamsR={true}
      />
    );
    expect(screen.getByText('Williams %R')).toBeInTheDocument();
  });

  it('renders all indicators when all are enabled', () => {
    render(
      <AdvancedIndicatorsChart
        data={mockData}
        showStochastic={true}
        showADX={true}
        showWilliamsR={true}
      />
    );
    expect(screen.getByText('Stochastic Oscillator')).toBeInTheDocument();
    expect(screen.getByText('ADX (トレンド強度)')).toBeInTheDocument();
    expect(screen.getByText('Williams %R')).toBeInTheDocument();
  });

  it('does not render any indicators when all are disabled', () => {
    render(
      <AdvancedIndicatorsChart
        data={mockData}
        showStochastic={false}
        showADX={false}
        showWilliamsR={false}
      />
    );
    expect(screen.queryByText('Stochastic Oscillator')).not.toBeInTheDocument();
    expect(screen.queryByText('ADX (トレンド強度)')).not.toBeInTheDocument();
    expect(screen.queryByText('Williams %R')).not.toBeInTheDocument();
  });
});
