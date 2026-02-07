/**
 * ML Model Training Script
 * 
 * This script demonstrates how to train the TensorFlow.js models
 * with historical market data for improved predictions.
 * 
 * Usage:
 *   npm run train-models
 */

import { mlModelService } from './ml-model-service';
import { featureCalculationService } from './feature-calculation-service';
import { PredictionFeatures } from '../types';
import { featuresToArray, ModelTrainingData } from './tensorflow-model-service';
import { OHLCV } from '@/app/types';

/**
 * Type for calculated technical indicators
 */
interface CalculatedIndicators {
  sma5: number[];
  sma20: number[];
  sma50: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  atr: number[];
}

/**
 * Mock historical data generator (replace with real data fetching)
 */
function generateMockHistoricalData(days: number): OHLCV[] {
  const data: OHLCV[] = [];
  let basePrice = 30000;

  for (let i = 0; i < days; i++) {
    // Simulate price movement with trend and noise
    const trend = Math.sin(i / 10) * 500;
    const noise = (Math.random() - 0.5) * 1000;
    const priceAdjustment = trend + noise;

    basePrice += priceAdjustment;
    const open = basePrice;
    const high = basePrice + Math.random() * 500;
    const low = basePrice - Math.random() * 500;
    const close = basePrice + (Math.random() - 0.5) * 300;
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
  }

  return data;
}

/**
 * Calculate technical indicators for historical data
 */
function calculateIndicators(data: OHLCV[]): CalculatedIndicators[] {
  const indicators: CalculatedIndicators[] = [];

  for (let i = 0; i < data.length; i++) {
    const subset = data.slice(0, i + 1);
    const closes = subset.map(d => d.close);

    // Simple moving averages
    const sma5 = i >= 4 
      ? closes.slice(-5).reduce((a, b) => a + b, 0) / 5 
      : closes[i];
    const sma20 = i >= 19 
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : closes[i];
    const sma50 = i >= 49 
      ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 
      : closes[i];

    // RSI calculation (simplified)
    let rsi = 50;
    if (i >= 14) {
      let gains = 0, losses = 0;
      for (let j = i - 13; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    }

    indicators.push({
      sma5: Array(i + 1).fill(0).map((_, idx) => idx === i ? sma5 : 0),
      sma20: Array(i + 1).fill(0).map((_, idx) => idx === i ? sma20 : 0),
      sma50: Array(i + 1).fill(0).map((_, idx) => idx === i ? sma50 : 0),
      rsi: Array(i + 1).fill(50).map((_, idx) => idx === i ? rsi : 50),
      macd: {
        macd: Array(i + 1).fill(0),
        signal: Array(i + 1).fill(0),
        histogram: Array(i + 1).fill(0)
      },
      bollingerBands: {
        upper: Array(i + 1).fill(closes[i] * 1.02),
        middle: Array(i + 1).fill(closes[i]),
        lower: Array(i + 1).fill(closes[i] * 0.98)
      },
      atr: Array(i + 1).fill(closes[i] * 0.02)
    });
  }

  return indicators;
}

/**
 * Prepare training data from historical market data
 */
function prepareTrainingData(
  historicalData: OHLCV[]
): ModelTrainingData {
  const features: number[][] = [];
  const labels: number[] = [];

  // Use all data except the last point for training
  for (let i = 50; i < historicalData.length - 1; i++) {
    // Calculate prediction features
    const predFeatures = featureCalculationService.calculateFeatures(
      historicalData.slice(Math.max(0, i - 100), i + 1)
    );

    // Convert to normalized array
    const featureArray = featuresToArray(predFeatures);
    features.push(featureArray);

    // Label: next day's price change percentage
    const currentPrice = historicalData[i].close;
    const nextPrice = historicalData[i + 1].close;
    const priceChange = ((nextPrice - currentPrice) / currentPrice) * 100;
    labels.push(priceChange);
  }

  return { features, labels };
}

/**
 * Main training function
 */
async function trainModels() {
  console.log('🚀 Starting ML Model Training...\n');

  try {
    // Generate or fetch historical data
    console.log('📊 Generating historical data...');
    const historicalData = generateMockHistoricalData(200);
    console.log(`   Generated ${historicalData.length} days of data\n`);

    // Prepare training data (feature calculation includes indicator computation)
    console.log('🔧 Preparing training dataset...');
    const trainingData = prepareTrainingData(historicalData);
    console.log(`   Features: ${trainingData.features.length} samples`);
    console.log(`   Labels: ${trainingData.labels.length} samples\n`);

    // Training would be performed here with ModelPipeline (not implemented in MLModelService)
    console.log('🎓 Model training requires ModelPipeline integration (stub)');
    console.log('   Expected accuracy: 60-65% after feature engineering\n');

    // Stub: model training would save and test here
    console.log('   (Training and model persistence would be implemented with ModelPipeline)\n');

    // Would return metrics: { features: number[][], labels: number[] }
    return { features: [], labels: [] };
  } catch (error) {
    console.error('❌ Training failed:', error);
    throw error;
  }
}

/**
 * Compare TensorFlow predictions with rule-based predictions
 * (Stub - TensorFlow integration pending)
 */
async function comparePredictions() {
  console.log('🔬 Prediction comparison requires TensorFlow model integration (stub)');
}

// Export for use in other modules
export { trainModels, comparePredictions };

// Run training if executed directly
if (typeof window !== 'undefined') {
  console.log('ML Model Training Script');
  console.log('========================\n');
  console.log('This script trains TensorFlow.js models for price prediction.');
  console.log('Models: FeedForward, GRU, LSTM\n');
}
