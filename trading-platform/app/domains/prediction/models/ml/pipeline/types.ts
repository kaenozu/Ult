/**
 * Pipeline Types and Validation Constants
 */

export const VALIDATION_LIMITS = {
  MAX_SEQUENCE_LENGTH: 1000,
  MIN_SEQUENCE_LENGTH: 1,
  MAX_INPUT_FEATURES: 500,
  MIN_INPUT_FEATURES: 1,
  MAX_EPOCHS: 1000,
  MIN_EPOCHS: 1,
  MAX_BATCH_SIZE: 1024,
  MIN_BATCH_SIZE: 1,
  MAX_LSTM_UNITS: 1024,
  MIN_LSTM_UNITS: 1,
  MAX_OUTPUT_SIZE: 100,
  MIN_OUTPUT_SIZE: 1,
  MAX_LEARNING_RATE: 1.0,
  MIN_LEARNING_RATE: 0.0000001,
  MAX_DROPOUT_RATE: 0.9,
  MIN_DROPOUT_RATE: 0.0,
  MAX_TRAINING_DATA_SIZE: 1000000,
  MIN_TRAINING_DATA_SIZE: 10,
} as const;

export interface TrainingLogs {
  loss: number;
  val_loss?: number;
  valLoss?: number;
}

export interface PreparedSequences {
  xTrain: import('@tensorflow/tfjs').Tensor3D;
  yTrain: import('@tensorflow/tfjs').Tensor2D;
  xVal: import('@tensorflow/tfjs').Tensor3D;
  yVal: import('@tensorflow/tfjs').Tensor2D;
}

export interface EvaluationResult {
  loss: number;
  mae: number;
  mse: number;
}

export interface HyperparameterResult {
  bestParams: Record<string, number>;
  bestScore: number;
}
