/**
 * Intelligence Manager (Parallel Brain Controller)
 * 
 * Web Worker をオーケストレートし、バックグラウンドでの並列分析を管理します。
 */

export class IntelligenceManager {
  private worker: Worker | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Worker の初期化
      this.worker = new Worker(new URL('./IntelligenceWorker.ts', import.meta.url));
    }
  }

  /**
   * 銘柄の統合分析をバックグラウンドで実行する
   */
  async runAsyncAnalysis(symbol: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not supported or initialized'));
        return;
      }

      // Worker からの結果待機
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'RESULT') {
          this.worker?.removeEventListener('message', handler);
          resolve(e.data.data);
        } else if (e.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };

      this.worker.addEventListener('message', handler);

      // 分析リクエストの送信
      this.worker.postMessage({
        type: 'ANALYZE',
        data: { symbol, marketData: data }
      });
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const intelligenceManager = new IntelligenceManager();
