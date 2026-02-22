/**
 * ML Training Service
 * 
 * TensorFlow.jsを使用して実際にニューラルネットワークを訓練するパイプライン。
 * 過去の価格データから「N日後に上がるか下がるか」を学習する。
 * 
 * 特徴量: RSI, RSI変化, SMA5/20/50乖離率, モメンタム, 出来高比, 
 *          ボラティリティ, MACD差, BB位置, ATR% (11次元)
 * ラベル: N日後の騰落 (1=上昇, 0=下落)
 */

import * as tf from '@tensorflow/tfjs';
import { OHLCV, TechnicalIndicatorsWithATR } from '../../types';
import { featureEngineeringService, PredictionFeatures } from './feature-engineering-service';
import { calculateRSI, calculateSMA, calculateMACD, calculateBollingerBands, calculateATR } from '../utils';
import { RSI_CONFIG, SMA_CONFIG } from '@/app/constants';

/** 訓練設定 */
export interface TrainingConfig {
    /** 予測先日数（何日後を予測するか） */
    predictionDays: number;
    /** エポック数 */
    epochs: number;
    /** バッチサイズ */
    batchSize: number;
    /** 学習率 */
    learningRate: number;
    /** テストデータ比率 (0-1) */
    testSplit: number;
    /** アップサンプリングの閾値（%）。これ以上の上昇をBUYラベルとする */
    upThreshold: number;
}

/** 訓練結果メトリクス */
export interface TrainingMetrics {
    accuracy: number;
    loss: number;
    valAccuracy: number;
    valLoss: number;
    trainSamples: number;
    testSamples: number;
    trainedAt: number;
    epochsCompleted: number;
    /** Walk-Forward検証結果 */
    walkForwardAccuracy?: number;
}

/** モデルの状態 */
export interface ModelState {
    isTrained: boolean;
    metrics: TrainingMetrics | null;
    modelVersion: string;
}

const DEFAULT_CONFIG: TrainingConfig = {
    predictionDays: 5,
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    testSplit: 0.2,
    upThreshold: 0.5, // 0.5%以上の上昇をBUYとする
};

const FEATURE_COUNT = 11; // PredictionFeaturesの次元数

/**
 * OHLCVデータからテクニカル指標を一括計算する
 */
function calculateIndicators(data: OHLCV[]): TechnicalIndicatorsWithATR {
    const prices = data.map(d => d.close);
    return {
        symbol: '',
        sma5: calculateSMA(prices, 5),
        sma20: calculateSMA(prices, SMA_CONFIG.SHORT_PERIOD),
        sma50: calculateSMA(prices, SMA_CONFIG.MEDIUM_PERIOD),
        rsi: calculateRSI(prices, RSI_CONFIG.DEFAULT_PERIOD),
        macd: calculateMACD(prices),
        bollingerBands: calculateBollingerBands(prices),
        atr: calculateATR(
            data.map(d => d.high),
            data.map(d => d.low),
            data.map(d => d.close),
            RSI_CONFIG.DEFAULT_PERIOD
        ),
    };
}

/**
 * PredictionFeaturesを正規化された数値配列に変換する
 */
function featuresToArray(features: PredictionFeatures): number[] {
    return [
        features.rsi / 100,                           // 0-1
        features.rsiChange / 50,                       // 正規化
        features.sma5 / 10,                            // %ベース
        features.sma20 / 10,
        features.sma50 / 10,
        Math.tanh(features.priceMomentum / 10),        // -1 to 1
        Math.min(features.volumeRatio / 3, 1),         // 0-1にクランプ
        Math.min(features.volatility / 50, 1),         // 0-1にクランプ
        Math.tanh(features.macdSignal),                // -1 to 1
        features.bollingerPosition / 100,              // 0-1
        Math.min(features.atrPercent / 5, 1),          // 0-1にクランプ
    ];
}

/**
 * NaN/Infinityを安全な値に置換する
 */
function sanitizeArray(arr: number[]): number[] {
    return arr.map(v => {
        if (!isFinite(v) || isNaN(v)) return 0;
        return Math.max(-1, Math.min(1, v));
    });
}

export class MLTrainingService {
    private model: tf.LayersModel | null = null;
    private state: ModelState = {
        isTrained: false,
        metrics: null,
        modelVersion: '0.0.0',
    };
    private config: TrainingConfig;

    constructor(config?: Partial<TrainingConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /** 現在のモデル状態を返す */
    getState(): ModelState {
        return { ...this.state };
    }

    /**
     * TensorFlow.jsのニューラルネットモデルを構築する
     * 
     * アーキテクチャ: Dense(64, relu) → Dropout(0.3) → Dense(32, relu) → Dropout(0.2) → Dense(1, sigmoid)
     */
    private buildModel(): tf.LayersModel {
        const model = tf.sequential();

        model.add(tf.layers.dense({
            inputShape: [FEATURE_COUNT],
            units: 64,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
        }));
        model.add(tf.layers.dropout({ rate: 0.3 }));

        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
        }));
        model.add(tf.layers.dropout({ rate: 0.2 }));

        model.add(tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
        }));

        model.compile({
            optimizer: tf.train.adam(this.config.learningRate),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy'],
        });

        return model;
    }

    /**
     * OHLCVデータから教師データ（特徴量 + ラベル）を生成する
     * 
     * ラベル: predictionDays日後の終値が現在より upThreshold% 以上上昇 → 1, それ以外 → 0
     */
    generateTrainingData(data: OHLCV[]): { features: number[][]; labels: number[] } {
        const indicators = calculateIndicators(data);
        const features: number[][] = [];
        const labels: number[] = [];

        // 指標が安定するまでスキップ（最低50日分）
        const startIdx = Math.max(50, SMA_CONFIG.MEDIUM_PERIOD + 1);
        const endIdx = data.length - this.config.predictionDays;

        for (let i = startIdx; i < endIdx; i++) {
            // i日目までのデータで特徴量を計算
            const slice = data.slice(0, i + 1);
            const sliceIndicators = calculateIndicators(slice);

            try {
                const feat = featureEngineeringService.calculateBasicFeatures(slice);
                const featureArray = sanitizeArray(featuresToArray(feat));

                // ラベル: predictionDays日後の騰落
                const currentPrice = data[i].close;
                const futurePrice = data[i + this.config.predictionDays].close;
                const change = ((futurePrice - currentPrice) / currentPrice) * 100;
                const label = change >= this.config.upThreshold ? 1 : 0;

                features.push(featureArray);
                labels.push(label);
            } catch {
                // 指標計算に失敗した場合はスキップ
                continue;
            }
        }

        return { features, labels };
    }

    /**
     * モデルを訓練する
     * 
     * @param data - 訓練に使用するOHLCVデータ（少なくとも200日分推奨）
     * @param onProgress - 進捗コールバック (0-100)
     * @returns 訓練メトリクス
     */
    async train(
        data: OHLCV[],
        onProgress?: (progress: number) => void
    ): Promise<TrainingMetrics> {
        if (data.length < 100) {
            throw new Error(`データ不足: ${data.length}件 (最低100件必要)`);
        }

        onProgress?.(5);

        // 1. 教師データ生成
        const { features, labels } = this.generateTrainingData(data);

        if (features.length < 30) {
            throw new Error(`有効な訓練サンプルが不足: ${features.length}件 (最低30件必要)`);
        }

        onProgress?.(15);

        // 2. Train/Test分割
        const splitIdx = Math.floor(features.length * (1 - this.config.testSplit));
        const trainFeatures = features.slice(0, splitIdx);
        const trainLabels = labels.slice(0, splitIdx);
        const testFeatures = features.slice(splitIdx);
        const testLabels = labels.slice(splitIdx);

        // 3. TensorFlow.jsテンソルに変換
        const xTrain = tf.tensor2d(trainFeatures);
        const yTrain = tf.tensor1d(trainLabels);
        const xTest = tf.tensor2d(testFeatures);
        const yTest = tf.tensor1d(testLabels);

        onProgress?.(20);

        try {
            // 4. モデル構築
            if (this.model) {
                this.model.dispose();
            }
            this.model = this.buildModel();

            // 5. 訓練実行
            const history = await this.model.fit(xTrain, yTrain, {
                epochs: this.config.epochs,
                batchSize: this.config.batchSize,
                validationData: [xTest, yTest],
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch) => {
                        const progress = 20 + (epoch / this.config.epochs) * 70;
                        onProgress?.(Math.round(progress));
                    },
                },
            });

            onProgress?.(90);

            // 6. メトリクス取得
            const lastEpoch = history.history;
            const metrics: TrainingMetrics = {
                accuracy: (lastEpoch['acc'] || lastEpoch['accuracy'])?.slice(-1)[0] as number || 0,
                loss: lastEpoch['loss']?.slice(-1)[0] as number || 0,
                valAccuracy: (lastEpoch['val_acc'] || lastEpoch['val_accuracy'])?.slice(-1)[0] as number || 0,
                valLoss: lastEpoch['val_loss']?.slice(-1)[0] as number || 0,
                trainSamples: trainFeatures.length,
                testSamples: testFeatures.length,
                trainedAt: Date.now(),
                epochsCompleted: this.config.epochs,
            };

            // 7. Walk-Forward検証
            metrics.walkForwardAccuracy = this.walkForwardValidation(testFeatures, testLabels);

            this.state = {
                isTrained: true,
                metrics,
                modelVersion: `1.0.${Date.now()}`,
            };

            onProgress?.(100);
            return metrics;
        } finally {
            // テンソルの解放
            xTrain.dispose();
            yTrain.dispose();
            xTest.dispose();
            yTest.dispose();
        }
    }

    /**
     * Walk-Forward検証
     * テストデータの各サンプルで予測精度を検証する
     */
    private walkForwardValidation(testFeatures: number[][], testLabels: number[]): number {
        if (!this.model || testFeatures.length === 0) return 0;

        let correct = 0;
        const xTest = tf.tensor2d(testFeatures);
        const predictions = this.model.predict(xTest) as tf.Tensor;
        const predValues = predictions.dataSync();

        for (let i = 0; i < testLabels.length; i++) {
            const predicted = predValues[i] >= 0.5 ? 1 : 0;
            if (predicted === testLabels[i]) correct++;
        }

        xTest.dispose();
        predictions.dispose();

        return correct / testLabels.length;
    }

    /**
     * 訓練済みモデルで予測する
     * 
     * @param features - 11次元の特徴量
     * @returns 上昇確率 (0-1)
     */
    async predict(features: PredictionFeatures): Promise<{ probability: number; confidence: number }> {
        if (!this.model || !this.state.isTrained) {
            throw new Error('モデルが未訓練です');
        }

        const featureArray = sanitizeArray(featuresToArray(features));
        const input = tf.tensor2d([featureArray]);

        try {
            const output = this.model.predict(input) as tf.Tensor;
            const probability = output.dataSync()[0];
            output.dispose();

            // 信頼度: 予測確率が0.5から離れているほど高い
            const distance = Math.abs(probability - 0.5) * 2; // 0-1
            const modelAccuracy = this.state.metrics?.valAccuracy ?? 0.5;
            const confidence = Math.round(
                (distance * 0.6 + modelAccuracy * 0.4) * 100
            );

            return {
                probability,
                confidence: Math.max(50, Math.min(95, confidence)),
            };
        } finally {
            input.dispose();
        }
    }

    /**
     * モデルをIndexedDBに保存する
     */
    async saveModel(key: string): Promise<void> {
        if (!this.model) throw new Error('保存するモデルがありません');
        await this.model.save(`indexeddb://${key}`);

        // メタデータも保存
        if (typeof window !== 'undefined') {
            localStorage.setItem(`ml-model-meta-${key}`, JSON.stringify(this.state));
        }
    }

    /**
     * モデルをIndexedDBから読み込む
     */
    async loadModel(key: string): Promise<boolean> {
        try {
            this.model = await tf.loadLayersModel(`indexeddb://${key}`);

            // メタデータ復元
            if (typeof window !== 'undefined') {
                const meta = localStorage.getItem(`ml-model-meta-${key}`);
                if (meta) {
                    this.state = JSON.parse(meta);
                }
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * モデルを破棄する
     */
    dispose(): void {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.state = {
            isTrained: false,
            metrics: null,
            modelVersion: '0.0.0',
        };
    }
}

// シングルトンインスタンス
export const mlTrainingService = new MLTrainingService();
