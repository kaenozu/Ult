/**
 * Chart configuration constants
 */
export const CHART_CONFIG = {
  COLORS: {
    UP: '#26a69a',      // Green
    DOWN: '#ef5350',    // Red
    VOLUME_UP: 'rgba(38, 166, 154, 0.5)',
    VOLUME_DOWN: 'rgba(239, 83, 80, 0.5)',
    SMA_5: '#2196f3',
    SMA_25: '#ff9800',
    SMA_75: '#9c27b0',
  },
  DEFAULT_INTERVAL: '1d',
  DEFAULT_PERIOD: '1y',
} as const;
