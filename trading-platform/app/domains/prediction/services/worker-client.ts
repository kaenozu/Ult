/**
 * Prediction Worker Client
 * 
 * Web Workerを通じた非同期予測分析の実行を管理
 */

import { Stock, OHLCV } from '@/app/types';
import type { IntegratedPredictionResult } from './integrated-prediction-service';

class PredictionWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { 
    resolve: (result: IntegratedPredictionResult) => void; 
    reject: (error: Error) => void 
  }> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }
  }

  private initializeWorker() {
    try {
      this.worker = new Worker(
        new URL('../../workers/prediction-analysis.worker.ts', import.meta.url)
      );

      this.worker.onmessage = (event) => {
        const { requestId, result, error, success } = event.data;
        const pending = this.pendingRequests.get(requestId);

        if (pending) {
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
          this.pendingRequests.delete(requestId);
        }
      };

      this.worker.onerror = (error) => {
        console.error('[PredictionWorkerClient] Worker error:', error);
      };
    } catch (error) {
      console.error('[PredictionWorkerClient] Failed to initialize worker:', error);
    }
  }

  /**
   * Workerを使用して予測を実行
   */
  async predictOffMainThread(
    stock: Stock,
    data: OHLCV[],
    indexData?: OHLCV[]
  ): Promise<IntegratedPredictionResult> {
    if (!this.worker) {
      // Fallback to main thread if worker is unavailable
      const { integratedPredictionService } = await import('./integrated-prediction-service');
      return integratedPredictionService.generatePrediction(stock, data, indexData);
    }

    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker?.postMessage({
        requestId,
        stock,
        data,
        indexData
      });
    });
  }

  /**
   * Workerを終了
   */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const predictionWorkerClient = new PredictionWorkerClient();
