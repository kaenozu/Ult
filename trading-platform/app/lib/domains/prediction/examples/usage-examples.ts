
import { PredictionDomain } from '../index';

async function runExamples() {
  const predictionDomain = new PredictionDomain();

  console.log('--- Price Prediction Example ---');
  try {
    const pricePrediction = await predictionDomain.predictPrice('AAPL', '1d');
    console.log('Price Prediction:', pricePrediction);
  } catch (error) {
    console.error('Price prediction failed:', error);
  }

  console.log('\n--- Trend Analysis Example ---');
  try {
    const trendAnalysis = await predictionDomain.analyzeTrend('GOOGL', ['RSI', 'MACD']);
    console.log('Trend Analysis:', trendAnalysis);
  } catch (error) {
    console.error('Trend analysis failed:', error);
  }

  console.log('\n--- Market Sentiment Example ---');
  try {
    const sentiment = await predictionDomain.getMarketSentiment('tech');
    console.log('Market Sentiment:', sentiment);
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
  }
}

// Execute the examples
runExamples().then(() => console.log('Examples completed'));
