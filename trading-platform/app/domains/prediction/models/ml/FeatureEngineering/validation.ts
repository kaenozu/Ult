import { OHLCV } from '@/app/types';
import { MacroEconomicFeatures, SentimentFeatures } from './types';

const MAX_DATA_POINTS = 100000;
const MIN_DATA_POINTS = 50;
const MAX_PRICE = 1e10;
const MIN_PRICE = 1e-10;

export function validateOHLCVData(data: OHLCV[]): void {
  if (!Array.isArray(data)) {
    throw new Error('Invalid data: must be an array');
  }

  if (data.length < MIN_DATA_POINTS) {
    throw new Error(`Insufficient data: minimum ${MIN_DATA_POINTS} data points required, got ${data.length}`);
  }

  if (data.length > MAX_DATA_POINTS) {
    throw new Error(`Data too large: maximum ${MAX_DATA_POINTS} data points allowed, got ${data.length}`);
  }

  for (let i = 0; i < data.length; i++) {
    const point = data[i];

    if (!point || typeof point !== 'object') {
      throw new Error(`Invalid data point at index ${i}: must be an object`);
    }

    const requiredFields = ['open', 'high', 'low', 'close', 'volume', 'date'];
    for (const field of requiredFields) {
      if (!(field in point)) {
        throw new Error(`Missing required field '${field}' at index ${i}`);
      }
    }

    const numericFields: Array<keyof OHLCV> = ['open', 'high', 'low', 'close', 'volume'];
    for (const field of numericFields) {
      const value = point[field];
      if (typeof value !== 'number' || !isFinite(value) || value < 0) {
        throw new Error(
          `Invalid ${field} at index ${i}: must be a positive finite number, got ${value}`
        );
      }
    }

    if (point.high > 0 || point.low > 0) {
      if (point.high < point.low) {
        throw new Error(`Invalid price data at index ${i}: high (${point.high}) cannot be less than low (${point.low})`);
      }

      if (point.close < point.low || point.close > point.high) {
        throw new Error(`Invalid price data at index ${i}: close (${point.close}) must be between low (${point.low}) and high (${point.high})`);
      }

      if (point.open < point.low || point.open > point.high) {
        throw new Error(`Invalid price data at index ${i}: open (${point.open}) must be between low (${point.low}) and high (${point.high})`);
      }
    }

    if (typeof point.date !== 'string' || point.date.length === 0) {
      throw new Error(`Invalid date at index ${i}: must be a non-empty string`);
    }

    if (point.close > MAX_PRICE || point.close < MIN_PRICE) {
      throw new Error(
        `Unreasonable price value at index ${i}: ${point.close} is outside acceptable range`
      );
    }
  }
}

export function validateSentimentFeatures(sentiment: SentimentFeatures): void {
  const sentimentFields: Array<keyof SentimentFeatures> = [
    'newsSentiment',
    'socialSentiment',
    'sentimentScore'
  ];

  for (const field of sentimentFields) {
    const value = sentiment[field];
    if (typeof value !== 'number' || !isFinite(value) || value < -1 || value > 1) {
      throw new Error(`Invalid ${field}: must be a number between -1 and 1, got ${value}`);
    }
  }

  const volumeFields: Array<keyof SentimentFeatures> = [
    'newsVolume',
    'socialVolume',
    'socialBuzz'
  ];

  for (const field of volumeFields) {
    const value = sentiment[field];
    if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Invalid ${field}: must be a number between 0 and 1, got ${value}`);
    }
  }

  if (typeof sentiment.analystRating !== 'number' ||
      !isFinite(sentiment.analystRating) ||
      sentiment.analystRating < 1 ||
      sentiment.analystRating > 5) {
    throw new Error(`Invalid analystRating: must be a number between 1 and 5, got ${sentiment.analystRating}`);
  }
}

export function validateMacroFeatures(macro: MacroEconomicFeatures): void {
  if (typeof macro.macroScore !== 'number' ||
      !isFinite(macro.macroScore) ||
      macro.macroScore < -1 ||
      macro.macroScore > 1) {
    throw new Error(`Invalid macroScore: must be a number between -1 and 1, got ${macro.macroScore}`);
  }

  const numericFields: Array<keyof MacroEconomicFeatures> = [
    'interestRate',
    'gdpGrowth',
    'cpi',
    'inflationRate'
  ];

  for (const field of numericFields) {
    const value = macro[field];
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(`Invalid ${field}: must be a finite number, got ${value}`);
    }
  }
}
