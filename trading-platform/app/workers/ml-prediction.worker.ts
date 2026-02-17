/**
 * ML Prediction Web Worker
 * 
 * TensorFlow.jsの予測計算をメインスレッドから分離
 * UIの応答性を維持しながら重い計算を実行
 */

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

// Web Worker内でのTensorFlow動作
let tf: any = null;
const models: Map<string, any> = new Map();

/**
 * TensorFlow.jsを動的にロード
 */
async function loadTensorFlow(): Promise<any> {
  if (tf) return tf;
  
  try {
    // Web Worker内ではdynamic importを使用
    const tensorflow = await import('@tensorflow/tfjs');
    tf = tensorflow;
    
    // CPUバックエンドを設定（Web WorkerではWebGLが使えない場合がある）
    await tf.setBackend('cpu');
    
    return tf;
  } catch (error) {
    console.error('[MLWorker] Failed to load TensorFlow:', error);
    throw error;
  }
}

/**
 * モデルを作成または取得
 */
async function getOrCreateModel(modelType: string, inputShape: number[]): Promise<any> {
  const cacheKey = `${modelType}_${inputShape.join('_')}`;
  
  if (models.has(cacheKey)) {
    return models.get(cacheKey);
  }

  const tensorflow = await loadTensorFlow();
  let model: any;

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
      });
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
      });
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
      });
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

  // 入力データをテンソルに変換
  const input = tensorflow.tensor2d([features]);

  // 予測実行
  const prediction = model.predict(input);
  const result = await prediction.data();

  // メモリ解放
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

  const loss = history.history.loss[history.history.loss.length - 1];
  const accuracy = history.history.mse
    ? history.history.mse[history.history.mse.length - 1]
    : 0;

  // メモリ解放
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
console.log('[MLWorker] Web Worker initialized');
