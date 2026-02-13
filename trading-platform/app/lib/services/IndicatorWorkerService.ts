import { OHLCV } from '@/app/types';
import { measurePerformance } from '../utils/performance';

/**
 * Worker 連携サービス
 */
export class IndicatorWorkerService {
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function, reject: Function }>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/indicator.worker.ts', import.meta.url));
      this.worker.onmessage = this.handleMessage.bind(this);
    }
  }

  private handleMessage(event: MessageEvent) {
    const { requestId, results, error, success } = event.data;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      if (success) pending.resolve(results);
      else pending.reject(new Error(error));
      this.pendingRequests.delete(requestId);
    }
  }

  async calculate(data: OHLCV[]): Promise<any> {
    if (!this.worker) {
      // Fallback if worker not available
      const { calculateIndicatorsSync } = await import('../../workers/indicator-logic');
      return calculateIndicatorsSync(data);
    }

    return measurePerformance('worker-indicator-calc', () => {
      return new Promise((resolve, reject) => {
        const id = this.requestId++;
        this.pendingRequests.set(id, { resolve, reject });
        this.worker!.postMessage({ data, requestId: id });
      });
    });
  }
}

export const indicatorWorkerService = new IndicatorWorkerService();
