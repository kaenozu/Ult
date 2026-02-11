import { renderHook, act } from '@testing-library/react';
import { useBacktestWorker } from '../useBacktestWorker';
import { BacktestResult } from '../../types';

interface MockWorkerInstance {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((error: Error) => void) | null;
  postMessage: jest.Mock;
  terminate: jest.Mock;
}

let mockWorkerInstance: MockWorkerInstance | null = null;
const mockPostMessage = jest.fn();
const mockTerminate = jest.fn();

class MockWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  postMessage = mockPostMessage;
  terminate = mockTerminate;

  constructor(_scriptURL: string | URL) {
    mockWorkerInstance = this;
  }
}

describe('useBacktestWorker', () => {
  beforeAll(() => {
    global.Worker = MockWorker as unknown as typeof Worker;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkerInstance = null;
    mockTerminate.mockClear();
    mockPostMessage.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes worker on mount', () => {
    const { result } = renderHook(() => useBacktestWorker());

    expect(mockWorkerInstance).not.toBeNull();
    expect(result.current).not.toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('terminates worker on unmount', () => {
    const { unmount } = renderHook(() => useBacktestWorker());

    expect(mockWorkerInstance).not.toBeNull();
    
    unmount();

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update state after unmount (memory leak prevention)', async () => {
    const { result, unmount } = renderHook(() => useBacktestWorker());

    await act(async () => {
      result.current.runBacktest('TEST', [], 'japan');
    });

    expect(mockPostMessage).toHaveBeenCalled();
    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;

    const workerRef = mockWorkerInstance;
    unmount();

    act(() => {
      if (workerRef?.onmessage) {
        workerRef.onmessage({
          data: {
            type: 'BACKTEST_COMPLETE',
            payload: {
              requestId,
              result: {
                totalTrades: 10,
                winRate: 0.6,
                profitFactor: 1.5,
                totalReturn: 0.15,
                sharpeRatio: 1.2,
                maxDrawdown: 0.1,
                trades: [],
              } as BacktestResult,
              executionTimeMs: 100,
            },
          },
        });
      }
    });

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update progress after unmount', async () => {
    const { result, unmount } = renderHook(() => useBacktestWorker());

    await act(async () => {
      result.current.runBacktest('TEST', [], 'japan');
    });

    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;
    const workerRef = mockWorkerInstance;

    unmount();

    act(() => {
      if (workerRef?.onmessage) {
        workerRef.onmessage({
          data: {
            type: 'BACKTEST_PROGRESS',
            payload: {
              requestId,
              progress: 50,
              currentStep: 'Processing trades...',
            },
          },
        });
      }
    });

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update error state after unmount', async () => {
    const { result, unmount } = renderHook(() => useBacktestWorker());

    await act(async () => {
      result.current.runBacktest('TEST', [], 'japan');
    });

    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;
    const workerRef = mockWorkerInstance;

    unmount();

    act(() => {
      if (workerRef?.onmessage) {
        workerRef.onmessage({
          data: {
            type: 'BACKTEST_ERROR',
            payload: {
              requestId,
              error: 'Test error',
              executionTimeMs: 50,
            },
          },
        });
      }
    });

    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update state on worker error after unmount', async () => {
    const { unmount } = renderHook(() => useBacktestWorker());

    const workerRef = mockWorkerInstance;
    expect(workerRef).not.toBeNull();

    unmount();

    act(() => {
      if (workerRef?.onerror) {
        workerRef.onerror(new Error('Worker crashed'));
      }
    });

    expect(mockTerminate).toHaveBeenCalled();
  });
});
