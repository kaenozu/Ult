/**
 * ML Worker Service
 * 
 * Web Workerを使用した非同期ML予測サービス
 * メインスレッドをブロックせずに重い計算を実行
 */

<<<<<<< HEAD
import { useEffect, useRef, useCallback, useState } from 'react';
import { devLog, devWarn, devError } from '@/app/lib/utils/logger';
=======

import { useEffect, useRef, useCallback, useState } from 'react';
import { devWarn, devError } from '@/app/lib/utils/dev-logger';
>>>>>>> origin/main

interface MLPredictionRequest {
  id: string;
  modelType: 'LSTM' | 'GRU' | 'FF';
  features: number[];
}

interface MLPredictionResult {
  id: string;
  prediction: number;
  duration: number;
}

interface MLWorkerState {
  isReady: boolean;
  isProcessing: boolean;
  queueSize: number;
}

/**
 * Web WorkerベースのML予測マネージャー
 */
export class MLWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: MLPredictionResult) => void;
      reject: (error: Error) => void;
      startTime: number;
    }
  >();
  private messageQueue: MLPredictionRequest[] = [];
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // パフォーマンスメトリクス
  private metrics = {
    totalRequests: 0,
    averageDuration: 0,
    workerErrors: 0,
  };

  constructor() {
    this.initializeWorker();
  }

  /**
   * Web Workerを初期化
   */
  private initializeWorker(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Workerを動的に作成
        const workerCode = this.getWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        // 初期化メッセージを送信
        const initId = `init_${Date.now()}`;
        this.pendingRequests.set(initId, {
          resolve: () => {
            this.isInitialized = true;
            resolve();
          },
          reject,
          startTime: performance.now(),
        });

        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);

        this.worker.postMessage({
          id: initId,
          type: 'INITIALIZE',
          payload: {},
        });
      } catch (error) {
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Workerコードを取得（ビルド時にインライン化）
   */
  private getWorkerCode(): string {
    // 実際の環境では、ビルド時にworkerファイルを読み込む
    // ここでは簡潔化のため、実際のファイルパスを返す
    return `
      // Web Worker code will be loaded from ml-prediction.worker.ts
      // In production, this should be the bundled worker code
      self.postMessage({ id: 'fallback', type: 'INITIALIZED', payload: {} });
    `;
  }

  /**
   * Workerからのメッセージを処理
   */
  private handleMessage(event: MessageEvent): void {
    const { id, type, payload } = event.data;
    const pending = this.pendingRequests.get(id);

    if (!pending) return;

    const duration = performance.now() - pending.startTime;
    this.pendingRequests.delete(id);

    if (type === 'ERROR') {
      this.metrics.workerErrors++;
      pending.reject(new Error(payload.error || 'Worker error'));
    } else if (type === 'PREDICT_RESULT') {
      this.updateMetrics(duration);
      pending.resolve({
        id,
        prediction: payload.prediction,
        duration,
      });
    } else if (type === 'INITIALIZED') {
      pending.resolve({
        id,
        prediction: 0,
        duration,
      });
    }

    // キューに残っているリクエストを処理
    this.processQueue();
  }

  /**
   * Workerエラーを処理
   */
  private handleError(error: ErrorEvent): void {
    devError('[MLWorkerManager] Worker error:', error);
    this.metrics.workerErrors++;

    // 保留中の全リクエストを拒否
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Worker failed'));
    });
    this.pendingRequests.clear();

    // Workerを再起動
    this.terminate();
    this.initializeWorker();
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(duration: number): void {
    this.metrics.totalRequests++;
    // 移動平均
    this.metrics.averageDuration =
      (this.metrics.averageDuration * (this.metrics.totalRequests - 1) +
        duration) /
      this.metrics.totalRequests;
  }

  /**
   * キューを処理
   */
  private processQueue(): void {
    if (
      !this.worker ||
      !this.isInitialized ||
      this.pendingRequests.size > 0 ||
      this.messageQueue.length === 0
    ) {
      return;
    }

    const request = this.messageQueue.shift();
    if (!request) return;

    this.sendToWorker(request);
  }

  /**
   * Workerにリクエストを送信
   */
  private sendToWorker(request: MLPredictionRequest): void {
    if (!this.worker) {
      this.messageQueue.push(request);
      return;
    }

    const pending = this.pendingRequests.get(request.id);
    if (!pending) return;

    this.worker.postMessage({
      id: request.id,
      type: 'PREDICT',
      payload: {
        modelType: request.modelType,
        features: request.features,
      },
    });
  }

  /**
   * 予測を実行（非同期）
   */
  async predict(
    modelType: 'LSTM' | 'GRU' | 'FF',
    features: number[]
  ): Promise<number> {
    await this.initializeWorker();

    const id = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const startTime = performance.now();

      this.pendingRequests.set(id, {
        resolve: (result) => resolve(result.prediction),
        reject,
        startTime,
      });

      const request: MLPredictionRequest = {
        id,
        modelType,
        features,
      };

      // 現在処理中のリクエストがない場合は直接送信
      if (this.pendingRequests.size === 1) {
        this.sendToWorker(request);
      } else {
        // キューに追加
        this.messageQueue.push(request);
      }
    });
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * ワーカーの状態を取得
   */
  getState(): MLWorkerState {
    return {
      isReady: this.isInitialized,
      isProcessing: this.pendingRequests.size > 0,
      queueSize: this.messageQueue.length,
    };
  }

  /**
   * Workerを終了
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
    this.pendingRequests.clear();
    this.messageQueue = [];
  }
}

// シングルトンインスタンス
let mlWorkerManager: MLWorkerManager | null = null;

export function getMLWorkerManager(): MLWorkerManager {
  if (!mlWorkerManager) {
    mlWorkerManager = new MLWorkerManager();
  }
  return mlWorkerManager;
}

/**
 * React Hook for ML Worker predictions
 */
export function useMLWorkerPrediction() {
  const [state, setState] = useState<MLWorkerState>(() => getMLWorkerManager().getState());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 状態を定期的に更新
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setState(getMLWorkerManager().getState());
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const predict = useCallback(
    async (modelType: 'LSTM' | 'GRU' | 'FF', features: number[]) => {
      return getMLWorkerManager().predict(modelType, features);
    },
    []
  );

  const getMetrics = useCallback(() => {
    return getMLWorkerManager().getMetrics();
  }, []);

  return {
    predict,
    getMetrics,
    state,
  };
}

/**
 * フォールバック: Workerが使えない場合はメインスレッドで実行
 */
export async function predictWithFallback(
  modelType: 'LSTM' | 'GRU' | 'FF',
  features: number[]
): Promise<number> {
  try {
    const manager = getMLWorkerManager();
    return await manager.predict(modelType, features);
  } catch (error) {
    devWarn('[MLWorker] Falling back to main thread:', error);

    // フォールバック: 簡易的な予測
    // 実際の実装では、メインスレッドでもTensorFlowを読み込む
    const weights = features.map((_, i) => 1 / (i + 1));
    const sum = features.reduce((acc, val, i) => acc + val * weights[i], 0);
    return sum / features.length;
  }
}
