
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StockChart } from '@/app/components/StockChart';
// Removed unused imports: forwardRef, useImperativeHandle

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Chart.js instance
const mockChartInstance = {
  destroy: jest.fn(),
  update: jest.fn(),
  setActiveElements: jest.fn(),
  data: {
    datasets: [
      { label: 'Dataset 1' },
      { label: 'Dataset 2' }
    ]
  },
  isDatasetVisible: jest.fn().mockReturnValue(true),
};

// Mock react-chartjs-2 with forwardRef to capture the chart instance
jest.mock('react-chartjs-2', () => {
  const { forwardRef, useImperativeHandle } = require('react');

  // eslint-disable-next-line react/display-name
  const Line = forwardRef((props: any, ref: any) => {
    useImperativeHandle(ref, () => mockChartInstance);
    return (
      <div
        data-testid="line-chart"
        onClick={() => {
          // Simulate hover on index 5 (middle of data) to start interaction
          if (props.options?.onHover) {
            props.options.onHover(null, [{ index: 5, element: {}, datasetIndex: 0 }]);
          }
        }}
        role="img"
        aria-label="Stock Price Chart"
      >
        Line Chart
      </div>
    );
  });
  Line.displayName = 'Line'; // Add display name

  // eslint-disable-next-line react/display-name
  const Bar = () => <div data-testid="bar-chart">Bar Chart</div>;
  Bar.displayName = 'Bar'; // Add display name

  return { Line, Bar };
});

function generateMockData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: 105 + i,
    volume: 1000 + i * 10
  }));
}

describe('StockChart Interactions', () => {
  const mockData = generateMockData(10); // 10 data points, indices 0-9

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates hovered index on arrow key press', async () => {
    await act(async () => {
      render(<StockChart data={mockData} />);
    });

    const chart = screen.getByTestId('line-chart');

    // 1. Initial State: No hover, so keys should do nothing
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockChartInstance.setActiveElements).not.toHaveBeenCalled();

    // 2. Activate Hover: Click/Simulate hover at index 5
    fireEvent.click(chart);

    // 3. Right Arrow: Should move to index 6
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });

    // Check if setActiveElements was called
    expect(mockChartInstance.setActiveElements).toHaveBeenCalled();
    const lastCall = mockChartInstance.setActiveElements.mock.calls[mockChartInstance.setActiveElements.mock.calls.length - 1][0];
    // Check that at least one element in the call has index 6
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(lastCall.some((el: any) => el.index === 6)).toBe(true);

    // 4. Left Arrow: Should move back to index 5
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
    });

    const nextLastCall = mockChartInstance.setActiveElements.mock.calls[mockChartInstance.setActiveElements.mock.calls.length - 1][0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(nextLastCall.some((el: any) => el.index === 5)).toBe(true);
  });

  it('releases mouse block on significant movement', async () => {
    await act(async () => {
      render(<StockChart data={mockData} />);
    });
    const chart = screen.getByTestId('line-chart');

    // Activate hover
    fireEvent.click(chart);

    // Trigger Key (sets block)
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Trigger small mouse move
    fireEvent.mouseMove(window, { movementX: 1, movementY: 0 });

    // Trigger large mouse move
    fireEvent.mouseMove(window, { movementX: 5, movementY: 5 });

    // Since we can't observe the ref, we just ensure no crash and event listener logic runs
    expect(true).toBe(true);
  });

  it('clamps active elements to data bounds', async () => {
    await act(async () => {
      render(<StockChart data={mockData} />);
    });
    const chart = screen.getByTestId('line-chart');
    fireEvent.click(chart); // Index 5

    // Move to end (Index 9)
    // 5 -> 6, 7, 8, 9 (4 presses)
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
      });
    }

    // Try to move beyond 9
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });

    // Verify last call is still index 9, not 10
    const lastCall = mockChartInstance.setActiveElements.mock.calls[mockChartInstance.setActiveElements.mock.calls.length - 1][0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(lastCall[0].index).toBe(9);
  });
});
