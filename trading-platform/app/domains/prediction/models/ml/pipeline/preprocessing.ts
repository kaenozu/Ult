/**
 * Pipeline Preprocessing Functions
 */

import * as tf from '@tensorflow/tfjs';
import { ModelConfig, TrainingData } from '../types';
import { PreparedSequences } from './types';

export function prepareSequences(
  data: TrainingData,
  sequenceLength: number,
  validationSplit: number = 0.2
): PreparedSequences {
  const { features, labels } = data;

  const xData: number[][][] = [];
  const yData: number[][] = [];

  for (let i = sequenceLength; i < features.length; i++) {
    const sequence: number[][] = [];
    for (let j = i - sequenceLength; j < i; j++) {
      sequence.push(featuresToArray(features[j]));
    }
    xData.push(sequence);
    yData.push([labels[i]]);
  }

  const splitIndex = Math.floor(xData.length * (1 - validationSplit));

  const xTrainData = xData.slice(0, splitIndex);
  const yTrainData = yData.slice(0, splitIndex);
  const xValData = xData.slice(splitIndex);
  const yValData = yData.slice(splitIndex);

  const xTrain = tf.tensor3d(xTrainData);
  const yTrain = tf.tensor2d(yTrainData);
  const xVal = tf.tensor3d(xValData);
  const yVal = tf.tensor2d(yValData);

  return { xTrain, yTrain, xVal, yVal };
}

export function featuresToArray(features: unknown): number[] {
  const featureObj = features as Record<string, unknown>;
  const result: number[] = [];

  for (const key in featureObj) {
    const value = featureObj[key];
    if (typeof value === 'number') {
      result.push(value);
    } else if (Array.isArray(value)) {
      result.push(...value);
    }
  }

  return result;
}

export function generateCombinations(paramGrid: Record<string, number[]>): Record<string, number>[] {
  const keys = Object.keys(paramGrid);
  const combinations: Record<string, number>[] = [];

  const generate = (index: number, current: Record<string, number>): void => {
    if (index === keys.length) {
      combinations.push({ ...current });
      return;
    }

    const key = keys[index];
    for (const value of paramGrid[key]) {
      current[key] = value;
      generate(index + 1, current);
    }
  };

  generate(0, {});
  return combinations;
}

export function buildConfigFromParams(
  trainingData: TrainingData,
  params: Record<string, number>
): ModelConfig {
  return {
    modelType: 'LSTM',
    inputFeatures: trainingData.features[0] ? Object.keys(trainingData.features[0]).length : 50,
    sequenceLength: params.sequenceLength || 20,
    outputSize: 1,
    learningRate: params.learningRate || 0.001,
    batchSize: params.batchSize || 32,
    epochs: params.epochs || 50,
    validationSplit: 0.2,
    lstmUnits: params.lstmUnits ? [params.lstmUnits] : [64],
    dropoutRate: params.dropoutRate || 0.2,
  };
}
