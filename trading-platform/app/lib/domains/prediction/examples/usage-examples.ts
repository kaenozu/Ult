import { PredictionServiceFactory } from '../index';
import type { PredictionFeatures } from '../../../services/feature-calculation-service';
import { logger } from '@/app/core/logger';

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

  logger.info('--- Prediction Example ---');
  try {
    const prediction = predictionService.predict(features);
    logger.info('Prediction:', prediction);
  } catch (error) {
    logger.error('Prediction failed:', error instanceof Error ? error : new Error(String(error)));
  }
}

// Execute the examples
runExamples().then(() => logger.info('Examples completed'));
