/**
 * useBacktestWorker.ts
 * 
 * Custom hook for running backtest calculations in a Web Worker.
 * Provides a clean API for components to use the backtest worker.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { OHLCV, BacktestResult } from '../types';

// Worker message types
interface BacktestRequest {
  type: 'RUN_BACKTEST';
  payload: {
    symbol: string;
    data: OHLCV[];
    market: 'japan' | 'usa';
    requestId: string;
  };
}

interface BacktestResponse {
  type: 'BACKTEST_COMPLETE' | 'BACKTEST_ERROR';
  payload: {
    requestId: string;
    result?: BacktestResult;
    error?: string;
    executionTimeMs: number;
  };
}

interface ProgressUpdate {
  type: 'BACKTEST_PROGRESS';
  payload: {
    requestId: string;
    progress: number;
    currentStep: string;
  };
}

type WorkerResponse = BacktestResponse | ProgressUpdate;

export interface UseBacktestWorkerReturn {
  /**
   * Run a backtest calculation
   */
  runBacktest: (symbol: string, data: OHLCV[], market: 'japan' | 'usa') => Promise<BacktestResult>;
  
  /**
   * Cancel the current backtest
   */
  cancelBacktest: () => void;
  
  /**
   * Whether a backtest is currently running
   */
  isRunning: boolean;
  
  /**
   * Current progress (0-100)
   */
  progress: number;
  
  /**
   * Current step description
   */
  currentStep: string;
  
  /**
   * Error message if the backtest failed
   */
  error: string | null;
  
  /**
   * Execution time of the last backtest in milliseconds
   */
  executionTime: number | null;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for running backtest calculations in a Web Worker
 */
export function useBacktestWorker(): UseBacktestWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestRef = useRef<{
    requestId: string;
    resolve: (result: BacktestResult) => void;
    reject: (error: Error) => void;
  } | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Initialize worker
  useEffect(() => {
    let isMounted = true;
    
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/backtest.worker.ts', import.meta.url)
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'BACKTEST_PROGRESS':
          if (isMounted) {
            setProgress(payload.progress);
            setCurrentStep(payload.currentStep);
          }
          break;

        case 'BACKTEST_COMPLETE':
          if (isMounted && pendingRequestRef.current?.requestId === payload.requestId) {
            setIsRunning(false);
            setProgress(100);
            setExecutionTime(payload.executionTimeMs);
            pendingRequestRef.current.resolve(payload.result!);
            pendingRequestRef.current = null;
          }
          break;

        case 'BACKTEST_ERROR':
          if (isMounted && pendingRequestRef.current?.requestId === payload.requestId) {
            setIsRunning(false);
            setError(payload.error || 'Unknown error');
            pendingRequestRef.current.reject(new Error(payload.error || 'Unknown error'));
            pendingRequestRef.current = null;
          }
          break;
      }
    };

    // Handle worker errors
    workerRef.current.onerror = (error) => {
      console.error('[useBacktestWorker] Worker error:', error);
      if (isMounted) {
        setIsRunning(false);
        setError('Worker error occurred');
      }
      
      if (pendingRequestRef.current) {
        pendingRequestRef.current.reject(new Error('Worker error'));
        pendingRequestRef.current = null;
      }
    };

    // Cleanup
    return () => {
      isMounted = false;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Run a backtest calculation
   */
  const runBacktest = useCallback(async (
    symbol: string,
    data: OHLCV[],
    market: 'japan' | 'usa'
  ): Promise<BacktestResult> => {
    // Cancel any pending request
    if (pendingRequestRef.current) {
      pendingRequestRef.current.reject(new Error('Cancelled'));
      pendingRequestRef.current = null;
    }

    // Reset state
    setIsRunning(true);
    setProgress(0);
    setCurrentStep('初期化中...');
    setError(null);
    setExecutionTime(null);

    // Generate request ID
    const requestId = generateRequestId();

    // Create promise
    return new Promise((resolve, reject) => {
      pendingRequestRef.current = { requestId, resolve, reject };

      // Send message to worker
      const message: BacktestRequest = {
        type: 'RUN_BACKTEST',
        payload: {
          symbol,
          data,
          market,
          requestId
        }
      };

      workerRef.current?.postMessage(message);
    });
  }, []);

  /**
   * Cancel the current backtest
   */
  const cancelBacktest = useCallback(() => {
    if (pendingRequestRef.current) {
      pendingRequestRef.current.reject(new Error('Cancelled by user'));
      pendingRequestRef.current = null;
    }
    
    setIsRunning(false);
    setProgress(0);
    setCurrentStep('');
    
    // Terminate and recreate worker to ensure clean state
    workerRef.current?.terminate();
    workerRef.current = new Worker(
      new URL('../workers/backtest.worker.ts', import.meta.url)
    );
  }, []);

  return {
    runBacktest,
    cancelBacktest,
    isRunning,
    progress,
    currentStep,
    error,
    executionTime
  };
}

export default useBacktestWorker;
