/**
 * ML Prediction Web Worker
 * 
 * TensorFlow.jsの予測計算をメインスレッドから分離
 * UIの応答性を維持しながら重い計算を実行
 */


import type * as tf from '@tensorflow/tfjs';
import { devLog } from '@/app/lib/utils/dev-logger';

type TensorFlowModule = typeof tf;
type LayersModel = tf.LayersModel;

// Web Worker内での型定義
interface WorkerRequest {
  id: string;
  type: 'PREDICT' | 'TRAIN' | 'INITIALIZE';
  payload: {
    features?: number[];
    modelType?: 'LSTM' | 'GRU' | 'FF';
    data?: number[][];
    labels?: number[];
  };
}

interface WorkerResponse {
  id: string;
  type: 'PREDICT_RESULT' | 'TRAIN_RESULT' | 'INITIALIZED' | 'ERROR';
  payload?: {
    prediction?: number;
    metrics?: {
      loss: number;
      accuracy: number;
    };
    error?: string;
  };
}

let tfInstance: TensorFlowModule | null = null;
let models: Map<string, LayersModel> = new Map();

async function loadTensorFlow(): Promise<TensorFlowModule> {
  if (tfInstance) return tfInstance;
  
  try {
    const tensorflow = await import('@tensorflow/tfjs') as TensorFlowModule;
    tfInstance = tensorflow;
    
    await tfInstance.setBackend('cpu');
    
    return tfInstance;
  } catch (error) {
    throw error;
  }
}

async function getOrCreateModel(modelType: string, inputShape: number[]): Promise<LayersModel> {
  const cacheKey = `${modelType}_${inputShape.join('_')}`;

  if (models.has(cacheKey)) {
    return models.get(cacheKey)!;
  }

  const tensorflow = await loadTensorFlow();
  let model: LayersModel;

  switch (modelType) {
    case 'LSTM':
      model = tensorflow.sequential({
        layers: [
          tensorflow.layers.lstm({
            units: 50,
            returnSequences: false,
            inputShape: inputShape,
          }),
          tensorflow.layers.dense({ units: 25, activation: 'relu' }),
          tensorflow.layers.dense({ units: 1, activation: 'linear' }),
        ],
      }) as LayersModel;
      break;

    case 'GRU':
      model = tensorflow.sequential({
        layers: [
          tensorflow.layers.gru({
            units: 50,
            returnSequences: false,
            inputShape: inputShape,
          }),
          tensorflow.layers.dense({ units: 25, activation: 'relu' }),
          tensorflow.layers.dense({ units: 1, activation: 'linear' }),
        ],
      }) as LayersModel;
      break;

    case 'FF':
    default:
      model = tensorflow.sequential({
        layers: [
          tensorflow.layers.dense({
            units: 64,
            activation: 'relu',
            inputShape: inputShape,
          }),
          tensorflow.layers.dropout({ rate: 0.2 }),
          tensorflow.layers.dense({ units: 32, activation: 'relu' }),
          tensorflow.layers.dense({ units: 1, activation: 'linear' }),
        ],
      }) as LayersModel;
      break;
  }

  model.compile({
    optimizer: tensorflow.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mse'],
  });

  models.set(cacheKey, model);
  return model;
}

/**
 * 予測を実行
 */
async function predict(
  modelType: string,
  features: number[]
): Promise<number> {
  const tensorflow = await loadTensorFlow();
  const model = await getOrCreateModel(modelType, [features.length]);

  const input = tensorflow.tensor2d([features]);

  const prediction = model.predict(input) as tf.Tensor;
  const result = await prediction.data();

  input.dispose();
  prediction.dispose();

  return result[0];
}

/**
 * モデルを訓練
 */
async function train(
  modelType: string,
  data: number[][],
  labels: number[]
): Promise<{ loss: number; accuracy: number }> {
  const tensorflow = await loadTensorFlow();
  
  if (data.length === 0 || labels.length === 0) {
    throw new Error('Training data is empty');
  }

  const model = await getOrCreateModel(modelType, [data[0].length]);

  // データをテンソルに変換
  const xs = tensorflow.tensor2d(data);
  const ys = tensorflow.tensor2d(labels, [labels.length, 1]);

  // 訓練
  const history = await model.fit(xs, ys, {
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 0,
  });

  const lossValue = history.history.loss[history.history.loss.length - 1];
  const mseValue = history.history.mse
    ? history.history.mse[history.history.mse.length - 1]
    : 0;

  const loss = typeof lossValue === 'number' ? lossValue : 0;
  const accuracy = typeof mseValue === 'number' ? mseValue : 0;

  xs.dispose();
  ys.dispose();

  return { loss, accuracy };
}

// Workerメッセージハンドラ
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'INITIALIZE':
        await loadTensorFlow();
        self.postMessage({
          id,
          type: 'INITIALIZED',
          payload: {},
        } as WorkerResponse);
        break;

      case 'PREDICT':
        if (!payload.features || !payload.modelType) {
          throw new Error('Missing features or modelType');
        }
        const prediction = await predict(payload.modelType, payload.features);
        self.postMessage({
          id,
          type: 'PREDICT_RESULT',
          payload: { prediction },
        } as WorkerResponse);
        break;

      case 'TRAIN':
        if (!payload.data || !payload.labels || !payload.modelType) {
          throw new Error('Missing data, labels, or modelType');
        }
        const metrics = await train(
          payload.modelType,
          payload.data,
          payload.labels
        );
        self.postMessage({
          id,
          type: 'TRAIN_RESULT',
          payload: { metrics },
        } as WorkerResponse);
        break;

      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { error: (error as Error).message },
    } as WorkerResponse);
  }
};

// Worker初期化完了を通知
devLog('[MLWorker] Web Worker initialized');
