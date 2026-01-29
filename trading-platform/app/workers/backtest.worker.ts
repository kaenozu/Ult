/**
 * backtest.worker.ts
 * 
 * Web Worker for running backtest calculations off the main thread.
 * This prevents UI blocking during intensive calculations.
 */

import { OHLCV, BacktestResult } from '../types';
import { optimizedAccuracyService } from '../lib/OptimizedAccuracyService';

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
    progress: number; // 0-100
    currentStep: string;
  };
}

type WorkerMessage = BacktestRequest;
type WorkerResponse = BacktestResponse | ProgressUpdate;

/**
 * Send progress update to main thread
 */
function sendProgress(requestId: string, progress: number, currentStep: string): void {
  const message: ProgressUpdate = {
    type: 'BACKTEST_PROGRESS',
    payload: {
      requestId,
      progress,
      currentStep
    }
  };
  self.postMessage(message);
}

/**
 * Send completion response to main thread
 */
function sendComplete(requestId: string, result: BacktestResult, executionTimeMs: number): void {
  const message: BacktestResponse = {
    type: 'BACKTEST_COMPLETE',
    payload: {
      requestId,
      result,
      executionTimeMs
    }
  };
  self.postMessage(message);
}

/**
 * Send error response to main thread
 */
function sendError(requestId: string, error: string, executionTimeMs: number): void {
  const message: BacktestResponse = {
    type: 'BACKTEST_ERROR',
    payload: {
      requestId,
      error,
      executionTimeMs
    }
  };
  self.postMessage(message);
}

/**
 * Run backtest with progress tracking
 */
async function runBacktestWithProgress(
  symbol: string,
  data: OHLCV[],
  market: 'japan' | 'usa',
  requestId: string
): Promise<BacktestResult> {
  // Step 1: Parameter optimization (30% of progress)
  sendProgress(requestId, 10, 'パラメータ最適化中...');
  
  // Get optimized params (this may involve calculation or cache hit)
  const startTime = performance.now();
  const optimizedParams = optimizedAccuracyService.getOptimizedParams(symbol, data, market);
  const optimizationTime = performance.now() - startTime;
  
  sendProgress(requestId, 30, `パラメータ最適化完了 (RSI=${optimizedParams.rsiPeriod}, SMA=${optimizedParams.smaPeriod})`);
  
  // Step 2: Running backtest (30-90% of progress)
  sendProgress(requestId, 40, 'バックテスト実行中...');
  
  // Note: The actual backtest runs in chunks, but for simplicity we run it all at once
  // In a more advanced implementation, we could chunk the calculation and send progress updates
  const result = optimizedAccuracyService.runOptimizedBacktest(symbol, data, market);
  
  sendProgress(requestId, 90, '統計情報計算中...');
  
  // Step 3: Finalizing (90-100% of progress)
  sendProgress(requestId, 100, '完了');
  
  return result;
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  if (type !== 'RUN_BACKTEST') {
    console.error('[BacktestWorker] Unknown message type:', type);
    return;
  }
  
  const { symbol, data, market, requestId } = payload;
  const startTime = performance.now();
  
  try {
    console.log(`[BacktestWorker] Starting backtest for ${symbol} with ${data.length} data points`);
    
    // Validate input
    if (!symbol || !data || data.length === 0) {
      throw new Error('Invalid input: symbol and data are required');
    }
    
    if (data.length < 60) {
      throw new Error('Insufficient data: at least 60 data points required');
    }
    
    // Run backtest with progress tracking
    const result = await runBacktestWithProgress(symbol, data, market, requestId);
    
    const executionTime = performance.now() - startTime;
    console.log(`[BacktestWorker] Backtest completed in ${executionTime.toFixed(2)}ms`);
    
    // Send completion response
    sendComplete(requestId, result, executionTime);
    
  } catch (error) {
    const executionTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[BacktestWorker] Backtest failed:', errorMessage);
    sendError(requestId, errorMessage, executionTime);
  }
};

/**
 * Handle errors that occur in the worker
 */
self.onerror = (error: string | Event) => {
  const errorMessage = typeof error === 'string' ? error : (error as ErrorEvent).message;
  console.error('[BacktestWorker] Worker error:', errorMessage);
  // Note: We can't send a response here without a requestId
  // In production, you might want to track active requests and notify them
};

/**
 * Handle unhandled promise rejections
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[BacktestWorker] Unhandled rejection:', event.reason);
  event.preventDefault();
};

// Export empty object to make this a module
export {};
