/**
 * ML Model Training Script
 * 
 * This script demonstrates how to train the TensorFlow.js models
 * with historical market data for improved predictions.
 * 
 * Usage:
 *   npm run train-models
 */

import { mlModelService } from '@/app/lib/services/ml-model-service';
import { featureCalculationService } from '@/app/lib/services/feature-calculation-service';
import { featuresToArray, ModelTrainingData } from '@/app/lib/services/tensorflow-model-service';
import { OHLCV } from '@/app/lib/types';

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
    const dailyChange = trend + noise;

    basePrice += dailyChange;
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
function calculateIndicators(data: OHLCV[]): any[] {
  const indicators: any[] = [];

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
  historicalData: OHLCV[],
  indicators: any[]
): ModelTrainingData {
  const features: number[][] = [];
  const labels: number[] = [];

  // Use all data except the last point for training
  for (let i = 50; i < historicalData.length - 1; i++) {
    // Calculate prediction features
    const predFeatures = featureCalculationService.calculateFeatures(
      historicalData.slice(Math.max(0, i - 100), i + 1),
      indicators[i]
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

    // Calculate indicators
    console.log('📈 Calculating technical indicators...');
    const indicators = calculateIndicators(historicalData);
    console.log(`   Calculated indicators for ${indicators.length} data points\n`);

    // Prepare training data
    console.log('🔧 Preparing training dataset...');
    const trainingData = prepareTrainingData(historicalData, indicators);
    console.log(`   Features: ${trainingData.features.length} samples`);
    console.log(`   Labels: ${trainingData.labels.length} samples\n`);

    // Train models
    console.log('🎓 Training models (this may take a minute)...');
    const startTime = Date.now();
    const metrics = await mlModelService.trainModels(trainingData, 30);
    const trainingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Training completed in ${trainingTime}s\n`);

    // Display results
    console.log('📊 Training Results:');
    console.log('─────────────────────────────────────');
    console.log('FeedForward Model:');
    console.log(`  MAE:      ${metrics.ff.mae.toFixed(4)}`);
    console.log(`  RMSE:     ${metrics.ff.rmse.toFixed(4)}`);
    console.log(`  Accuracy: ${metrics.ff.accuracy.toFixed(2)}%`);
    console.log();
    console.log('GRU Model:');
    console.log(`  MAE:      ${metrics.gru.mae.toFixed(4)}`);
    console.log(`  RMSE:     ${metrics.gru.rmse.toFixed(4)}`);
    console.log(`  Accuracy: ${metrics.gru.accuracy.toFixed(2)}%`);
    console.log();
    console.log('LSTM Model:');
    console.log(`  MAE:      ${metrics.lstm.mae.toFixed(4)}`);
    console.log(`  RMSE:     ${metrics.lstm.rmse.toFixed(4)}`);
    console.log(`  Accuracy: ${metrics.lstm.accuracy.toFixed(2)}%`);
    console.log('─────────────────────────────────────');

    const avgAccuracy = (metrics.ff.accuracy + metrics.gru.accuracy + metrics.lstm.accuracy) / 3;
    console.log(`\nAverage Accuracy: ${avgAccuracy.toFixed(2)}%`);

    // Save models
    console.log('\n💾 Saving trained models...');
    await mlModelService.saveModels();
    console.log('   Models saved to browser storage\n');

    console.log('✨ Training complete! TensorFlow.js models are now active.\n');

    // Test prediction
    console.log('🧪 Testing prediction with latest features...');
    const latestFeatures = featureCalculationService.calculateFeatures(
      historicalData.slice(-100),
      indicators[indicators.length - 1]
    );

    const prediction = await mlModelService.predictAsync(latestFeatures);
    console.log('   Prediction result:');
    console.log(`   - FeedForward: ${prediction.rfPrediction.toFixed(4)}`);
    console.log(`   - GRU:         ${prediction.xgbPrediction.toFixed(4)}`);
    console.log(`   - LSTM:        ${prediction.lstmPrediction.toFixed(4)}`);
    console.log(`   - Ensemble:    ${prediction.ensemblePrediction.toFixed(4)}`);
    console.log(`   - Confidence:  ${prediction.confidence.toFixed(2)}%\n`);

    return metrics;
  } catch (error) {
    console.error('❌ Training failed:', error);
    throw error;
  }
}

/**
 * Compare TensorFlow predictions with rule-based predictions
 */
async function comparePredictions() {
  console.log('\n🔬 Comparing TensorFlow vs Rule-based predictions...\n');

  const testFeatures = featureCalculationService.calculateFeatures(
    generateMockHistoricalData(100),
    calculateIndicators(generateMockHistoricalData(100))[99]
  );

  // Rule-based prediction
  const ruleBasedPred = mlModelService.predict(testFeatures);

  // TensorFlow prediction
  const tfPred = await mlModelService.predictAsync(testFeatures);

  console.log('Rule-based Prediction:');
  console.log(`  Ensemble: ${ruleBasedPred.ensemblePrediction.toFixed(4)}`);
  console.log(`  Confidence: ${ruleBasedPred.confidence.toFixed(2)}%`);

  console.log('\nTensorFlow Prediction:');
  console.log(`  Ensemble: ${tfPred.ensemblePrediction.toFixed(4)}`);
  console.log(`  Confidence: ${tfPred.confidence.toFixed(2)}%`);

  console.log('\nDifference:');
  console.log(`  Prediction: ${Math.abs(tfPred.ensemblePrediction - ruleBasedPred.ensemblePrediction).toFixed(4)}`);
  console.log(`  Confidence: ${Math.abs(tfPred.confidence - ruleBasedPred.confidence).toFixed(2)}%\n`);
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
