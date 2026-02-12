import { realTimeDataService } from '../RealTimeDataService';
import { spawn } from 'child_process';

// Mock child_process.spawn
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

describe('RealTimeDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache if possible or use a fresh instance
    (realTimeDataService as any).cache.clear();
  });

  it('should fetch quote from scraper when not in cache', async () => {
    const mockQuote = {
      symbol: '7203',
      price: 3500.5,
      bid: 3500,
      ask: 3501,
      timestamp: new Date().toISOString(),
    };

    const mockSpawn = {
      stdout: {
        on: jest.fn((event, cb) => {
          if (event === 'data') cb(JSON.stringify(mockQuote));
        }),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn((event, cb) => {
        if (event === 'close') cb(0);
      }),
    };

    (spawn as jest.Mock).mockReturnValue(mockSpawn);

    const result = await realTimeDataService.fetchQuote('7203');

    expect(result).toEqual(mockQuote);
    expect(spawn).toHaveBeenCalledWith('python3', [expect.any(String), '7203']);
  });

  it('should return cached value if available', async () => {
    const mockQuote = {
      symbol: '7203',
      price: 3500.5,
      bid: 3500,
      ask: 3501,
      timestamp: new Date().toISOString(),
    };

    // First call to populate cache
    const mockSpawn = {
      stdout: {
        on: jest.fn((event, cb) => {
          if (event === 'data') cb(JSON.stringify(mockQuote));
        }),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn((event, cb) => {
        if (event === 'close') cb(0);
      }),
    };
    (spawn as jest.Mock).mockReturnValue(mockSpawn);

    await realTimeDataService.fetchQuote('7203');
    const result = await realTimeDataService.fetchQuote('7203');

    expect(result).toEqual(mockQuote);
    expect(spawn).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should throw error if scraper fails', async () => {
    const mockSpawn = {
      stdout: { on: jest.fn() },
      stderr: {
        on: jest.fn((event, cb) => {
          if (event === 'data') cb('Scraper error details');
        }),
      },
      on: jest.fn((event, cb) => {
        if (event === 'close') cb(1);
      }),
    };

    (spawn as jest.Mock).mockReturnValue(mockSpawn);

    await expect(realTimeDataService.fetchQuote('7203')).rejects.toThrow('Scraper failed');
  });
});
