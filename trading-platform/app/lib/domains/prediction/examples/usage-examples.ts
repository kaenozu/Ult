import { PredictionServiceFactory } from '../index';
import type { PredictionFeatures } from '../../../services/feature-calculation-service';

async function runExamples() {
  const predictionService = PredictionServiceFactory.createDefault();

  const features: PredictionFeatures = {
    rsi: 50,
    rsiChange: 0,
    sma5: 0,
    sma20: 0,
    sma50: 0,
    priceMomentum: 0,
    volumeRatio: 1,
    volatility: 0.02,
    macdSignal: 0,
    bollingerPosition: 0.5,
    atrPercent: 0.01,
  };

  console.log('--- Prediction Example ---');
  try {
    const prediction = predictionService.predict(features);
    console.log('Prediction:', prediction);
  } catch (error) {
    console.error('Prediction failed:', error);
  }
}

// Execute the examples
runExamples().then(() => console.log('Examples completed'));
