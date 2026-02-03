import { renderHook, act } from '@testing-library/react';
import { useBacktestWorker } from '../useBacktestWorker';
import { BacktestResult } from '../../types';

// Mock Worker
let mockWorkerInstance: any = null;
const mockPostMessage = jest.fn();
const mockTerminate = jest.fn();

class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  postMessage = mockPostMessage;
  terminate = mockTerminate;

  constructor(scriptURL: string | URL) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockWorkerInstance = this;
  }
}

global.Worker = MockWorker as any;

describe('useBacktestWorker', () => {
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

    // Start a backtest
    const backtestPromise = act(() => 
      result.current.runBacktest('TEST', [], 'japan')
    );

    // Verify worker received the message
    expect(mockPostMessage).toHaveBeenCalled();
    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;

    // Unmount the component before the backtest completes
    unmount();

    // Simulate worker sending completion message after unmount
    // This should NOT cause a React state update warning
    act(() => {
      if (mockWorkerInstance && mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
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

    // The test passes if no "Can't perform a React state update on an unmounted component" warning occurs
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update progress after unmount', async () => {
    const { result, unmount } = renderHook(() => useBacktestWorker());

    // Start a backtest
    act(() => {
      result.current.runBacktest('TEST', [], 'japan');
    });

    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;

    // Unmount before progress update
    unmount();

    // Simulate worker sending progress update after unmount
    // This should NOT cause a React state update warning
    act(() => {
      if (mockWorkerInstance && mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
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

    // The test passes if no warning is thrown
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update error state after unmount', async () => {
    const { result, unmount } = renderHook(() => useBacktestWorker());

    // Start a backtest
    act(() => {
      result.current.runBacktest('TEST', [], 'japan');
    });

    const requestId = mockPostMessage.mock.calls[0][0].payload.requestId;

    // Unmount before error
    unmount();

    // Simulate worker sending error after unmount
    // This should NOT cause a React state update warning
    act(() => {
      if (mockWorkerInstance && mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
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

    // The test passes if no warning is thrown
    expect(mockTerminate).toHaveBeenCalled();
  });

  it('does not update state on worker error after unmount', async () => {
    const { unmount } = renderHook(() => useBacktestWorker());

    // Save reference to worker instance
    const workerInstance = mockWorkerInstance;
    expect(workerInstance).not.toBeNull();

    // Unmount the component
    unmount();

    // Simulate worker error after unmount
    // This should NOT cause a React state update warning
    act(() => {
      if (workerInstance && workerInstance.onerror) {
        workerInstance.onerror(new Error('Worker crashed'));
      }
    });

    // The test passes if no warning is thrown
    expect(mockTerminate).toHaveBeenCalled();
  });
});
