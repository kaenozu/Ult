export const createChart = jest.fn(() => ({
  addSeries: jest.fn(() => ({
    setData: jest.fn(),
    applyOptions: jest.fn(),
    setMarkers: jest.fn(),
  })),
  remove: jest.fn(),
  applyOptions: jest.fn(),
  priceScale: jest.fn(() => ({
    applyOptions: jest.fn(),
  })),
  subscribeCrosshairMove: jest.fn(),
  timeScale: jest.fn(() => ({
    scrollToRealTime: jest.fn(),
  })),
}));

export const CandlestickSeries = 'Candlestick';
export const LineSeries = 'Line';
export const HistogramSeries = 'Histogram';
export const ColorType = { Solid: 'solid' };
export const CrosshairMode = { Normal: 0 };
