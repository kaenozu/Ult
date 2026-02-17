/**
 * Machine Learning Configuration Constants
 * 
 * MLモデルのトレーニングとハイパーパラメータ設定
 * Issue #522 - 定数一元化
 */

/**
 * Default ML model hyperparameters
 */
export const ML_HYPERPARAMETERS = {
  // Training defaults
  DEFAULT_EPOCHS: 50,
  DEFAULT_BATCH_SIZE: 32,
  DEFAULT_VALIDATION_SPLIT: 0.2,
  DEFAULT_LEARNING_RATE: 0.001,
  DEFAULT_DROPOUT_RATE: 0.3,
  
  // LSTM Architecture
  LSTM_UNITS_LAYER_1: 64,
  LSTM_UNITS_LAYER_2: 32,
  LSTM_DENSE_UNITS: 16,
  
  // Transformer Architecture
  TRANSFORMER_DENSE_UNITS_1: 128,
  TRANSFORMER_DENSE_UNITS_2: 64,
  TRANSFORMER_DENSE_UNITS_3: 32,
  TRANSFORMER_FLATTEN_UNITS: 256,
  
  // GRU Architecture
  GRU_UNITS_LAYER_1: 64,
  GRU_UNITS_LAYER_2: 32,
  GRU_DENSE_UNITS: 16,
  
  // Early stopping
  DEFAULT_PATIENCE: 10,
  DEFAULT_MIN_DELTA: 0.0001,
  
  // Sequence configuration
  DEFAULT_SEQUENCE_LENGTH: 20,
  DEFAULT_INPUT_FEATURES: 50,
  DEFAULT_OUTPUT_SIZE: 1,
} as const;

/**
 * ML Model validation limits
 */
export const ML_VALIDATION_LIMITS = {
  // Sequence constraints
  MAX_SEQUENCE_LENGTH: 1000,
  MIN_SEQUENCE_LENGTH: 1,
  
  // Feature constraints
  MAX_INPUT_FEATURES: 500,
  MIN_INPUT_FEATURES: 1,
  
  // Training constraints
  MAX_EPOCHS: 1000,
  MIN_EPOCHS: 1,
  MAX_BATCH_SIZE: 1024,
  MIN_BATCH_SIZE: 1,
  
  // Architecture constraints
  MAX_LSTM_UNITS: 1024,
  MIN_LSTM_UNITS: 1,
  MAX_OUTPUT_SIZE: 100,
  MIN_OUTPUT_SIZE: 1,
  
  // Dropout constraints
  MAX_DROPOUT_RATE: 0.9,
  MIN_DROPOUT_RATE: 0.0,
  
  // Data constraints
  MAX_TRAINING_DATA_SIZE: 1000000,
  MIN_TRAINING_DATA_SIZE: 10,
} as const;

/**
 * Data quality thresholds for ML
 */
export const ML_DATA_QUALITY = {
  // Data points thresholds
  EXCELLENT_MIN_DATA_POINTS: 252, // 1 year of trading days
  GOOD_MIN_DATA_POINTS: 100,
  FAIR_MIN_DATA_POINTS: 50,
  
  // Missing data thresholds
  EXCELLENT_MAX_MISSING_RATIO: 0,
  GOOD_MAX_MISSING_RATIO: 0.05,
  FAIR_MAX_MISSING_RATIO: 0.2,
  
  // Default RSI value when insufficient data
  DEFAULT_RSI_VALUE: 50,
} as const;

/**
 * Model training configuration presets
 */
export const ML_TRAINING_PRESETS = {
  LSTM: {
    inputFeatures: ML_HYPERPARAMETERS.DEFAULT_INPUT_FEATURES,
    sequenceLength: ML_HYPERPARAMETERS.DEFAULT_SEQUENCE_LENGTH,
    outputSize: ML_HYPERPARAMETERS.DEFAULT_OUTPUT_SIZE,
    learningRate: ML_HYPERPARAMETERS.DEFAULT_LEARNING_RATE,
    batchSize: ML_HYPERPARAMETERS.DEFAULT_BATCH_SIZE,
    epochs: ML_HYPERPARAMETERS.DEFAULT_EPOCHS,
    validationSplit: ML_HYPERPARAMETERS.DEFAULT_VALIDATION_SPLIT,
    dropoutRate: ML_HYPERPARAMETERS.DEFAULT_DROPOUT_RATE,
    patience: ML_HYPERPARAMETERS.DEFAULT_PATIENCE,
    minDelta: ML_HYPERPARAMETERS.DEFAULT_MIN_DELTA,
  },
  TRANSFORMER: {
    inputFeatures: ML_HYPERPARAMETERS.DEFAULT_INPUT_FEATURES,
    sequenceLength: ML_HYPERPARAMETERS.DEFAULT_SEQUENCE_LENGTH,
    outputSize: ML_HYPERPARAMETERS.DEFAULT_OUTPUT_SIZE,
    learningRate: 0.001,
    batchSize: ML_HYPERPARAMETERS.DEFAULT_BATCH_SIZE,
    epochs: ML_HYPERPARAMETERS.DEFAULT_EPOCHS,
    validationSplit: ML_HYPERPARAMETERS.DEFAULT_VALIDATION_SPLIT,
    dropoutRate: ML_HYPERPARAMETERS.DEFAULT_DROPOUT_RATE,
    patience: ML_HYPERPARAMETERS.DEFAULT_PATIENCE,
    minDelta: ML_HYPERPARAMETERS.DEFAULT_MIN_DELTA,
  },
  GRU: {
    inputFeatures: ML_HYPERPARAMETERS.DEFAULT_INPUT_FEATURES,
    sequenceLength: ML_HYPERPARAMETERS.DEFAULT_SEQUENCE_LENGTH,
    outputSize: ML_HYPERPARAMETERS.DEFAULT_OUTPUT_SIZE,
    learningRate: 0.0005,
    batchSize: ML_HYPERPARAMETERS.DEFAULT_BATCH_SIZE,
    epochs: ML_HYPERPARAMETERS.DEFAULT_EPOCHS,
    validationSplit: ML_HYPERPARAMETERS.DEFAULT_VALIDATION_SPLIT,
    dropoutRate: ML_HYPERPARAMETERS.DEFAULT_DROPOUT_RATE,
    patience: ML_HYPERPARAMETERS.DEFAULT_PATIENCE,
    minDelta: ML_HYPERPARAMETERS.DEFAULT_MIN_DELTA,
  },
} as const;

/**
 * Meta-model training configuration
 */
export const META_MODEL_CONFIG = {
  EPOCHS: 50,
  BATCH_SIZE: 32,
  VALIDATION_SPLIT: 0.2,
} as const;
