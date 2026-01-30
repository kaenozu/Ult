
import React from 'react';
import { render } from '@testing-library/react';
import { SimpleRSIChart } from '../SimpleRSIChart';
import { OHLCV } from '../../types';

// Mock technicalIndicatorService
jest.mock('../../lib/TechnicalIndicatorService', () => ({
  technicalIndicatorService: {
    calculateRSI: jest.fn(() => [50, 60, 70, 40, 30]),
  },
}));

describe('SimpleRSIChart', () => {
  const mockData: OHLCV[] = [
    { date: '2023-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { date: '2023-01-02', open: 102, high: 108, low: 100, close: 106, volume: 1000 },
    { date: '2023-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1000 },
    { date: '2023-01-04', open: 108, high: 112, low: 106, close: 104, volume: 1000 },
    { date: '2023-01-05', open: 104, high: 106, low: 98, close: 100, volume: 1000 },
  ];

  it('renders correctly with data', () => {
    const { container } = render(<SimpleRSIChart data={mockData} />);
    const svg = container.querySelector('svg');
    const polyline = container.querySelector('polyline');

    expect(svg).toBeInTheDocument();
    expect(polyline).toBeInTheDocument();

    // Check if points attribute is set (format "x,y x,y")
    const points = polyline?.getAttribute('points');
    expect(points).toBeTruthy();
    expect(points).toContain(',');
  });

  it('displays the latest RSI value and has accessible attributes', () => {
    const { getByRole, getByText } = render(<SimpleRSIChart data={mockData} />);

    // Check visible text
    expect(getByText('30.0')).toBeInTheDocument();

    // Check accessible attributes
    const chart = getByRole('img');
    expect(chart).toHaveAttribute('aria-label', 'Relative Strength Index chart. Current value: 30.0');
  });

  it('renders null without data', () => {
    const { container } = render(<SimpleRSIChart data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
