/**
 * Pipeline Validation Functions
 */

import { ModelConfig, TrainingData } from '../types';
import { VALIDATION_LIMITS, TrainingLogs } from './types';

export function isTrainingLogs(logs: unknown): logs is TrainingLogs {
  return logs !== null && typeof logs === 'object' && typeof (logs as TrainingLogs).loss === 'number';
}

export function validateModelConfig(config: ModelConfig): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: must be a valid object');
  }

  if (typeof config.sequenceLength !== 'number' ||
      !Number.isInteger(config.sequenceLength) ||
      config.sequenceLength < VALIDATION_LIMITS.MIN_SEQUENCE_LENGTH ||
      config.sequenceLength > VALIDATION_LIMITS.MAX_SEQUENCE_LENGTH) {
    throw new Error(
      `Invalid sequenceLength: must be an integer between ${VALIDATION_LIMITS.MIN_SEQUENCE_LENGTH} and ${VALIDATION_LIMITS.MAX_SEQUENCE_LENGTH}`
    );
  }

  if (typeof config.inputFeatures !== 'number' ||
      !Number.isInteger(config.inputFeatures) ||
      config.inputFeatures < VALIDATION_LIMITS.MIN_INPUT_FEATURES ||
      config.inputFeatures > VALIDATION_LIMITS.MAX_INPUT_FEATURES) {
    throw new Error(
      `Invalid inputFeatures: must be an integer between ${VALIDATION_LIMITS.MIN_INPUT_FEATURES} and ${VALIDATION_LIMITS.MAX_INPUT_FEATURES}`
    );
  }

  if (typeof config.epochs !== 'number' ||
      !Number.isInteger(config.epochs) ||
      config.epochs < VALIDATION_LIMITS.MIN_EPOCHS ||
      config.epochs > VALIDATION_LIMITS.MAX_EPOCHS) {
    throw new Error(
      `Invalid epochs: must be an integer between ${VALIDATION_LIMITS.MIN_EPOCHS} and ${VALIDATION_LIMITS.MAX_EPOCHS}`
    );
  }

  if (typeof config.batchSize !== 'number' ||
      !Number.isInteger(config.batchSize) ||
      config.batchSize < VALIDATION_LIMITS.MIN_BATCH_SIZE ||
      config.batchSize > VALIDATION_LIMITS.MAX_BATCH_SIZE) {
    throw new Error(
      `Invalid batchSize: must be an integer between ${VALIDATION_LIMITS.MIN_BATCH_SIZE} and ${VALIDATION_LIMITS.MAX_BATCH_SIZE}`
    );
  }

  if (typeof config.outputSize !== 'number' ||
      !Number.isInteger(config.outputSize) ||
      config.outputSize < VALIDATION_LIMITS.MIN_OUTPUT_SIZE ||
      config.outputSize > VALIDATION_LIMITS.MAX_OUTPUT_SIZE) {
    throw new Error(
      `Invalid outputSize: must be an integer between ${VALIDATION_LIMITS.MIN_OUTPUT_SIZE} and ${VALIDATION_LIMITS.MAX_OUTPUT_SIZE}`
    );
  }

  if (typeof config.learningRate !== 'number' ||
      !isFinite(config.learningRate) ||
      config.learningRate < VALIDATION_LIMITS.MIN_LEARNING_RATE ||
      config.learningRate > VALIDATION_LIMITS.MAX_LEARNING_RATE) {
    throw new Error(
      `Invalid learningRate: must be a number between ${VALIDATION_LIMITS.MIN_LEARNING_RATE} and ${VALIDATION_LIMITS.MAX_LEARNING_RATE}`
    );
  }

  if (config.dropoutRate !== undefined) {
    if (typeof config.dropoutRate !== 'number' ||
        !isFinite(config.dropoutRate) ||
        config.dropoutRate < VALIDATION_LIMITS.MIN_DROPOUT_RATE ||
        config.dropoutRate > VALIDATION_LIMITS.MAX_DROPOUT_RATE) {
      throw new Error(
        `Invalid dropoutRate: must be a number between ${VALIDATION_LIMITS.MIN_DROPOUT_RATE} and ${VALIDATION_LIMITS.MAX_DROPOUT_RATE}`
      );
    }
  }

  if (config.lstmUnits !== undefined) {
    if (!Array.isArray(config.lstmUnits) || config.lstmUnits.length === 0) {
      throw new Error('Invalid lstmUnits: must be a non-empty array');
    }

    for (const units of config.lstmUnits) {
      if (typeof units !== 'number' ||
          !Number.isInteger(units) ||
          units < VALIDATION_LIMITS.MIN_LSTM_UNITS ||
          units > VALIDATION_LIMITS.MAX_LSTM_UNITS) {
        throw new Error(
          `Invalid LSTM units value: must be an integer between ${VALIDATION_LIMITS.MIN_LSTM_UNITS} and ${VALIDATION_LIMITS.MAX_LSTM_UNITS}`
        );
      }
    }
  }

  if (!['LSTM', 'Transformer'].includes(config.modelType)) {
    throw new Error('Invalid modelType: must be either "LSTM" or "Transformer"');
  }
}

export function validateTrainingData(data: TrainingData): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid training data: must be a valid object');
  }

  if (!Array.isArray(data.features) || !Array.isArray(data.labels)) {
    throw new Error('Invalid training data: features and labels must be arrays');
  }

  if (data.features.length !== data.labels.length) {
    throw new Error('Invalid training data: features and labels must have the same length');
  }

  if (data.features.length < VALIDATION_LIMITS.MIN_TRAINING_DATA_SIZE) {
    throw new Error(
      `Insufficient training data: minimum ${VALIDATION_LIMITS.MIN_TRAINING_DATA_SIZE} samples required`
    );
  }

  if (data.features.length > VALIDATION_LIMITS.MAX_TRAINING_DATA_SIZE) {
    throw new Error(
      `Training data too large: maximum ${VALIDATION_LIMITS.MAX_TRAINING_DATA_SIZE} samples allowed`
    );
  }

  for (let i = 0; i < data.labels.length; i++) {
    if (typeof data.labels[i] !== 'number' || !isFinite(data.labels[i])) {
      throw new Error(`Invalid label at index ${i}: must be a finite number`);
    }
  }
}

export function sanitizeModelId(modelId: string): string {
  if (!modelId || typeof modelId !== 'string') {
    throw new Error('Invalid modelId: must be a non-empty string');
  }

  const sanitized = modelId.replace(/[^a-zA-Z0-9_-]/g, '');

  if (sanitized.length === 0) {
    throw new Error('Invalid modelId: must contain at least one alphanumeric character');
  }

  if (sanitized.length > 100) {
    throw new Error('Invalid modelId: maximum length is 100 characters');
  }

  return sanitized;
}

export function validateInputData(
  inputData: number[][],
  config: ModelConfig | null
): void {
  if (!Array.isArray(inputData) || inputData.length === 0) {
    throw new Error('Invalid input data: must be a non-empty 2D array');
  }

  if (inputData.length > 1000) {
    throw new Error(
      `Input too large: maximum 1000 sequences allowed, got ${inputData.length}`
    );
  }

  if (config && inputData.length !== config.sequenceLength) {
    throw new Error(
      `Invalid input sequence length: expected ${config.sequenceLength}, got ${inputData.length}`
    );
  }

  for (let i = 0; i < inputData.length; i++) {
    if (!Array.isArray(inputData[i])) {
      throw new Error(`Invalid input at timestep ${i}: must be an array`);
    }

    if (config && inputData[i].length !== config.inputFeatures) {
      throw new Error(
        `Invalid feature count at timestep ${i}: expected ${config.inputFeatures}, got ${inputData[i].length}`
      );
    }

    for (let j = 0; j < inputData[i].length; j++) {
      const value = inputData[i][j];
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(
          `Invalid value at timestep ${i}, feature ${j}: must be a finite number, got ${value}`
        );
      }
    }
  }
}
