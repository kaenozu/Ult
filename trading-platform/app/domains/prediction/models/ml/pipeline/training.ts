/**
 * Pipeline Model Building and Training Functions
 */

import * as tf from '@tensorflow/tfjs';
import { devLog } from '@/app/lib/utils/dev-logger';
import { ModelConfig } from '../types';
import { isTrainingLogs } from './validation';

export function buildLSTMModel(config: ModelConfig): tf.LayersModel {
  const model = tf.sequential();
  const lstmUnits = config.lstmUnits || [128, 64, 32];

  model.add(
    tf.layers.lstm({
      units: lstmUnits[0],
      returnSequences: lstmUnits.length > 1,
      inputShape: [config.sequenceLength, config.inputFeatures],
    })
  );

  if (config.dropoutRate) {
    model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  }

  for (let i = 1; i < lstmUnits.length; i++) {
    model.add(
      tf.layers.lstm({
        units: lstmUnits[i],
        returnSequences: i < lstmUnits.length - 1,
      })
    );

    if (config.dropoutRate) {
      model.add(tf.layers.dropout({ rate: config.dropoutRate }));
    }
  }

  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));

  if (config.dropoutRate) {
    model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  }

  model.add(tf.layers.dense({ units: config.outputSize }));

  return model;
}

export function buildTransformerModel(config: ModelConfig): tf.LayersModel {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [config.sequenceLength, config.inputFeatures],
    })
  );

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 256, activation: 'relu' }));

  if (config.dropoutRate) {
    model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  }

  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));

  if (config.dropoutRate) {
    model.add(tf.layers.dropout({ rate: config.dropoutRate }));
  }

  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: config.outputSize }));

  return model;
}

export function compileModel(model: tf.LayersModel, learningRate: number): void {
  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'meanSquaredError',
    metrics: ['mae', 'mse'],
  });
}

export async function trainModel(
  model: tf.LayersModel,
  xTrain: tf.Tensor3D,
  yTrain: tf.Tensor2D,
  xVal: tf.Tensor3D,
  yVal: tf.Tensor2D,
  config: ModelConfig
): Promise<tf.History> {
  const history = await model.fit(xTrain, yTrain, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationData: [xVal, yVal],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (isTrainingLogs(logs)) {
          const loss = logs.loss;
          const valLoss = logs.val_loss ?? logs.valLoss ?? 0;
          devLog(
            `Epoch ${epoch + 1}: loss = ${loss.toFixed(4)}, val_loss = ${valLoss.toFixed(4)}`
          );
        }
      },
    },
    shuffle: true,
  });

  return history;
}

export function disposeTensors(tensors: tf.Tensor[]): void {
  for (const tensor of tensors) {
    tensor.dispose();
  }
}
